require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const API_URL = "http://localhost:3001/api/verify";

function createDummyImage() {
    // 1x1 black pixel JPEG
    return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
}

async function testValidation() {
    console.log("--- Testing Document Validation (Invalid Image) ---");
    const body = {
        action: "validate_document",
        image_data: createDummyImage()
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const json = await res.json();
        console.log("Response:", JSON.stringify(json, null, 2));

        if (json.document_valid === false && json.failure_reason) {
            console.log("✅ Correctly rejected invalid image.");
        } else {
            console.log("❌ FAILED: API accepted invalid image!");
        }

    } catch (err) {
        console.error("Request failed:", err);
    }
}

testValidation();
