require('dotenv').config({ path: '.env.local' });
const { normalizeReservationNumber } = require('../lib/utils');

// Mock data to test normalization consistency
const testCases = [
    { input: "100.771.242.027", expected: "100771242027" },
    { input: "970384722-1", expected: "9703847221" },
    { input: "ABC-123-D", expected: "ABC123D" },
    { input: "  123 456  ", expected: "123456" }
];

console.log("--- Testing Reservation Number Normalization ---");
testCases.forEach(({ input, expected }) => {
    const actual = normalizeReservationNumber(input);
    const pass = actual === expected;
    console.log(`[${pass ? "PASS" : "FAIL"}] Input: "${input}" -> Expected: "${expected}", Actual: "${actual}"`);
});

// Since we can't easily run handleUpdateGuest without a full session, 
// we'll verify the logic by checking if getReservation is exported correctly
const { getReservation } = require('../lib/cloudbeds');
console.log("\n--- Verifying Library Exports ---");
console.log(`getReservation is defined: ${!!getReservation}`);

console.log("\nVerification script complete.");
