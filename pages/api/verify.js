// verify.js router

// Increase body size limit for large image payloads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

function setCors(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version"
  );
}


import { handleStart, handleStartVisitor, handleGetSession, handleLogConsent } from "../../lib/verification/session-actions";
import { handleUpdateGuest, handleTm30Update } from "../../lib/verification/guest-actions";
import {
  handleValidateDocument,
  handleValidateSelfie,
  handleUploadDocument,
  handleVerifyFace
} from "../../lib/verification/verification-actions";

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
    switch (action) {
      case "start":
        return await handleStart(req, res);
      case "start_visitor":
        return await handleStartVisitor(req, res);
      case "get_session":
        return await handleGetSession(req, res);
      case "log_consent":
        return await handleLogConsent(req, res);
      case "update_guest":
        return await handleUpdateGuest(req, res);
      case "tm30_update":
        return await handleTm30Update(req, res);
      case "validate_document":
        return await handleValidateDocument(req, res);
      case "validate_selfie":
        return await handleValidateSelfie(req, res);
      case "upload_document":
        return await handleUploadDocument(req, res);
      case "verify_face":
        return await handleVerifyFace(req, res);
      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("Error in verify handler:", error);
    return res.status(500).json({ error: error?.message || "Unknown server error" });
  }
}
