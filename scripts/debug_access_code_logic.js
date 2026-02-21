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

    const dow = bangkokTime.getDay(); // 0=Sun, 1=Mon...6=Sat
    console.log("Mapped DOW (0=Sun...6=Sat):", dow);

    const currentHour = bangkokTime.getHours();
    const currentMin = bangkokTime.getMinutes();
    const totalMins = currentHour * 60 + currentMin;

    console.log(`Time: ${currentHour}:${currentMin}`);
    console.log("Total Minutes:", totalMins);

    return { dow, totalMins };
}

testGetAccessCodeLogic();
