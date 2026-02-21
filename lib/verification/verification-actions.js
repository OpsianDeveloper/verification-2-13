import { supabase } from "../supabase";
import { s3, rekognition, runTextractAnalyzeIdWithTimeout, BUCKET } from "../aws";
import { normalizeBase64, clampInt, streamToBuffer } from "../utils";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { CompareFacesCommand, DetectFacesCommand } from "@aws-sdk/client-rekognition";
import { getAccessCode } from "../access-codes";

export async function handleValidateDocument(req, res) {
    const { image_data, session_token } = req.body || {};
    if (!image_data) return res.status(400).json({ error: "image_data required" });

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

    const textractResult = await runTextractAnalyzeIdWithTimeout(imageBuffer, 15000);

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
        hasFace = false;
    }

    let isReadable = false;
    if (textractResult.ok && textractResult.data) {
        const d = textractResult.data;
        const hasName = Boolean(d.full_name || d.first_name || d.last_name);
        const hasDocNumber = Boolean(d.document_number);
        const hasDob = Boolean(d.date_of_birth);
        isReadable = hasName || hasDocNumber || hasDob;
    }

    let isVisitorFlow = false;
    if (session_token) {
        try {
            const { data: sess } = await supabase
                .from("demo_sessions")
                .select("extracted_info, room_number")
                .eq("session_token", session_token)
                .single();
            isVisitorFlow = sess?.extracted_info?.type === "visitor" || sess?.room_number === "VISITOR";
        } catch (e) {
            console.warn("[validate_document] Could not fetch session for flow detection:", e.message);
        }
    }

    let documentValid = hasFace && (isReadable || isVisitorFlow);
    let failureReason = null;

    if (!hasFace && !isReadable) {
        failureReason = "not_an_id";
    } else if (!hasFace) {
        failureReason = "no_face_detected";
    } else if (!isReadable) {
        failureReason = "not_readable";
    }

    if (hasFace && faceQuality && faceQuality.sharpness < 10) {
        documentValid = false;
        failureReason = "too_blurry";
    }

    return res.json({
        success: true,
        document_valid: documentValid,
        has_face: hasFace,
        is_readable: isReadable,
        failure_reason: failureReason,
        face_quality: faceQuality,
    });
}

export async function handleValidateSelfie(req, res) {
    const { image_data } = req.body || {};
    if (!image_data) return res.status(400).json({ error: "image_data required" });

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
            } else if (sharpness < 10) {
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

    return res.json({
        success: true,
        selfie_valid: selfieValid,
        failure_reason: failureReason,
        face_details: faceDetails,
    });
}

