require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const API_KEY = process.env.CLOUDBEDS_API_KEY;

async function testKey() {
    console.log(`Testing API Key: ${API_KEY ? API_KEY.slice(0, 10) + "..." : "MISSING"}`);

    if (!API_KEY) {
        console.error("No CLOUDBEDS_API_KEY found in .env.local");
        return;
    }

    try {
        const res = await fetch("https://api.cloudbeds.com/api/v1.1/getHotelDetails", {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const json = await res.json();

        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(json, null, 2));

        if (json.success) {
            console.log("✅ Key is VALID! Hotel Name:", json.data.propertyName);
        } else {
            console.log("❌ Key failed.", json.message);
        }
    } catch (error) {
        console.error("Request failed:", error);
    }
}

testKey();
