require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function insertTestBooking() {
    console.log("--- Inserting Test Booking for Abhinav ---");

    const guestName = "Abhinav Karnwal";
    const refNumber = "TEST12345";

    const { data, error } = await supabase
        .from('booking_email_index')
        .insert({
            guest_name_raw: guestName,
            guest_name_norm: guestName.toLowerCase(),
            confirmation_number_raw: refNumber,
            confirmation_number_norm: refNumber,
            source: "manual_test",
            source_reservation_id_raw: "MANUAL_001",
            source_reservation_id_norm: "MANUAL001",
            adults: 2,
            children: 0,
            raw_text: "Manual test insertion for debugging"
        })
        .select()
        .single();

    if (error) {
        console.error("Error inserting test booking:", error);
        return;
    }

    console.log("✅ Successfully inserted test booking!");
    console.log(`ID: ${data.id}`);
    console.log(`Guest: ${data.guest_name_raw}`);
    console.log(`Ref: ${data.confirmation_number_raw}`);
}

insertTestBooking();
