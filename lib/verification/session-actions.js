import { supabase } from "../supabase";
import { generateToken } from "../utils";
import { inferStepFromSession } from "../session";
import { clampInt } from "../utils";

export async function handleStartVisitor(req, res) {
    const token = generateToken();
    const expected_guest_count = 1;
    const verified_guest_count = 0;
    const requires_additional_guest = false;

    const { error } = await supabase.from("demo_sessions").insert({
        session_token: token,
        status: "started",
        current_step: "welcome",
        expected_guest_count,
        verified_guest_count,
        requires_additional_guest,
        extracted_info: { type: "visitor" },
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

export async function handleStart(req, res) {
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

    if (error) {
        console.error("Error creating session:", error);
        return res.status(500).json({ error: "Failed to create session" });
    }

    return res.json({
        session_token: token,
        verify_url: `/verify/${token}`,
    });
}

export async function handleGetSession(req, res) {
    const { session_token } = req.body || {};
    if (!session_token) return res.status(400).json({ error: "Session token required" });

    const { data: session, error } = await supabase
        .from("demo_sessions")
        .select("*")
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
            ...session,
            current_step,
            expected_guest_count: expected,
            verified_guest_count: verified,
            requires_additional_guest: requires,
            remaining_guest_verifications: Math.max(expected - verified, 0),
        },
    });
}

export async function handleLogConsent(req, res) {
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
