import { supabase } from "./supabase";

export async function getAccessCode() {
    try {
        const utcDate = new Date();
        const bangkokOffset = 7 * 60 * 60000;
        const bkkDate = new Date(utcDate.getTime() + bangkokOffset);

        const currentHour = bkkDate.getUTCHours();
        const currentMin = bkkDate.getUTCMinutes();
        const totalMins = currentHour * 60 + currentMin;

        const dow = bkkDate.getUTCDay(); // 0=Sun, 1=Mon... 6=Sat (Matches DB)

        console.log(`[getAccessCode] Bangkok Time: ${currentHour}:${currentMin} (dow=${dow}, mins=${totalMins})`);

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
