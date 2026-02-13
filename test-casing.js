// Native fetch is available in Node 18+

async function testCaseInsensitivity() {
    const baseUrl = 'http://localhost:3000/api/verify';

    console.log("1. Starting session...");
    const startRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
    });
    const startData = await startRes.json();

    if (!startData.session_token) {
        console.error("Failed to start session:", startData);
        return;
    }
    const token = startData.session_token;
    console.log("Session started. Token:", token);

    // Test Data: "Patrick Che" and "PATRICK123"
    // We will use: "pAtRiCk cHe" and "patrick123" (lowercase reservation)
    const testName = "pAtRiCk cHe";
    const testRef = "patrick123";

    console.log(`2. Attempting verification with: Name="${testName}", Ref="${testRef}"`);

    const verifyRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'update_guest',
            session_token: token,
            guest_name: testName,
            booking_ref: testRef
        })
    });

    const verifyData = await verifyRes.json();

    if (verifyData.success) {
        console.log("✅ SUCCESS! Verification passed with mixed-case inputs.");
        console.log("Response:", verifyData);
    } else {
        console.error("❌ FAILED! Verification failed.");
        console.error("Response:", verifyData);
    }
}

testCaseInsensitivity();
