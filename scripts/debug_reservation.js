require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function debug() {
    console.log("--- Searching 'raw_text' for 'Abhinav' ---");

    // Search raw_text for the name
    const { data: search, error } = await supabase
        .from('booking_email_index')
        .select('id, guest_name_raw')
        .ilike('raw_text', '%abhinav%');

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (search && search.length > 0) {
        console.log(`Found ${search.length} matches in raw_text:`);
        search.forEach(s => {
            console.log(`\nID: ${s.id}`);
            console.log(`Extracted Name: "${s.guest_name_raw}"`);

        });
    } else {
        console.log("No match found in raw_text either.");
    }
}

debug();
