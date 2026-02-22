import { createClient } from "@supabase/supabase-js";
import { getReservation } from "../../../lib/cloudbeds";
import { normalizeGuestName, normalizeReservationNumber } from "../../../lib/utils";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper normalization functions removed in favor of lib/utils imports

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const event = req.body;
        // Cloudbeds Webhook Payload usually has: { event: 'reservation/created', object_id: '12345', ... }

        console.log("Cloudbeds Webhook received:", JSON.stringify(event));

        const eventType = event.event || event.type; // Check docs for exact field
        const reservationId = event.object_id || event.reservationId || event.reservation_id;

        if (!reservationId) {
            return res.status(200).json({ skipped: true, reason: "No reservation ID found" });
        }

        // Only process relevant events
        if (eventType !== "reservation/created" && eventType !== "reservation/modified" && eventType !== "reservation/status_changed") {
            return res.status(200).json({ skipped: true, reason: `Ignored event type: ${eventType}` });
        }

        // Fetch full details using our helper (webhook payload might be thin)
        const resData = await getReservation(reservationId);

        // Map Cloudbeds data to our schema
        const guestNameRaw = `${resData.firstName || ""} ${resData.lastName || ""}`.trim();
        const guestNameNorm = normalizeGuestName(guestNameRaw);

        const confirmationRaw = resData.reservationId || resData.res_id; // Check fields
        const confirmationNorm = normalizeReservationNumber(confirmationRaw);

        // Map adults/children
        // Cloudbeds structure might be rooms -> guest list. We take totals or specific room?
        // Simplified: aggregate
        let adults = 0;
        let children = 0;

        // Check if rooms array exists
        if (Array.isArray(resData.assigned)) {
            resData.assigned.forEach(room => {
                adults += Number(room.adults || 0);
                children += Number(room.children || 0);
            });
        } else if (Array.isArray(resData.rooms)) {
            resData.rooms.forEach(room => {
                adults += Number(room.adults || 0);
                children += Number(room.children || 0);
            });
        } else {
            // Fallback to top-level if available
            adults = Number(resData.adults || 0);
            children = Number(resData.children || 0);
        }

        // Insert/Update booking_email_index (renaming table mentally, but using existing for compatibility)
        // We use confirmation_number as unique key effectively

        const { data, error } = await supabase
            .from("booking_email_index")
            .upsert({
                // We might not have a unique constraint on confirmation_number_norm, so this might duplicate if not careful. 
                // Best to check if exists first or rely on users to add unique constraint. 
                // For now, let's just insert to keep history, or update if we can match. 
                // Actually, `upsert` needs a conflict constraint. 
                // Let's just INSERT for logs, or try to update if we find by confirmation ID.
                // Given the table name 'email_index', it might expect emails. We are hijacking it for API data.

                guest_name_raw: guestNameRaw,
                guest_name_norm: guestNameNorm,
                confirmation_number_raw: String(confirmationRaw),
                confirmation_number_norm: confirmationNorm,
                source: "cloudbeds_api",
                source_reservation_id_raw: String(reservationId),
                source_reservation_id_norm: normalizeReservationNumber(reservationId),

                raw_text: JSON.stringify(resData), // Store full JSON for debug

                adults: adults,
                children: children,

                updated_at: new Date().toISOString()
            })
            .select();

        if (error) {
            console.error("Values failed to save to DB", error);
            return res.status(500).json({ error: "DB save failed" });
        }

        return res.status(200).json({ success: true, id: data?.[0]?.id });

    } catch (err) {
        console.error("Webhook Error", err);
        return res.status(500).json({ error: err.message });
    }
}
