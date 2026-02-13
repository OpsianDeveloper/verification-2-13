require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkScheduleFriday() {
    console.log("--- Checking Friday (dow=5) Coverage ---");

    const { data, error } = await supabase
        .from('door_code_schedule')
        .select('start_min, end_min, access_code')
        .eq('dow', 5)
        .order('start_min', { ascending: true });

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log(`Found ${data.length} slots for Friday (dow=5):`);
    if (data.length === 0) {
        console.log("⚠️  NO SCHEDULE FOR FRIDAY!");
    } else {
        data.forEach(s => {
            console.log(`${s.start_min} - ${s.end_min}: ${s.access_code}`);
        });
    }
}

checkScheduleFriday();
