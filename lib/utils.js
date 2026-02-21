import crypto from "crypto";

export function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

export function normalizeBase64(base64OrDataUrl) {
    if (typeof base64OrDataUrl !== "string") return null;
    if (base64OrDataUrl.startsWith("data:image/")) {
        return base64OrDataUrl.replace(/^data:image\/\w+;base64,/, "");
    }
    return base64OrDataUrl;
}

export function normalizeGuestName(name) {
    return String(name || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[^\p{L}\p{N}\s]/gu, "");
}

export function normalizeReservationNumber(v) {
    return String(v || "").toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
}

export function normalizeKey(k = "") {
    return String(k).trim().toLowerCase().replace(/\s+/g, "_");
}

export function toIntOrNull(v) {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
}

export function clampInt(n, min, max) {
    const x = toIntOrNull(n);
    if (x === null) return min;
    return Math.min(Math.max(x, min), max);
}

export async function streamToBuffer(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}
