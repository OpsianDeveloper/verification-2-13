require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function search() {
    const ids = ["970384722", "100771242027"];
    console.log(`--- Searching for IDs: ${ids.join(", ")} ---\n`);

    for (const id of ids) {
        // Search by raw ID and normalized ID in multiple columns
        const { data, error } = await supabase
            .from('booking_email_index')
            .select('*')
            .or(`confirmation_number_raw.eq.${id},confirmation_number_norm.eq.${id},source_reservation_id_raw.eq.${id},source_reservation_id_norm.eq.${id}`);

        if (error) {
            console.error(`Error searching for ${id}:`, error);
            continue;
        }

        if (data && data.length > 0) {
            console.log(`✅ Found ${data.length} match(es) for ${id}:`);
            data.forEach(row => {
                console.log(JSON.stringify(row, null, 2));
            });
        } else {
            console.log(`❌ No match found for ${id}`);
        }
    }

    // Also search for ANY recent bookings to see the format
    console.log("\n--- Recent 5 Bookings ---");
    const { data: recent, error: recentErr } = await supabase
        .from('booking_email_index')
        .select('id, guest_name_raw, guest_name_norm, confirmation_number_raw, confirmation_number_norm, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (recentErr) {
        console.error("Error fetching recent bookings:", recentErr);
    } else {
        recent.forEach(r => {
            console.log(`[${r.created_at}] ID: ${r.id}, Name: "${r.guest_name_raw}", Ref: "${r.confirmation_number_raw}"`);
        });
    }
}

search();
