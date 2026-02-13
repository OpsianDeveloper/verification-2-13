
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkTables() {
    const result = { booking_email_index: null, door_code_schedule: null };

    // booking_email_index
    const { data: bookings, error: bookingError } = await supabase
        .from("booking_email_index")
        .select("*")
        .limit(1);

    if (bookings && bookings.length > 0) {
        result.booking_email_index = Object.keys(bookings[0]);
    } else if (bookingError) {
        result.booking_email_index = { error: bookingError.message };
    } else {
        result.booking_email_index = "empty";
    }

    // door_code_schedule
    const { data: schedule, error: scheduleError } = await supabase
        .from("door_code_schedule")
        .select("*")
        .limit(1);

    if (schedule && schedule.length > 0) {
        result.door_code_schedule = Object.keys(schedule[0]);
    } else if (scheduleError) {
        result.door_code_schedule = { error: scheduleError.message };
    } else {
        result.door_code_schedule = "empty";
    }

    // demo_sessions
    const { data: sessions, error: sessionError } = await supabase
        .from("demo_sessions")
        .select("*")
        .limit(1);

    if (sessions && sessions.length > 0) {
        result.demo_sessions = Object.keys(sessions[0]);
    } else if (sessionError) {
        result.demo_sessions = { error: sessionError.message };
    } else {
        result.demo_sessions = "empty";
    }

    console.log(JSON.stringify(result, null, 2));
}

checkTables();
