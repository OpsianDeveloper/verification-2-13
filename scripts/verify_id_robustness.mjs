import { normalizeReservationNumber, normalizeGuestName } from "../lib/utils.js";

// Mock extraction function from migrate-bookings.js
function extractBooking(text) {
    const confirmationRaw = (
        text.match(/Confirmation Number[:\s]+([A-Z0-9.\/-]+)/i)?.[1] ||
        text.match(/Res\s*Id[:\s]+([A-Z0-9.\/-]+)/i)?.[1] ||
        text.match(/confirmation number[:\s]+([A-Z0-9.\/-]+)/i)?.[1] ||
        ""
    ).trim();

    return {
        confirmationRaw,
        confirmationNorm: normalizeReservationNumber(confirmationRaw)
    };
}

function testNormalization() {
    console.log("--- Testing Normalization ---");
    const testCases = [
        ["1234-567-890", "1234567890"],
        ["1234.567.890", "1234567890"],
        ["RES/123/ABC", "RES123ABC"],
        ["RES 123 456", "RES123456"],
    ];

    testCases.forEach(([input, expected]) => {
        const result = normalizeReservationNumber(input);
        console.log(`Input: ${input} -> Result: ${result} [${result === expected ? "PASS" : "FAIL"}]`);
    });
}

function testExtraction() {
    console.log("\n--- Testing Extraction ---");
    const testCases = [
        "Confirmation Number: 1234.567.890",
        "Res Id: RES-123-ABC",
        "confirmation number: 888/999.000",
    ];

    testCases.forEach(input => {
        const { confirmationRaw, confirmationNorm } = extractBooking(input);
        console.log(`Input: "${input}"\n  Raw: ${confirmationRaw}\n  Norm: ${confirmationNorm}`);
    });
}

function testParentLogic(bookingValue) {
    console.log(`\n--- Testing Parent logic for input: ${bookingValue} ---`);
    const resNorm = normalizeReservationNumber(bookingValue);
    console.log(`ResNorm: ${resNorm}`);

    let orConditions = [`confirmation_number_norm.eq.${resNorm}`];

    if (String(bookingValue).includes("-")) {
        const parts = String(bookingValue).split("-");
        if (parts.length > 1) {
            const parentId = parts.slice(0, -1).join("-");
            if (parentId.length > 2) {
                const parentNorm = normalizeReservationNumber(parentId);
                orConditions.push(`confirmation_number_norm.eq.${parentNorm}`);
            }
        }
    }
    console.log(`Conditions: ${orConditions.join(" OR ")}`);
}

testNormalization();
testExtraction();
testParentLogic("RES-123-1");
testParentLogic("12345");
