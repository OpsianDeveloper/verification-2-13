import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  RekognitionClient,
  CompareFacesCommand,
  DetectFacesCommand,
} from "@aws-sdk/client-rekognition";
import { TextractClient, AnalyzeIDCommand } from "@aws-sdk/client-textract";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const AWS_REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET_NAME;

if (!SUPABASE_URL) console.warn("Missing env: NEXT_PUBLIC_SUPABASE_URL");
if (!SUPABASE_SERVICE_KEY) console.warn("Missing env: SUPABASE_SERVICE_KEY");
if (!AWS_REGION) console.warn("Missing env: AWS_REGION");
if (!BUCKET) console.warn("Missing env: S3_BUCKET_NAME");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const s3 = new S3Client({ region: AWS_REGION });
const rekognition = new RekognitionClient({ region: AWS_REGION });
const textract = new TextractClient({ region: AWS_REGION });

function setCors(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version"
  );
}

function generateToken() {
  return crypto.randomBytes(9).toString("base64url");
}

async function streamToBuffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function normalizeBase64(base64OrDataUrl) {
  if (typeof base64OrDataUrl !== "string") return null;
  if (base64OrDataUrl.startsWith("data:image/")) {
    return base64OrDataUrl.replace(/^data:image\/\w+;base64,/, "");
  }
  return base64OrDataUrl;
}

function normalizeGuestName(name) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "");
}

function normalizeReservationNumber(v) {
  return String(v || "").toUpperCase().trim().replace(/[\s-]/g, "");
}

function inferStepFromSession(session) {
  if (!session) return "welcome";
  if (session?.current_step) return session.current_step;

  if (session?.is_verified === true || session?.verification_score != null) return "results";
  if (session?.selfie_url) return "results";
  if (session?.document_url) return "selfie";
  if (session?.guest_name || session?.room_number) return "document";
  return "welcome";
}

function normalizeKey(k = "") {
  return String(k).trim().toLowerCase().replace(/\s+/g, "_");
}

function parseMrzTD3(mrz) {
  try {
    const clean = String(mrz || "")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("")
      .replace(/\s+/g, "")
      .toUpperCase();

    const lines =
      clean.includes("\n")
        ? clean.split("\n").filter(Boolean)
        : clean.length >= 88
          ? [clean.slice(0, 44), clean.slice(44, 88)]
          : clean.length >= 44
            ? [clean.slice(0, 44), clean.slice(44, 88)]
            : [];

    if (lines.length < 2) return null;

    const l2 = String(lines[1] || "").padEnd(44, "<");

    const passportNumberRaw = l2.slice(0, 9);
    const passport_number = passportNumberRaw.replace(/</g, "").trim() || null;

    const nationality = l2.slice(10, 13).replace(/</g, "").trim() || null;

    const dob_yymmdd_raw = l2.slice(13, 19);
    const dob_yymmdd = dob_yymmdd_raw.replace(/</g, "").trim() || null;

    const sexRaw = l2.slice(20, 21);
    const sex = sexRaw.replace(/</g, "").trim() || null;

    const exp_yymmdd_raw = l2.slice(21, 27);
    const exp_yymmdd = exp_yymmdd_raw.replace(/</g, "").trim() || null;

    return {
      passport_number,
      nationality,
      sex,
      dob_yymmdd,
      exp_yymmdd,
      line1: lines[0] || null,
      line2: lines[1] || null,
    };
  } catch {
    return null;
  }
}

function parseAnalyzeIdFields(fields = []) {
  const raw = {};
  for (const f of fields) {
    const key = normalizeKey(f?.Type?.Text);
    const val = f?.ValueDetection?.Text;
    if (key && val) raw[key] = val;
  }

  const first_name = raw.first_name || raw.firstname || raw.given_name || raw.givenname || null;

  const middle_name =
    raw.middle_name || raw.middlename || raw.second_name || raw.secondname || null;

  const last_name =
    raw.last_name || raw.lastname || raw.surname || raw.family_name || raw.familyname || null;

  const full_name =
    raw.full_name ||
    raw.name ||
    ([first_name, middle_name, last_name].filter(Boolean).join(" ") || null);

  const dob = raw.date_of_birth || raw.dob || null;
  const date_of_issue = raw.date_of_issue || raw.issue_date || null;
  const expiration_date = raw.expiration_date || raw.expiry_date || raw.expiry || null;

  const document_number =
    raw.document_number ||
    raw.passport_number ||
    raw.id_number ||
    raw.identity_document_number ||
    raw.personal_number ||
    null;

  const id_type = raw.id_type || null;
  const mrz_code = raw.mrz_code || raw.mrz || null;

  const sex = raw.sex || raw.gender || null;
  let nationality = raw.nationality || raw.country || null;

  const mrz_parsed = mrz_code ? parseMrzTD3(mrz_code) : null;

  if (!nationality && mrz_parsed?.nationality) nationality = mrz_parsed.nationality;
  const sexFinal = sex || mrz_parsed?.sex || null;

  const documentNumberFinal = document_number || mrz_parsed?.passport_number || null;
  const dobFinal = dob || mrz_parsed?.dob_yymmdd || null;
  const expirationFinal = expiration_date || mrz_parsed?.exp_yymmdd || null;

  return {
    text: null,
    id_type,
    document_number: documentNumberFinal,
    last_name,
    first_name,
    middle_name,
    date_of_birth: dobFinal,
    date_of_issue,
    expiration_date: expirationFinal,
    nationality,
    sex: sexFinal,
    mrz_code,
    mrz_parsed,
    full_name,
    raw,
  };
}

