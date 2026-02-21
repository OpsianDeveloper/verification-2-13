import { supabase } from "./supabase";

export async function getAccessCode() {
    try {
        const now = new Date();

        // Use Intl to get robust Bangkok time parts
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Bangkok",
            hour12: false,
            weekday: "short", // "Sun", "Mon", etc.
            hour: "numeric",
            minute: "numeric",
        });

        const parts = formatter.formatToParts(now);
        const part = (type) => parts.find((p) => p.type === type)?.value;

        const weekdayStr = part("weekday");
        const hourStr = part("hour");
        const minuteStr = part("minute");

        // Map weekday short string to 0-6 (Sun-Sat) to match JS getDay() and DB schedule
        const dowMap = {
            Sun: 0,
            Mon: 1,
            Tue: 2,
            Wed: 3,
            Thu: 4,
            Fri: 5,
            Sat: 6,
        };

        const dow = dowMap[weekdayStr];
        if (dow === undefined) {
            console.error(`[getAccessCode] FAILED to map weekday: ${weekdayStr}`);
            return null;
        }

        const currentHour = parseInt(hourStr, 10);
        const currentMin = parseInt(minuteStr, 10);
        const totalMins = currentHour * 60 + currentMin;

        console.log(
            `[getAccessCode] Bangkok Time: ${currentHour}:${currentMin} (dow=${dow}, mins=${totalMins}, raw_weekday=${weekdayStr})`
        );

        const { data, error } = await supabase
            .from("door_code_schedule")
            .select("access_code")
            .eq("dow", dow)
            .lte("start_min", totalMins)
            .gte("end_min", totalMins)
            .eq("is_active", true)
            .limit(1);

        if (error) {
            console.error("Error fetching access code:", error);
            return null;
        }

        if (data && data.length > 0) {
            return data[0].access_code;
        }

        console.warn(`[getAccessCode] No active code found for dow=${dow}, mins=${totalMins}`);
        return null;
    } catch (err) {
        console.error("Exception fetching access code:", err);
        return null;
    }
}
