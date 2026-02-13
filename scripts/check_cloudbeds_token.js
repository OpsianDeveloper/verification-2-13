require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkToken() {
    console.log("--- Checking Cloudbeds Token ---");
    const { data, error } = await supabase
        .from('cloudbeds_tokens')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching token:", error);
        return;
    }

    if (data && data.length > 0) {
        const t = data[0];
        console.log("Token found!");
        console.log(`Expires At: ${t.expires_at}`);
        const now = new Date();
        const exp = new Date(t.expires_at);
        console.log(`Is Expired? ${now > exp ? "YES" : "NO"}`);
        console.log(`Updated At: ${t.updated_at}`);
    } else {
        console.log("NO Cloudbeds token found in DB.");
    }
}

checkToken();
