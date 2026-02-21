const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Testing connection to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    try {
        console.log('\n--- Simulating Robust getAccessCode logic (Intl) ---');
        const now = new Date();

        // Use Intl to get robust Bangkok time parts
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Bangkok',
            hour12: false,
            weekday: 'short', // "Mon", "Tue", etc.
            hour: 'numeric',
            minute: 'numeric'
        });

        const parts = formatter.formatToParts(now);
        const part = (type) => parts.find(p => p.type === type)?.value;

        const weekdayStr = part('weekday'); // "Mon", "Tue"...
        const hourStr = part('hour');       // "16"
        const minuteStr = part('minute');   // "15"

        // Map weekday short string to 0-6 (Sun-Sat)
        const dowMap = {
            "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6
        };

        const dow = dowMap[weekdayStr];
        console.log(`Raw parts: weekday=${weekdayStr}, hour=${hourStr}, minute=${minuteStr}`);

        if (dow === undefined) {
            console.error(`FAILED to map weekday: ${weekdayStr}`);
            return;
        }

        const currentHour = parseInt(hourStr, 10);
        const currentMin = parseInt(minuteStr, 10);
        const totalMins = currentHour * 60 + currentMin;

        console.log(`Current Time (UTC): ${now.toISOString()}`);
        console.log(`Calculated Bangkok: ${currentHour}:${currentMin} (dow=${dow}, mins=${totalMins})`);

        const { data, error } = await supabase
            .from("door_code_schedule")
            .select("access_code")
            .eq("dow", dow)
            .lte("start_min", totalMins)
            .gte("end_min", totalMins)
            .eq("is_active", true)
            .limit(1);

        if (error) {
            console.error("Query Error:", error);
        } else if (data && data.length > 0) {
            console.log("SUCCESS: Found access code:", data[0].access_code);
        } else {
            console.log("FAILURE: No access code found for current time.");
        }

    } catch (err) {
        console.error('Runtime Error:', err.message);
        console.error(err);
    }
}

test();