async function runTextractAnalyzeIdWithTimeout(imageBuffer, timeoutMs = 15000) {
  const run = async () => {
    const res = await textract.send(
      new AnalyzeIDCommand({
        DocumentPages: [{ Bytes: imageBuffer }],
      })
    );
    const fields = res?.IdentityDocuments?.[0]?.IdentityDocumentFields || [];
    return parseAnalyzeIdFields(fields);
  };

  try {
    const data = await Promise.race([
      run(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Textract timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function toIntOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function clampInt(n, min, max) {
  const x = toIntOrNull(n);
  if (x === null) return min;
  return Math.min(Math.max(x, min), max);
}

// Helper: Get Access Code from DB based on Schedule
// Helper: Get Access Code from DB based on Schedule
async function getAccessCode() {
  try {
    const now = new Date();

    // Use Intl to get robust Bangkok time parts
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok',
      hour12: false,
      weekday: 'numeric', // 1=Mon, 7=Sun (Warning: verify this)
      hour: 'numeric',
      minute: 'numeric'
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type)?.value;

    const weekdayStr = getPart('weekday'); // "1"
    const hourStr = getPart('hour');       // "16"
    const minuteStr = getPart('minute');   // "15"

    // Intl weekday: 1=Monday ... 7=Sunday (if locale en-US stays consistent with standard)
    // Actually en-US might return "Monday" if 'weekday': 'long'. 
    // Let's use 'numeric' -> 1 is Monday? No, usually Sunday is 1 or 7?
    // Let's debug this locally first or assume 1=Monday based on common Intl behavior? 
    // Wait, Intl 'numeric' weekday relies on calendar. 

    // SAFER APPROACH: Use getDay() on a shifted date constructed correctly OR map string.
    // Let's use 'short' -> "Mon", "Tue" and map it manually to be 100% sure.
  } catch (e) {
    // ...
  }
}

// RETRY: Better Logic using toLocaleString
async function getAccessCode() {
  try {
    const now = new Date();

    const options = { timeZone: 'Asia/Bangkok', hour12: false, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const bangkokStr = now.toLocaleString('en-US', options);
    const bangkokDate = new Date(bangkokStr); // This creates a Date object reflecting the components in LOCAL time

    // Now bangkokDate.getDay() returns local DOW for the "Bangkok time" components
    // e.g. if Bangkok is Friday 16:00, bangkokDate is "Friday 16:00 Local".

    const dayIndex = bangkokDate.getDay(); // 0=Sun, 1=Mon...
    const dow = dayIndex === 0 ? 7 : dayIndex; // 1=Mon...7=Sun

    const currentHour = bangkokDate.getHours();
    const currentMin = bangkokDate.getMinutes();
    const totalMins = currentHour * 60 + currentMin;

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
    return null;
  } catch (err) {
    console.error("Exception fetching access code:", err);
    return null;
  }
}


export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action } = req.body || {};

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: "Server misconfigured: missing Supabase env vars" });
    }

    if (action === "start") {
      const token = generateToken();

      const expected_guest_count = 1;
      const verified_guest_count = 0;
      const requires_additional_guest = expected_guest_count > verified_guest_count;

      const { error } = await supabase.from("demo_sessions").insert({
        session_token: token,
        status: "started",
        current_step: "welcome",
        expected_guest_count,
        verified_guest_count,
        requires_additional_guest,
        updated_at: new Date().toISOString(),
      });

      console.log(`[verify.js] Created session: ${token}`);

      if (error) {
        console.error("Error creating session:", error);
        return res.status(500).json({ error: "Failed to create session" });
      }

      return res.json({
        session_token: token,
        verify_url: `/verify/${token}`,
      });
    }

    if (action === "start_visitor") {
      const token = generateToken();

      // Visitor flow: 1 guest (the visitor), no reservation lookup needed
      const expected_guest_count = 1;
      const verified_guest_count = 0;
      const requires_additional_guest = false;

      const { error } = await supabase.from("demo_sessions").insert({
        session_token: token,
        status: "started",
        current_step: "welcome", // or "visitor_welcome" if you want distinct UI
        expected_guest_count,
        verified_guest_count,
        requires_additional_guest,
        extracted_info: { type: "visitor" }, // Marker for visitor session
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error("Error creating visitor session:", error);
        return res.status(500).json({ error: "Failed to create visitor session" });
      }

      return res.json({
        success: true,
        session_token: token,
        verify_url: `/verify/${token}?type=visitor`,
      });
    }


    if (action === "get_session") {
      const { session_token } = req.body || {};
      if (!session_token) return res.status(400).json({ error: "Session token required" });

      const { data: session, error } = await supabase
        .from("demo_sessions")
        .select(
          [
            "session_token",
            "status",
            "current_step",
            "consent_given",
            "consent_time",
            "consent_locale",
            "guest_name",
            "room_number",
            "adults",
            "children",
            "document_url",
            "selfie_url",
            "is_verified",
            "verification_score",
            "liveness_score",
            "face_match_score",
            "extracted_info",
            "tm30_info",
            "tm30_status",
            "expected_guest_count",
            "verified_guest_count",
            "requires_additional_guest",
            "visitor_first_name",
            "visitor_last_name",
            "visitor_phone",
            "visitor_reason",
            "visitor_access_code",
            "visitor_access_granted_at",
            "visitor_access_expires_at",

            "property_external_id",
            "door_key",
            "physical_room",
            "room_access_code",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .eq("session_token", session_token)
        .single();

      if (error || !session) {
        console.error(`[verify.js] Session not found: ${session_token}`, error);
        return res.status(404).json({ error: "Session not found" });
      }

      const current_step = inferStepFromSession(session);
      const expected = clampInt(session.expected_guest_count, 1, 10);
      const verified = clampInt(session.verified_guest_count, 0, 10);

      const requires =
        session.requires_additional_guest === true
          ? true
          : session.requires_additional_guest === false
            ? false
            : verified < expected;

      return res.json({
        success: true,
        session: {
          session_token: session.session_token,
          status: session.status ?? null,
          current_step,

          consent_given: session.consent_given ?? null,
          consent_time: session.consent_time ?? null,
          consent_locale: session.consent_locale ?? null,

          guest_name: session.guest_name ?? null,
          room_number: session.room_number ?? null,

          adults: session.adults ?? null,
          children: session.children ?? null,

          document_uploaded: Boolean(session.document_url),
          selfie_uploaded: Boolean(session.selfie_url),

          is_verified: session.is_verified ?? null,
          verification_score: session.verification_score ?? null,
          liveness_score: session.liveness_score ?? null,
          face_match_score: session.face_match_score ?? null,

          extracted_info: session.extracted_info ?? null,

          tm30_info: session.tm30_info ?? {},
          tm30_status: session.tm30_status ?? "draft",

          expected_guest_count: expected,
          verified_guest_count: verified,
          requires_additional_guest: requires,
          remaining_guest_verifications: Math.max(expected - verified, 0),
        },
      });
    }

    if (action === "log_consent") {
      const { session_token, consent_given, consent_time, consent_locale } = req.body || {};
      if (!session_token) return res.status(400).json({ error: "Session token required" });

      const { data: existing, error: findError } = await supabase
        .from("demo_sessions")
        .select("session_token")
        .eq("session_token", session_token)
        .single();

      if (findError || !existing) return res.status(404).json({ error: "Session not found" });

      const { error: updateError } = await supabase
        .from("demo_sessions")
        .update({
          consent_given: Boolean(consent_given),
          consent_time: consent_time || new Date().toISOString(),
          consent_locale: consent_locale || "en",
          status: "consent_logged",
          current_step: "welcome",
          updated_at: new Date().toISOString(),
        })
        .eq("session_token", session_token);

      if (updateError) {
        console.error("Error updating consent:", updateError);
        return res.status(500).json({ error: "Failed to log consent" });
      }

      return res.json({ success: true, message: "Consent logged successfully" });
    }

    if (action === "update_guest") {
      const { session_token, guest_name, booking_ref, room_number, expected_guest_count, flow_type, visitor_first_name, visitor_last_name, visitor_phone, visitor_reason } =
        req.body || {};
      if (!session_token) return res.status(400).json({ error: "Session token required" });

      const bookingValue = booking_ref || room_number || null;

      if (!guest_name || !bookingValue) {
        return res.status(400).json({ error: "Guest name and reservation number are required" });
      }

      // ✅ VISITOR FLOW: Skip booking lookup
      const isVisitor = bookingValue === "VISITOR" || flow_type === "visitor";

      if (isVisitor) {
        console.log("[update_guest] Visitor flow detected, skipping booking lookup");

        const updatePayload = {
          guest_name: guest_name || null,
          room_number: "VISITOR",
          status: "visitor_info_saved",
          current_step: "document",
          expected_guest_count: 1,
          verified_guest_count: 0,
          requires_additional_guest: false,
          visitor_first_name: visitor_first_name || null,
          visitor_last_name: visitor_last_name || null,
          visitor_phone: visitor_phone || null,
          visitor_reason: visitor_reason || null,
          extracted_info: {
            type: "visitor",
          },
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from("demo_sessions")
          .update(updatePayload)
          .eq("session_token", session_token);

        if (updateError) {
          console.error("Error saving visitor info:", updateError);
          return res.status(500).json({ error: "Failed to save visitor info" });
        }

        return res.json({
          success: true,
          flow_type: "visitor",
        });
      }

      // ✅ GUEST FLOW: Continue with booking lookup
      const guestNameNorm = normalizeGuestName(guest_name);
      const resNorm = normalizeReservationNumber(bookingValue);

      // Changed const to let to allow bypass override
      let orConditions = [
        `confirmation_number_norm.eq.${resNorm}`,
        `source_reservation_id_norm.eq.${resNorm}`
      ];

      // Enhanced lookup: If hyphen formatted (e.g. 12345-1), also try the parent (12345)
      // This handles sub-reservations where the email confirmation might use the parent ID
      if (resNorm.includes("-")) {
        const parentNorm = resNorm.split("-")[0];
        if (parentNorm.length > 2) {
          orConditions.push(`confirmation_number_norm.eq.${parentNorm}`);
          orConditions.push(`source_reservation_id_norm.eq.${parentNorm}`);
        }
      }

      console.log(`[update_guest] Lookup guest=${guestNameNorm}, refs=${orConditions.join(" OR ")}`);

      let { data: matches, error: matchErr } = await supabase
        .from("booking_email_index")
        .select("id, adults, children")
        .eq("guest_name_norm", guestNameNorm)
        .or(orConditions.join(","))
        .limit(1);

      if (matchErr) {
        console.error("booking_email_index lookup error:", matchErr);
        return res.status(500).json({ error: "Failed to verify reservation" });
      }





      if (!matches || matches.length === 0) {
        return res.status(403).json({
          error:
            "Reservation not found. Please enter your name and reservation number exactly as shown in your confirmation email.",
        });
      }

      const bookingRow = matches[0];

      const adultsFromEmail = Number.isFinite(Number(bookingRow.adults))
        ? Number(bookingRow.adults)
        : 1;

      const childrenFromEmail = Number.isFinite(Number(bookingRow.children))
        ? Number(bookingRow.children)
        : 0;

      // ✅ POLICY: verify adults only (store children for context)
      const expectedFromEmail = clampInt(adultsFromEmail, 1, 10);

      const expectedOverride = toIntOrNull(expected_guest_count);
      const expectedToSet =
        expectedOverride === null ? expectedFromEmail : clampInt(expectedOverride, 1, 10);

      const { data: s, error: sErr } = await supabase
        .from("demo_sessions")
        .select("verified_guest_count")
        .eq("session_token", session_token)
        .single();

      const verified = !sErr && s ? clampInt(s.verified_guest_count, 0, 10) : 0;

      const updatePayload = {
        guest_name: guest_name || null,
        room_number: bookingValue,

        adults: clampInt(adultsFromEmail, 0, 10),
        children: clampInt(childrenFromEmail, 0, 10),

        status: "guest_info_saved",
        current_step: "document",
        expected_guest_count: expectedToSet,
        requires_additional_guest: verified < expectedToSet,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("demo_sessions")
        .update(updatePayload)
        .eq("session_token", session_token);

      if (updateError) {
        console.error("Error saving guest info:", updateError);
        return res.status(500).json({ error: "Failed to save guest info" });
      }

      return res.json({
        success: true,
        adults: clampInt(adultsFromEmail, 0, 10),
        children: clampInt(childrenFromEmail, 0, 10),
        expected_guest_count: expectedToSet,
        verified_guest_count: verified,
        requires_additional_guest: verified < expectedToSet,
        remaining_guest_verifications: Math.max(expectedToSet - verified, 0),
      });
    }

    if (action === "tm30_update") {
      const { session_token, tm30_info } = req.body || {};
      if (!session_token) return res.status(400).json({ error: "Session token required" });

      const payload = tm30_info && typeof tm30_info === "object" ? tm30_info : {};

      const requiredKeys = [
        "nationality",
        "sex",
        "arrival_date_time",
        "departure_date",
        "property",
        "room_number",
      ];

      const missing = requiredKeys.filter((k) => {
        const v = payload[k];
        return v === undefined || v === null || String(v).trim() === "";
      });

      const tm30_status = missing.length === 0 ? "ready" : "draft";

      const { data, error } = await supabase
        .from("demo_sessions")
        .update({
          tm30_info: payload,
          tm30_status,
          updated_at: new Date().toISOString(),
        })
        .eq("session_token", session_token)
        .select("*")
        .single();

      if (error || !data) {
        console.error("tm30_update error:", error);
        return res.status(500).json({ error: error?.message || "Failed to update TM30 info" });
      }

      return res.status(200).json({
        success: true,
        tm30_status,
        missing_fields: missing,
        row: data,
      });
    }

    // ============================================================
    // VALIDATE DOCUMENT (pre-check before upload)
    // ============================================================
    if (action === "validate_document") {
      const { image_data } = req.body || {};
      if (!image_data) return res.status(400).json({ error: "image_data required" });
      if (!AWS_REGION) return res.status(500).json({ error: "Server misconfigured: missing AWS env vars" });



      const base64Data = normalizeBase64(image_data);
      if (!base64Data) return res.status(400).json({ error: "Invalid image_data format" });

      const imageBuffer = Buffer.from(base64Data, "base64");
      if (imageBuffer.length < 1000) {
        return res.json({
          success: true,
          document_valid: false,
          has_face: false,
          is_readable: false,
          failure_reason: "image_too_small",
        });
      }

      // Run Textract AnalyzeID synchronously
      const textractResult = await runTextractAnalyzeIdWithTimeout(imageBuffer, 15000);

      // Run DetectFaces to check for a face on the document
      let hasFace = false;
      let faceQuality = null;
      try {
        const detectResult = await rekognition.send(
          new DetectFacesCommand({
            Image: { Bytes: imageBuffer },
            Attributes: ["ALL"],
          })
        );
        const faces = detectResult.FaceDetails || [];
        hasFace = faces.length > 0;
        if (faces.length > 0) {
          faceQuality = {
            brightness: faces[0]?.Quality?.Brightness || 0,
            sharpness: faces[0]?.Quality?.Sharpness || 0,
            confidence: faces[0]?.Confidence || 0,
          };
        }
      } catch (e) {
        console.warn("DetectFaces failed during document validation:", e?.message);
        // If DetectFaces fails, we can't confirm a face — treat as no face
        hasFace = false;
      }

      // Determine if Textract extracted meaningful ID fields
      let isReadable = false;
      if (textractResult.ok && textractResult.data) {
        const d = textractResult.data;
        // Consider it readable if we got at least a name OR a document number
        const hasName = Boolean(d.full_name || d.first_name || d.last_name);
        const hasDocNumber = Boolean(d.document_number);
        const hasDob = Boolean(d.date_of_birth);
        isReadable = hasName || hasDocNumber || hasDob;
      }

      // Determine overall validity and specific failure reason
      let documentValid = hasFace && isReadable;
      let failureReason = null;

      if (!hasFace && !isReadable) {
        failureReason = "not_an_id";
      } else if (!hasFace) {
        failureReason = "no_face_detected";
      } else if (!isReadable) {
        failureReason = "not_readable";
      }

      // Check for blur via face quality
      if (hasFace && faceQuality && faceQuality.sharpness < 20) {
        documentValid = false;
        failureReason = "too_blurry";
      }

      console.log("[validate_document] Result:", {
        documentValid,
        hasFace,
        isReadable,
        failureReason,
        textractOk: textractResult.ok,
      });

      return res.json({
        success: true,
        document_valid: documentValid,
        has_face: hasFace,
        is_readable: isReadable,
        failure_reason: failureReason,
        face_quality: faceQuality,
      });
    }

    // ============================================================
    // VALIDATE SELFIE (pre-check before verify_face)
    // ============================================================
    if (action === "validate_selfie") {
      const { image_data } = req.body || {};
      if (!image_data) return res.status(400).json({ error: "image_data required" });
      if (!AWS_REGION) return res.status(500).json({ error: "Server misconfigured: missing AWS env vars" });



      const base64Data = normalizeBase64(image_data);
      if (!base64Data) return res.status(400).json({ error: "Invalid image_data format" });

      const imageBuffer = Buffer.from(base64Data, "base64");
      if (imageBuffer.length < 1000) {
        return res.json({
          success: true,
          selfie_valid: false,
          failure_reason: "image_too_small",
        });
      }

      let selfieValid = false;
      let failureReason = null;
      let faceDetails = null;

      try {
        const detectResult = await rekognition.send(
          new DetectFacesCommand({
            Image: { Bytes: imageBuffer },
            Attributes: ["ALL"],
          })
        );

        const faces = detectResult.FaceDetails || [];

        if (faces.length === 0) {
          failureReason = "no_face_detected";
        } else if (faces.length > 1) {
          failureReason = "multiple_faces";
        } else {
          const face = faces[0];
          const brightness = face?.Quality?.Brightness || 0;
          const sharpness = face?.Quality?.Sharpness || 0;
          const eyesOpen = face?.EyesOpen?.Value;
          const confidence = face?.Confidence || 0;

          faceDetails = { brightness, sharpness, eyesOpen, confidence };

          if (brightness < 30) {
            failureReason = "too_dark";
          } else if (sharpness < 20) {
            failureReason = "too_blurry";
          } else if (eyesOpen === false) {
            failureReason = "eyes_closed";
          } else if (confidence < 80) {
            failureReason = "low_confidence";
          } else {
            selfieValid = true;
          }
        }
      } catch (e) {
        console.error("DetectFaces failed during selfie validation:", e?.message);
        failureReason = "detection_error";
      }

      console.log("[validate_selfie] Result:", {
        selfieValid,
        failureReason,
        faceDetails,
      });

      return res.json({
        success: true,
        selfie_valid: selfieValid,
        failure_reason: failureReason,
        face_details: faceDetails,
      });
    }

    if (action === "upload_document") {
      const { session_token, image_data } = req.body || {};

      if (!session_token) return res.status(400).json({ error: "Session token required" });
      if (!image_data) return res.status(400).json({ error: "image_data required" });
      if (!AWS_REGION || !BUCKET)
        return res.status(500).json({ error: "Server misconfigured: missing AWS env vars" });

      // ✅ Gate: must have completed Step 1
      const { data: sess, error: sessErr } = await supabase
        .from("demo_sessions")
        .select("guest_name, room_number, expected_guest_count, verified_guest_count, extracted_info")
        .eq("session_token", session_token)
        .single();

      if (sessErr || !sess) return res.status(404).json({ error: "Session not found" });
      if (!sess.guest_name || !sess.room_number) {
        return res.status(403).json({ error: "Complete Step 1 (reservation verification) first." });
      }

      const expected = clampInt(sess.expected_guest_count, 1, 10);
      const verifiedBefore = clampInt(sess.verified_guest_count, 0, 10);

      // ✅ next guest to verify
      const guestIndex = clampInt(verifiedBefore + 1, 1, expected);



      const base64Data = normalizeBase64(image_data);
      if (!base64Data) return res.status(400).json({ error: "Invalid image_data format" });

      const imageBuffer = Buffer.from(base64Data, "base64");
      if (imageBuffer.length < 1000) return res.status(400).json({ error: "Image too small" });

      const s3Key = `demo/${session_token}/document_${guestIndex}.jpg`;



      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: s3Key,
          Body: imageBuffer,
          ContentType: "image/jpeg",
        })
      );

      const documentUrl = `s3://${BUCKET}/${s3Key}`;

      const { error: updateError } = await supabase
        .from("demo_sessions")
        .update({
          status: "document_uploaded",
          current_step: "selfie",
          document_url: documentUrl, // latest document for UI/debug
          extracted_info: {
            text: `Textract pending (async) [guest ${guestIndex}]`,
            textract_ok: null,
            textract_error: null,
            textract: null,
            guest_index: guestIndex,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("session_token", session_token);

      if (updateError) {
        console.error("Error updating document session:", updateError);
        return res.status(500).json({ error: "Failed to save document state" });
      }

      // ✅ SYNC VISITOR CODE GENERATION:
      // If visitor, we MUST generate code now so it's ready for the immediate next step (results)
      // The Textract job runs asynchronously for metadata, but we can't wait for that to issue the code.

      const isVisitorSession = sess.extracted_info?.type === "visitor" || sess.room_number === "VISITOR";

      // We also update this variable so the async block knows we handled it
      let visitorCodeData = null;

      if (isVisitorSession) {
        console.log("[upload_document] Visitor detected (sync), generating access code...");
        const access_code = await getAccessCode();

        if (access_code) {
          const now = new Date();
          const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 mins

          visitorCodeData = {
            visitor_access_code: access_code,
            visitor_access_granted_at: now.toISOString(),
            visitor_access_expires_at: expiresAt.toISOString(),
          };

          // Write immediately to DB
          await supabase
            .from("demo_sessions")
            .update({
              ...visitorCodeData,
              status: "visitor_access_granted", // optional status update
              updated_at: new Date().toISOString()
            })
            .eq("session_token", session_token);

          console.log(`[upload_document] Sync visitor code generated: ${access_code}`);
        } else {
          console.warn("[upload_document] No access code available from schedule (sync)");
        }
      }

      // Start Async Textract
      runTextractAnalyzeIdWithTimeout(imageBuffer, 15000)
        .then(async (result) => {
          if (result.ok) {
            const extracted = result.data;

            const extractedText =
              [
                extracted.full_name ? `Name: ${extracted.full_name}` : null,
                extracted.first_name ? `First: ${extracted.first_name}` : null,
                extracted.middle_name ? `Middle: ${extracted.middle_name}` : null,
                extracted.last_name ? `Last: ${extracted.last_name}` : null,
                extracted.sex ? `Sex: ${extracted.sex}` : null,
                extracted.nationality ? `Nationality: ${extracted.nationality}` : null,
                extracted.date_of_birth ? `DOB: ${extracted.date_of_birth}` : null,
                extracted.document_number ? `Doc#: ${extracted.document_number}` : null,
                extracted.expiration_date ? `Exp: ${extracted.expiration_date}` : null,
              ]
                .filter(Boolean)
                .join(" | ") || "Textract extracted fields";

            let extractedInfoUpdate = {
              text: `${extractedText} [guest ${guestIndex}]`,
              textract_ok: true,
              textract_error: null,
              textract: extracted,
              guest_index: guestIndex,
            };

            // ✅ Visitor Logic (Async Fallback/Metadata)
            if (isVisitorSession) {
              // If we already generated code synchronously, just ensure metadata is consistent
              if (visitorCodeData?.visitor_access_code) {
                extractedInfoUpdate = {
                  ...extractedInfoUpdate,
                  type: "visitor",
                  access_code: visitorCodeData.visitor_access_code, // legacy field in json
                  access_code_issued_at: visitorCodeData.visitor_access_granted_at,
                  access_code_expires_at: visitorCodeData.visitor_access_expires_at,
                };
              } else {
                // If sync failed or wasn't run for some reason, try again (fallback)
                // or just mark as visitor type
                extractedInfoUpdate.type = "visitor";
              }
            }

            await supabase
              .from("demo_sessions")
              .update({
                extracted_info: extractedInfoUpdate,
                updated_at: new Date().toISOString(),
              })
              .eq("session_token", session_token);
          } else {
            await supabase
              .from("demo_sessions")
              .update({
                extracted_info: {
                  text: `Textract failed (async) [guest ${guestIndex}]`,
                  textract_ok: false,
                  textract_error: result.error,
                  textract: null,
                  guest_index: guestIndex,
                },
                updated_at: new Date().toISOString(),
              })
              .eq("session_token", session_token);
          }
        })
        .catch((e) => {
          console.warn("Textract async crash:", e?.message || e);
        });

      // Return response immediately
      // If we generated a code, return it in the response too so frontend can use it immediately if it wants
      return res.json({
        success: true,
        guest_index: guestIndex,
        extracted_text: `Textract pending (async) [guest ${guestIndex}]`,
        visitor_access_code: visitorCodeData?.visitor_access_code,
        visitor_access_granted_at: visitorCodeData?.visitor_access_granted_at,
        visitor_access_expires_at: visitorCodeData?.visitor_access_expires_at,
        access_code: visitorCodeData?.visitor_access_code, // legacy compat
        data: {
          extracted_text: `Textract pending (async) [guest ${guestIndex}]`,
          guest_index: guestIndex,
          visitor_access_code: visitorCodeData?.visitor_access_code,
          access_code: visitorCodeData?.visitor_access_code,
        },
      });
    }

    if (action === "verify_face") {
      const { session_token, selfie_data } = req.body || {};

      if (!session_token) return res.status(400).json({ error: "Session token required" });
      if (!selfie_data) return res.status(400).json({ error: "selfie_data required" });
      if (!AWS_REGION || !BUCKET)
        return res.status(500).json({ error: "Server misconfigured: missing AWS env vars" });

      const { data: session, error: sessionError } = await supabase
        .from("demo_sessions")
        .select("*")
        .eq("session_token", session_token)
        .single();

      if (sessionError || !session) return res.status(404).json({ error: "Session not found" });



      const expected = clampInt(session.expected_guest_count, 1, 10);
      const verifiedBefore = clampInt(session.verified_guest_count, 0, 10);
      const guestIndex = clampInt(verifiedBefore + 1, 1, expected);

      // ✅ must match the per-guest doc
      const docKey = `demo/${session_token}/document_${guestIndex}.jpg`;

      let docBuffer;
      try {
        const docObj = await s3.send(
          new GetObjectCommand({
            Bucket: BUCKET,
            Key: docKey,
          })
        );
        const docStream = docObj.Body;
        if (!docStream) return res.status(500).json({ error: "Failed to read document from S3" });
        docBuffer = await streamToBuffer(docStream);
      } catch {
        return res.status(400).json({
          error: `Document not uploaded for guest ${guestIndex}. Please upload the ID first.`,
        });
      }

      const selfieBase64 = normalizeBase64(selfie_data);
      if (!selfieBase64) return res.status(400).json({ error: "Invalid selfie_data format" });

      const selfieBuffer = Buffer.from(selfieBase64, "base64");
      if (selfieBuffer.length < 1000) return res.status(400).json({ error: "Image too small" });

      const selfieKey = `demo/${session_token}/selfie_${guestIndex}.jpg`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: selfieKey,
          Body: selfieBuffer,
          ContentType: "image/jpeg",
        })
      );

      const selfieUrl = `s3://${BUCKET}/${selfieKey}`;

      const livenessResult = await rekognition.send(
        new DetectFacesCommand({
          Image: { Bytes: selfieBuffer },
          Attributes: ["ALL"],
        })
      );

      const face = livenessResult.FaceDetails?.[0];
      const isLive = Boolean(face?.EyesOpen?.Value) && (face?.Quality?.Brightness || 0) > 40;
      const livenessScore = (face?.Confidence || 0) / 100;

      const compareResult = await rekognition.send(
        new CompareFacesCommand({
          SourceImage: { Bytes: selfieBuffer },
          TargetImage: { Bytes: docBuffer },
          SimilarityThreshold: 80,
        })
      );

      const similarity = (compareResult.FaceMatches?.[0]?.Similarity || 0) / 100;

      const verificationScore = (isLive ? 0.4 : 0) + livenessScore * 0.3 + similarity * 0.3;

      // ✅ per-guest result (what Lovable should use to advance)
      const guest_verified = isLive && similarity >= 0.65;

      let verifiedAfter = verifiedBefore;
      if (guest_verified) verifiedAfter = Math.min(verifiedBefore + 1, expected);

      const requiresAdditionalGuest = verifiedAfter < expected;

      let statusToSet = "failed";
      if (guest_verified && requiresAdditionalGuest) statusToSet = "partial_verified";
      if (guest_verified && !requiresAdditionalGuest) statusToSet = "verified";

      // ✅ session-level overall verified = all guests verified
      const overallVerified = verifiedAfter >= expected;

      // ✅ IMPORTANT: set next step to avoid “guest 1 selfie loop”
      // If guest passed and more guests remain -> next step is document (guest 2 upload)
      // If guest passed and done -> results
      // If guest failed -> selfie
      const next_step = guest_verified
        ? requiresAdditionalGuest
          ? "document"
          : "results"
        : "selfie";

      const { error: updateError } = await supabase
        .from("demo_sessions")
        .update({
          status: statusToSet,
          current_step: next_step,

          // keep latest assets for UI/debug
          selfie_url: selfieUrl,
          document_url: `s3://${BUCKET}/${docKey}`,

          is_verified: overallVerified,
          verification_score: verificationScore,
          liveness_score: livenessScore,
          face_match_score: similarity,

          expected_guest_count: expected,
          verified_guest_count: verifiedAfter,
          requires_additional_guest: requiresAdditionalGuest,

          updated_at: new Date().toISOString(),
        })
        .eq("session_token", session_token);

      if (updateError) {
        console.error("Error updating verification session:", updateError);
        return res.status(500).json({ error: "Failed to save verification result" });
      }

      try {
        await supabase.from("demo_api_costs").insert([
          { session_id: session_token, operation: "liveness", cost_usd: 0.001 },
          { session_id: session_token, operation: "face_compare", cost_usd: 0.001 },
        ]);
      } catch (e) {
        console.warn("Cost insert failed (non-blocking):", e?.message || e);
      }

      // ✅ Fetch Access Code if verified
      let access_code = null;
      if (overallVerified) {
        access_code = await getAccessCode();
        if (access_code) {
          // Try to save to DB (extracted_info or new col)
          // We'll merge into extracted_info for safety
          const newExtracted = {
            ...(session.extracted_info || {}),
            access_code: access_code,
            access_code_issued_at: new Date().toISOString()
          };

          await supabase
            .from("demo_sessions")
            .update({ extracted_info: newExtracted })
            .eq("session_token", session_token);
        }
      }


      return res.json({
        success: true,
        guest_index: guestIndex,

        // ✅ critical per-guest signals (Lovable must use these)
        guest_verified,
        advance_to_next_guest: guest_verified,
        status: statusToSet,
        next_step,

        // session-level
        is_verified: overallVerified,
        expected_guest_count: expected,
        verified_guest_count: verifiedAfter,
        requires_additional_guest: requiresAdditionalGuest,
        remaining_guest_verifications: Math.max(expected - verifiedAfter, 0),

        data: {
          guest_index: guestIndex,
          guest_verified,
          advance_to_next_guest: guest_verified,
          status: statusToSet,
          next_step,

          liveness_score: livenessScore,
          face_match_score: similarity,
          verification_score: verificationScore,

          is_verified: overallVerified,
          requires_additional_guest: requiresAdditionalGuest,
          expected_guest_count: expected,
          verified_guest_count: verifiedAfter,
          remaining_guest_verifications: Math.max(expected - verifiedAfter, 0),
          access_code, // Includes code in response
        },
      });

    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error?.message || "Unknown server error" });
  }
}
