require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCodes() {
    console.log("--- Checking door_code_schedule ---");
    const { data, error } = await supabase
        .from('door_code_schedule')
        .select('*')
        .limit(10);

    if (error) {
        console.error("Error fetching codes:", error);
        return;
    }

    console.log(`Found ${data.length} codes.`);
    if (data.length > 0) {
        console.log("Sample Code:", data[0]);

        // Check for available codes (not used)
        const { count, error: countError } = await supabase
            .from('door_code_schedule')
            .select('*', { count: 'exact', head: true })
            .is('assigned_to', null); // Assuming 'assigned_to' is the column for availability

        if (countError) console.error("Count Error:", countError);
        else console.log(`Available (unassigned) codes: ${count}`);
    }
}

checkCodes();
