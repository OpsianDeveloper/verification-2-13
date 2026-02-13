const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) process.env[match[1].trim()] = match[2].trim();
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching recent valid reservations...");

    const { data, error } = await supabase
        .from("booking_email_index")
        .select("guest_name_raw, confirmation_number_raw, guest_name_norm, confirmation_number_norm, created_at")
        .neq("guest_name_norm", "")
        .neq("confirmation_number_norm", "")
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    if (data.length === 0) {
        console.log("No valid reservations found.");
    } else {
        console.log("\n--- Valid Test Data ---");
        data.forEach((booking, index) => {
            console.log(`\nOption ${index + 1}:`);
            console.log(`Guest Name: ${booking.guest_name_raw}`);
            console.log(`Reservation Number: ${booking.confirmation_number_raw}`);
            console.log(`(Normalized: ${booking.guest_name_norm} / ${booking.confirmation_number_norm})`);
        });
        console.log("\n-----------------------");
    }
}

main();
