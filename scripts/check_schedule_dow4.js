require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkScheduleCoverage() {
    console.log("--- Checking Thursday (dow=4) Coverage ---");

    // Current Bangkok time approximation
    const now = new Date(); // USER local time is 4:12 AM EST -> 4:12 PM Bangkok (16:12)
    // Let's just list ALL entries for dow=4 to see gaps

    const { data, error } = await supabase
        .from('door_code_schedule')
        .select('start_min, end_min, access_code')
        .eq('dow', 4)
        .order('start_min', { ascending: true });

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} slots for Thursday (dow=4):`);
    if (data.length === 0) {
        console.log("⚠️  NO SCHEDULE FOR THURSDAY!");
    } else {
        data.forEach(s => {
            console.log(`${s.start_min} - ${s.end_min}: ${s.access_code}`);
        });
    }
}

checkScheduleCoverage();
