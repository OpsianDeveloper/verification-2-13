function testGetAccessCodeLogic() {
    console.log("--- Debugging getAccessCode Logic ---");

    // Simulate the function logic exactly
    const now = new Date();
    console.log("Local Node Time:", now.toString());

    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    // Bangkok is UTC+7
    const bangkokOffset = 7 * 60 * 60000;
    const bangkokTime = new Date(utc + bangkokOffset);

    console.log("Calculated Bangkok Time:", bangkokTime.toString());

    const dayIndex = bangkokTime.getDay(); // 0=Sun, 1=Mon
    console.log("JS getDay() (0=Sun):", dayIndex);

    // The logic in verification.js:
    // const dow = dayIndex === 0 ? 7 : dayIndex;
    const dow = dayIndex === 0 ? 7 : dayIndex;
    console.log("Mapped DOW (1=Mon...7=Sun):", dow);

    const currentHour = bangkokTime.getHours();
    const currentMin = bangkokTime.getMinutes();
    const totalMins = currentHour * 60 + currentMin;

    console.log(`Time: ${currentHour}:${currentMin}`);
    console.log("Total Minutes:", totalMins);

    return { dow, totalMins };
}

testGetAccessCodeLogic();
