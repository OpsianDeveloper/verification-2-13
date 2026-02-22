require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const API_KEY = process.env.CLOUDBEDS_API_KEY;

async function checkCloudbeds() {
    console.log("--- Checking Cloudbeds for Mar 08 - Mar 09, 2026 ---\n");

    if (!API_KEY) {
        console.error("Missing CLOUDBEDS_API_KEY in .env.local");
        return;
    }

    const checkInFrom = "2026-03-08";
    const checkInTo = "2026-03-09";

    const url = `https://api.cloudbeds.com/api/v1.1/getReservations?checkInFrom=${checkInFrom}&checkInTo=${checkInTo}`;

    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        const json = await res.json();
        if (!json.success) {
            console.error("Cloudbeds error:", json.message);
            return;
        }

        console.log(`Found ${json.data.length} reservations for those dates:\n`);
        json.data.forEach(r => {
            console.log(`- Guest: ${r.firstName} ${r.lastName}`);
            console.log(`  Res ID: ${r.reservationID}`);
            console.log(`  OTA ID: ${r.thirdPartyIdentifier}`);
            console.log(`  Status: ${r.status}`);
            console.log(`  -------------------`);
        });

    } catch (err) {
        console.error("Fetch error:", err);
    }
}

checkCloudbeds();
