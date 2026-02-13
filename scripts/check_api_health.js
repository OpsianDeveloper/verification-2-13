const fetch = require('node-fetch');

async function checkApi() {
    try {
        console.log("Testing POST /api/verify...");
        const res = await fetch('http://localhost:3001/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start', type: 'guest' })
        });

        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text);

        if (res.ok) {
            console.log("✅ API is working");
        } else {
            console.log("❌ API returned error");
        }
    } catch (err) {
        console.error("❌ Request failed:", err);
    }
}

checkApi();
