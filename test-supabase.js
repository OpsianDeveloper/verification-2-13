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
        const { data, error } = await supabase.from('demo_sessions').select('*').limit(1);
        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Connection successful! Found', data.length, 'rows in demo_sessions.');
        }
    } catch (err) {
        console.error('Runtime Error:', err.message);
    }
}

test();
