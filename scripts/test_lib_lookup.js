require('dotenv').config({ path: '.env.local' });
// We need to use absolute paths or handle imports manually for a script
const { getReservation } = require('./lib/cloudbeds');

async function testLookup() {
    const ids = ["970384722", "100771242027"];
    console.log(`--- Testing Cloudbeds Lookup for IDs: ${ids.join(", ")} ---\n`);

    for (const id of ids) {
        try {
            console.log(`Searching for ${id}...`);
            const data = await getReservation(id);
            console.log(`✅ Found! Guest: ${data.firstName} ${data.lastName}`);
        } catch (err) {
            console.log(`❌ Failed for ${id}: ${err.message}`);
        }
    }
}

testLookup();
