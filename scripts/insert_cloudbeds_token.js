require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const API_KEY = process.env.CLOUDBEDS_API_KEY;

async function saveToken() {
    console.log("--- Saving Static Cloudbeds Token ---");

    if (!API_KEY) {
        console.error("Missing API Key");
        return;
    }

    // Set expiry to far future to prevent refresh attempts
    const expiresAt = new Date("2099-01-01T00:00:00Z").toISOString();

    const { data, error } = await supabase.from("cloudbeds_tokens").upsert({
        id: 1,
        access_token: API_KEY,
        refresh_token: "static_key_no_refresh",
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
    }).select();

    if (error) {
        console.error("Error saving token:", error);
    } else {
        console.log("✅ Token saved successfully!");
    }
}

saveToken();
