require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const API_KEY = process.env.CLOUDBEDS_API_KEY;

function normalizeGuestName(name) {
    return String(name || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, "");
}

function normalizeReservationNumber(v) {
    return String(v || "").toUpperCase().trim().replace(/[\s-]/g, "");
}

async function fetchAndSync() {
    console.log("--- Fetching Active Reservations from Cloudbeds ---");

    if (!API_KEY) {
        console.error("Missing API Key");
        return;
    }

    // Date range: Today to +30 days
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const toDate = nextMonth.toISOString().split('T')[0];

    const url = `https://api.cloudbeds.com/api/v1.1/getReservations?checkInFrom=${today}&checkInTo=${toDate}&status=confirmed`;

    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const json = await res.json();

        if (!json.success) {
            console.error("Cloudbeds API Error:", json.message);
            return;
        }

        const reservations = json.data;
        console.log(`Found ${reservations.length} confirmed reservations.`);

        if (reservations.length === 0) {
            console.log("No active reservations found in the next 30 days.");
            return;
        }

        // Take the first one
        const r = reservations[0];

        const guestName = `${r.firstName || r.guestName || "Unknown"} ${r.lastName || ""}`.trim();
        const ref = r.reservationID; // or res_id
        const sourceResId = r.thirdPartyIdentifier || r.reservationID;

        console.log(`\nSelected Reservation:`);
        console.log(`Guest: ${guestName}`);
        console.log(`Ref: ${ref}`);
        console.log(`Check-in: ${r.startDate}`);
        console.log(`Status: ${r.status}`);

        // Sync to DB
        console.log("\nSyncing to local database...");

        const { data, error } = await supabase
            .from('booking_email_index')
            .upsert({
                guest_name_raw: guestName,
                guest_name_norm: normalizeGuestName(guestName),
                confirmation_number_raw: ref,
                confirmation_number_norm: normalizeReservationNumber(ref),
                source: "cloudbeds_manual_sync",
                source_reservation_id_raw: String(sourceResId),
                source_reservation_id_norm: normalizeReservationNumber(sourceResId),
                adults: Number(r.adults || 2), // Default if missing
                children: Number(r.children || 0),
                raw_text: JSON.stringify(r)
            }, { onConflict: 'confirmation_number_norm' }) // Assuming unique constraint, or loose upsert
            .select()
            .single();

        if (error) {
            // If upsert fails (maybe no unique constraint), try insert
            console.log("Upsert failed (likely no unique key), trying insert...", error.message);
            await supabase.from('booking_email_index').insert({
                guest_name_raw: guestName,
                guest_name_norm: normalizeGuestName(guestName),
                confirmation_number_raw: ref,
                confirmation_number_norm: normalizeReservationNumber(ref),
                source: "cloudbeds_manual_sync",
                source_reservation_id_raw: String(sourceResId),
                source_reservation_id_norm: normalizeReservationNumber(sourceResId),
                adults: Number(r.adults || 2),
                children: Number(r.children || 0),
                raw_text: JSON.stringify(r)
            });
        }

        console.log("✅ Synced successfully!");
        console.log(`You can now verify with: "${guestName}" / "${ref}"`);

    } catch (err) {
        console.error("Script Error:", err);
    }
}

fetchAndSync();
