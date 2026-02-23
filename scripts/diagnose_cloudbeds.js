require('dotenv').config({ path: '.env.local' });
const { getReservation } = require('../lib/cloudbeds');

// We need to polyfill fetch if not in global (Next.js provides it, but plain node might not)
if (!global.fetch) {
    global.fetch = require('node-fetch');
}

async function diagnose() {
    const ids = ["970384722", "100771242027"];
    console.log(`--- Diagnosing Cloudbeds for IDs: ${ids.join(", ")} ---\n`);

    for (const id of ids) {
        try {
            console.log(`\nAttempting getReservation for ${id}...`);
            const data = await getReservation(id);
            console.log(`✅ SUCCESS!`);
            console.log(`- Guest: ${data.firstName} ${data.lastName}`);
            console.log(`- Status: ${data.status}`);
            console.log(`- OTA ID: ${data.thirdPartyIdentifier}`);
            console.log(`- Adults: ${data.adults}, Children: ${data.children}`);
        } catch (err) {
            console.log(`❌ FAILED: ${err.message}`);
        }
    }
}

diagnose();
