import { supabase } from "../supabase";
import { normalizeGuestName, normalizeReservationNumber, clampInt, toIntOrNull } from "../utils";
import { getReservation } from "../cloudbeds";

export async function handleUpdateGuest(req, res) {
    const { session_token, guest_name, booking_ref, room_number, expected_guest_count, flow_type, visitor_first_name, visitor_last_name, visitor_phone, visitor_reason } =
        req.body || {};
    if (!session_token) return res.status(400).json({ error: "Session token required" });

    const bookingValue = booking_ref || room_number || null;

    if (!guest_name || !bookingValue) {
        return res.status(400).json({ error: "Guest name and reservation number are required" });
    }

    // ✅ VISITOR FLOW: Skip booking lookup
    const isVisitor = bookingValue === "VISITOR" || flow_type === "visitor";

    if (isVisitor) {
        console.log("[update_guest] Visitor flow detected, skipping booking lookup");

        const updatePayload = {
            guest_name: guest_name || null,
            room_number: "VISITOR",
            status: "visitor_info_saved",
            current_step: "document",
            expected_guest_count: 1,
            verified_guest_count: 0,
            requires_additional_guest: false,
            visitor_first_name: visitor_first_name || null,
            visitor_last_name: visitor_last_name || null,
            visitor_phone: visitor_phone || null,
            visitor_reason: visitor_reason || null,
            extracted_info: {
                type: "visitor",
            },
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
            .from("demo_sessions")
            .update(updatePayload)
            .eq("session_token", session_token);

        if (updateError) {
            console.error("Error saving visitor info:", updateError);
            return res.status(500).json({ error: "Failed to save visitor info" });
        }

        return res.json({
            success: true,
            flow_type: "visitor",
        });
    }

    // ✅ GUEST FLOW: Continue with booking lookup
    const guestNameNorm = normalizeGuestName(guest_name);
    const resNorm = normalizeReservationNumber(bookingValue);

    // Prepare matching conditions
    let orConditions = [
        `confirmation_number_norm.eq.${resNorm}`,
        `source_reservation_id_norm.eq.${resNorm}`
    ];

    // Sub-reservation matching (e.g. RES-123 matching RES-123-1)
    // We check the ORIGINAL bookingValue before normalization stripped the hyphens
    if (String(bookingValue).includes("-")) {
        const parts = String(bookingValue).split("-");
        if (parts.length > 1) {
            const parentId = parts.slice(0, -1).join("-");
            if (parentId.length > 2) {
                const parentNorm = normalizeReservationNumber(parentId);
                orConditions.push(`confirmation_number_norm.eq.${parentNorm}`);
                orConditions.push(`source_reservation_id_norm.eq.${parentNorm}`);
            }
        }
    }

    console.log(`[update_guest] Lookup guest=${guestNameNorm}, refs=${orConditions.join(" OR ")}`);

    // Resilient name matching: First try exact match
    let { data: matches, error: matchErr } = await supabase
        .from("booking_email_index")
        .select("id, adults, children")
        .eq("guest_name_norm", guestNameNorm)
        .or(orConditions.join(","))
        .limit(1);

    // Fallback: If no exact match, try matching by last name part effectively
    // (This is a safety net for "John Doe" vs "John M Doe")
    if (!matchErr && (!matches || matches.length === 0)) {
        const nameParts = guestNameNorm.split(" ");
        if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];

            // Look for records where name starts with first name AND ends with last name
            const { data: fuzzyMatches, error: fuzzyErr } = await supabase
                .from("booking_email_index")
                .select("id, adults, children")
                .ilike("guest_name_norm", `${firstName}%${lastName}`)
                .or(orConditions.join(","))
                .limit(1);

            if (!fuzzyErr && fuzzyMatches && fuzzyMatches.length > 0) {
                console.log(`[update_guest] Fuzzy match found for ${guestNameNorm}`);
                matches = fuzzyMatches;
            }
        }
    }

    if (matchErr) {
        console.error("booking_email_index lookup error:", matchErr);
        return res.status(500).json({ error: "Failed to verify reservation" });
    }

    if (!matches || matches.length === 0) {
        // ✨ ON-DEMAND FALLBACK: Try Cloudbeds API directly if not in our index
        console.log(`[update_guest] No local match for ${resNorm}, trying Cloudbeds...`);
        try {
            const cbData = await getReservation(bookingValue);
            if (cbData) {
                console.log(`[update_guest] Cloudbeds match found! Syncing ${cbData.reservationId}`);

                const cbGuestName = `${cbData.firstName || ""} ${cbData.lastName || ""}`.trim();
                const cbGuestNameNorm = normalizeGuestName(cbGuestName);

                // Only accept if name matches (resiliently)
                const nameMatches = cbGuestNameNorm === guestNameNorm ||
                    (guestNameNorm.split(" ").length >= 2 &&
                        cbGuestNameNorm.includes(guestNameNorm.split(" ")[0]) &&
                        cbGuestNameNorm.includes(guestNameNorm.split(" ").pop()));

                if (nameMatches) {
                    const { data: synced, error: syncErr } = await supabase
                        .from("booking_email_index")
                        .upsert({
                            guest_name_raw: cbGuestName,
                            guest_name_norm: cbGuestNameNorm,
                            confirmation_number_raw: String(cbData.reservationId),
                            confirmation_number_norm: normalizeReservationNumber(cbData.reservationId),
                            source: "cloudbeds_on_demand",
                            source_reservation_id_raw: String(cbData.thirdPartyIdentifier || ""),
                            source_reservation_id_norm: normalizeReservationNumber(cbData.thirdPartyIdentifier || ""),
                            adults: Number(cbData.adults || 1),
                            children: Number(cbData.children || 0),
                            raw_text: JSON.stringify(cbData),
                            updated_at: new Date().toISOString()
                        })
                        .select("id, adults, children")
                        .single();

                    if (!syncErr && synced) {
                        matches = [synced];
                    }
                } else {
                    console.log(`[update_guest] Cloudbeds found but name mismatch: "${cbGuestNameNorm}" vs "${guestNameNorm}"`);
                }
            }
        } catch (cbErr) {
            console.error("[update_guest] Cloudbeds fallback failed:", cbErr.message);
        }
    }

    if (!matches || matches.length === 0) {
        return res.status(403).json({
            error:
                "Reservation not found. Please enter your name and reservation number exactly as shown in your confirmation email.",
        });
    }

    const bookingRow = matches[0];
    const adultsFromEmail = Number.isFinite(Number(bookingRow.adults)) ? Number(bookingRow.adults) : 1;
    const childrenFromEmail = Number.isFinite(Number(bookingRow.children)) ? Number(bookingRow.children) : 0;

    const expectedFromEmail = clampInt(adultsFromEmail, 1, 10);
    const expectedOverride = toIntOrNull(expected_guest_count);
    const expectedToSet = expectedOverride === null ? expectedFromEmail : clampInt(expectedOverride, 1, 10);

    const { data: s, error: sErr } = await supabase
        .from("demo_sessions")
        .select("verified_guest_count")
        .eq("session_token", session_token)
        .single();

    const verified = !sErr && s ? clampInt(s.verified_guest_count, 0, 10) : 0;

    const updatePayload = {
        guest_name,
        room_number: bookingValue,
        adults: clampInt(adultsFromEmail, 0, 10),
        children: clampInt(childrenFromEmail, 0, 10),
        status: "guest_info_saved",
        current_step: "document",
        expected_guest_count: expectedToSet,
        requires_additional_guest: verified < expectedToSet,
        updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
        .from("demo_sessions")
        .update(updatePayload)
        .eq("session_token", session_token);

    if (updateError) {
        console.error("Error saving guest info:", updateError);
        return res.status(500).json({ error: "Failed to save guest info" });
    }

    return res.json({
        success: true,
        adults: clampInt(adultsFromEmail, 0, 10),
        children: clampInt(childrenFromEmail, 0, 10),
        expected_guest_count: expectedToSet,
        verified_guest_count: verified,
        requires_additional_guest: verified < expectedToSet,
        remaining_guest_verifications: Math.max(expectedToSet - verified, 0),
    });
}

export async function handleTm30Update(req, res) {
    const { session_token, tm30_info } = req.body || {};
    if (!session_token) return res.status(400).json({ error: "Session token required" });

    const payload = tm30_info && typeof tm30_info === "object" ? tm30_info : {};
    const requiredKeys = [
        "nationality", "sex", "arrival_date_time", "departure_date", "property", "room_number",
    ];

    const missing = requiredKeys.filter((k) => {
        const v = payload[k];
        return v === undefined || v === null || String(v).trim() === "";
    });

    const tm30_status = missing.length === 0 ? "ready" : "draft";

    const { data, error } = await supabase
        .from("demo_sessions")
        .update({
            tm30_info: payload,
            tm30_status,
            updated_at: new Date().toISOString(),
        })
        .eq("session_token", session_token)
        .select("*")
        .single();

    if (error || !data) {
        console.error("tm30_update error:", error);
        return res.status(500).json({ error: error?.message || "Failed to update TM30 info" });
    }

    return res.status(200).json({
        success: true,
        tm30_status,
        missing_fields: missing,
        row: data,
    });
}
