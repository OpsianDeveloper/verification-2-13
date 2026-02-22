/**
 * One-time migration: re-extract guest name and confirmation number
 * from historical booking_email_index records that have raw_text
 * but empty guest_name_norm (failed extraction due to old regex).
 *
 * Usage: node migrate-bookings.js
 */

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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Same normalization as inbound.js and verify.js ──

function normalizeGuestName(name) {
    return String(name || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, "");
}

function normalizeReservationNumber(v) {
    return String(v || "").toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
}

// ── Same extraction as updated inbound.js ──

function extractBooking(bodyText) {
    const text = bodyText || "";

    const guestNameRaw = (
        text.match(/Guest Name[:\s]+([^\r\n]+)/i)?.[1] ||
        text.match(/Guest:\s*'?([^\r\n]+)/i)?.[1] ||
        ""
    ).trim().replace(/^'+/, "");

    const confirmationRaw = (
        text.match(/Confirmation Number[:\s]+([A-Z0-9.\/-]+)/i)?.[1] ||
        text.match(/Res\s*Id[:\s]+([A-Z0-9.\/-]+)/i)?.[1] ||
        text.match(/confirmation number[:\s]+([A-Z0-9.\/-]+)/i)?.[1] ||
        ""
    ).trim();

    const sourceResIdRaw =
        (text.match(/Source Reservation ID[:\s]+([A-Z0-9.\/-]+)/i)?.[1] || "").trim();

    let adults = parseInt(text.match(/Adults[:\s]*(\d+)/i)?.[1] || "0", 10) || 0;
    let children = parseInt(text.match(/Children[:\s]*(\d+)/i)?.[1] || "0", 10) || 0;

    if (adults === 0) {
        const tableMatch = text.match(
            /\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}\s+(\d+)\s+(\d+)/
        );
        if (tableMatch) {
            adults = parseInt(tableMatch[1], 10) || 0;
            children = parseInt(tableMatch[2], 10) || 0;
        }
    }

    if (adults === 0 && guestNameRaw) adults = 1;

    return {
        guest_name_raw: guestNameRaw,
        guest_name_norm: normalizeGuestName(guestNameRaw),
        confirmation_number_raw: confirmationRaw,
        confirmation_number_norm: normalizeReservationNumber(confirmationRaw),
        source_reservation_id_raw: sourceResIdRaw,
        source_reservation_id_norm: normalizeReservationNumber(sourceResIdRaw),
        adults,
        children,
    };
}

function isBookingEmail(bodyText) {
    if (!bodyText) return false;
    const text = bodyText.toLowerCase();
    if (text.includes("ttlock") && text.includes("error")) return false;
    if (text.includes("automatically forward") && text.includes("mail to your email")) return false;
    if (text.includes("res id")) return true;
    if (text.includes("confirmation number")) return true;
    if (text.includes("reservation") && text.includes("guest")) return true;
    if (text.includes("check-in") && text.includes("check-out")) return true;
    return false;
}

// ── Main migration ──

async function main() {
    console.log("🔄 Starting migration of booking_email_index records...\n");

    // Fetch all records with empty guest_name_norm that have raw_text
    const { data: records, error } = await supabase
        .from("booking_email_index")
        .select("id, raw_text")
        .eq("guest_name_norm", "")
        .not("raw_text", "is", null)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("❌ Failed to fetch records:", error);
        process.exit(1);
    }

    console.log(`📊 Found ${records.length} records with empty extraction\n`);

    let updated = 0;
    let skippedNoise = 0;
    let skippedNoExtraction = 0;

    for (const record of records) {
        // Skip non-booking emails
        if (!isBookingEmail(record.raw_text)) {
            skippedNoise++;
            continue;
        }

        // Try extraction
        const extracted = extractBooking(record.raw_text);

        if (!extracted.guest_name_norm && !extracted.confirmation_number_norm) {
            skippedNoExtraction++;
            console.log(`  ⚠️ ${record.id}: booking email but extraction still failed`);
            console.log(`     Preview: ${record.raw_text.slice(0, 100)}...\n`);
            continue;
        }

        // Update the record
        const { error: updateError } = await supabase
            .from("booking_email_index")
            .update({
                guest_name_raw: extracted.guest_name_raw,
                guest_name_norm: extracted.guest_name_norm,
                confirmation_number_raw: extracted.confirmation_number_raw,
                confirmation_number_norm: extracted.confirmation_number_norm,
                source_reservation_id_raw: extracted.source_reservation_id_raw,
                source_reservation_id_norm: extracted.source_reservation_id_norm,
                adults: extracted.adults,
                children: extracted.children,
            })
            .eq("id", record.id);

        if (updateError) {
            console.error(`  ❌ ${record.id}: update failed:`, updateError);
        } else {
            updated++;
            console.log(`  ✅ ${record.id}: ${extracted.guest_name_raw} / ${extracted.confirmation_number_raw} (${extracted.adults} adults, ${extracted.children} children)`);
        }
    }

    console.log(`\n── Migration Complete ──`);
    console.log(`  ✅ Updated:               ${updated}`);
    console.log(`  ⏭️  Skipped (noise):       ${skippedNoise}`);
    console.log(`  ⚠️  Skipped (no extract):  ${skippedNoExtraction}`);
    console.log(`  📊 Total processed:        ${records.length}`);
}

main().catch(console.error);