export async function handleUploadDocument(req, res) {
    const { session_token, image_data } = req.body || {};

    if (!session_token) return res.status(400).json({ error: "Session token required" });
    if (!image_data) return res.status(400).json({ error: "image_data required" });

    const { data: sess, error: sessErr } = await supabase
        .from("demo_sessions")
        .select("guest_name, room_number, expected_guest_count, verified_guest_count, extracted_info")
        .eq("session_token", session_token)
        .single();

    if (sessErr || !sess) return res.status(404).json({ error: "Session not found" });
    if (!sess.guest_name || !sess.room_number) {
        return res.status(403).json({ error: "Complete Step 1 first." });
    }

    const expected = clampInt(sess.expected_guest_count, 1, 10);
    const verifiedBefore = clampInt(sess.verified_guest_count, 0, 10);
    const guestIndex = clampInt(verifiedBefore + 1, 1, expected);

    const base64Data = normalizeBase64(image_data);
    const imageBuffer = Buffer.from(base64Data, "base64");
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

    await supabase
        .from("demo_sessions")
        .update({
            status: "document_uploaded",
            current_step: "selfie",
            document_url: documentUrl,
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

    const isVisitorSession = sess.extracted_info?.type === "visitor" || sess.room_number === "VISITOR";
    let visitorCodeData = null;

    if (isVisitorSession) {
        const access_code = await getAccessCode();
        if (access_code) {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

            visitorCodeData = {
                visitor_access_code: access_code,
                visitor_access_granted_at: now.toISOString(),
                visitor_access_expires_at: expiresAt.toISOString(),
            };

            await supabase
                .from("demo_sessions")
                .update({
                    ...visitorCodeData,
                    status: "visitor_access_granted",
                    updated_at: new Date().toISOString()
                })
                .eq("session_token", session_token);
        }
    }

    runTextractAnalyzeIdWithTimeout(imageBuffer, 15000).then(async (result) => {
        let extractedInfoUpdate = {
            text: result.ok ? "Textract success" : "Textract failed",
            textract_ok: result.ok,
            textract_error: result.ok ? null : result.error,
            textract: result.ok ? result.data : null,
            guest_index: guestIndex,
        };

        if (isVisitorSession) {
            extractedInfoUpdate.type = "visitor";
            if (visitorCodeData?.visitor_access_code) {
                extractedInfoUpdate.access_code = visitorCodeData.visitor_access_code;
            }
        }

        await supabase
            .from("demo_sessions")
            .update({
                extracted_info: extractedInfoUpdate,
                updated_at: new Date().toISOString(),
            })
            .eq("session_token", session_token);
    });

    return res.json({
        success: true,
        guest_index: guestIndex,
        visitor_access_code: visitorCodeData?.visitor_access_code,
        visitor_access_granted_at: visitorCodeData?.visitor_access_granted_at,
        visitor_access_expires_at: visitorCodeData?.visitor_access_expires_at,
    });
}

export async function handleVerifyFace(req, res) {
    const { session_token, selfie_data } = req.body || {};

    if (!session_token) return res.status(400).json({ error: "Session token required" });
    if (!selfie_data) return res.status(400).json({ error: "selfie_data required" });

    const { data: session, error: sessionError } = await supabase
        .from("demo_sessions")
        .select("*")
        .eq("session_token", session_token)
        .single();

    if (sessionError || !session) return res.status(404).json({ error: "Session not found" });

    const expected = clampInt(session.expected_guest_count, 1, 10);
    const verifiedBefore = clampInt(session.verified_guest_count, 0, 10);
    const guestIndex = clampInt(verifiedBefore + 1, 1, expected);
    const docKey = `demo/${session_token}/document_${guestIndex}.jpg`;

    let docBuffer;
    try {
        const docObj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: docKey }));
        docBuffer = await streamToBuffer(docObj.Body);
    } catch {
        return res.status(400).json({ error: "ID document not found. Upload it first." });
    }

    const selfieBase64 = normalizeBase64(selfie_data);
    const selfieBuffer = Buffer.from(selfieBase64, "base64");
    const selfieKey = `demo/${session_token}/selfie_${guestIndex}.jpg`;

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET, Key: selfieKey, Body: selfieBuffer, ContentType: "image/jpeg",
    }));

    const livenessResult = await rekognition.send(new DetectFacesCommand({
        Image: { Bytes: selfieBuffer }, Attributes: ["ALL"],
    }));

    const face = livenessResult.FaceDetails?.[0];
    const isLive = Boolean(face?.EyesOpen?.Value) && (face?.Quality?.Brightness || 0) > 40;
    const livenessScore = (face?.Confidence || 0) / 100;

    const compareResult = await rekognition.send(new CompareFacesCommand({
        SourceImage: { Bytes: selfieBuffer }, TargetImage: { Bytes: docBuffer }, SimilarityThreshold: 80,
    }));

    const similarity = (compareResult.FaceMatches?.[0]?.Similarity || 0) / 100;
    const verificationScore = (isLive ? 0.4 : 0) + livenessScore * 0.3 + similarity * 0.3;
    const guest_verified = isLive && similarity >= 0.65;

    const verifiedAfter = guest_verified ? Math.min(verifiedBefore + 1, expected) : verifiedBefore;
    const requiresAdditionalGuest = verifiedAfter < expected;
    const next_step = guest_verified ? (requiresAdditionalGuest ? "document" : "results") : "selfie";

    await supabase.from("demo_sessions").update({
        status: guest_verified ? (requiresAdditionalGuest ? "partial_verified" : "verified") : "failed",
        current_step: next_step,
        selfie_url: `s3://${BUCKET}/${selfieKey}`,
        is_verified: verifiedAfter >= expected,
        verification_score: verificationScore,
        liveness_score: livenessScore,
        face_match_score: similarity,
        verified_guest_count: verifiedAfter,
        updated_at: new Date().toISOString(),
    }).eq("session_token", session_token);

    let access_code = null;
    if (verifiedAfter >= expected) {
        access_code = await getAccessCode();
        if (access_code) {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
            await supabase.from("demo_sessions").update({
                room_access_code: access_code,
                visitor_access_granted_at: now.toISOString(),
                visitor_access_expires_at: expiresAt.toISOString(),
            }).eq("session_token", session_token);
        }
    }

    return res.json({ success: true, guest_verified, next_step, access_code, room_access_code: access_code });
}
