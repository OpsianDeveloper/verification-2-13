import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client (for token storage)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CLOUDBEDS_API_BASE = "https://api.cloudbeds.com/api/v1.2";
const TOKEN_TABLE = "cloudbeds_tokens"; // We need to create this

// Use provided credentials (must be set in environment variables)
const CLIENT_ID = process.env.CLOUDBEDS_CLIENT_ID;
const CLIENT_SECRET = process.env.CLOUDBEDS_CLIENT_SECRET;
const REDIRECT_URI = process.env.CLOUDBEDS_REDIRECT_URI;

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    if (process.env.NODE_ENV === 'production') {
        console.error("Missing Cloudbeds environment variables: CLOUDBEDS_CLIENT_ID, CLOUDBEDS_CLIENT_SECRET, CLOUDBEDS_REDIRECT_URI");
    }
}

/**
 * Get the current access token from Supabase.
 * If expired, refresh it.
 */
export async function getAccessToken() {
    const { data, error } = await supabase
        .from(TOKEN_TABLE)
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        throw new Error("No Cloudbeds token found. Please run /api/cloudbeds/auth first.");
    }

    // Check expiration (buffer 5 mins)
    const now = Date.now();
    const expiresAt = new Date(data.expires_at).getTime();

    if (now >= expiresAt - 5 * 60 * 1000) {
        console.log("Refreshing Cloudbeds token...");
        return await refreshAccessToken(data.refresh_token);
    }

    return data.access_token;
}

/**
 * Exchange refresh token for new access token
 */
async function refreshAccessToken(refreshToken) {
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("refresh_token", refreshToken);

    const res = await fetch("https://api.cloudbeds.com/api/v1.1/access_token", {
        method: "POST",
        body: params,
    });

    const json = await res.json();
    if (!res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(json)}`);

    return await saveToken(json);
}

/**
 * Save token to Supabase
 */
export async function saveToken(tokenData) {
    // tokenData: { access_token, token_type, expires_in, refresh_token }
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const { data, error } = await supabase.from(TOKEN_TABLE).upsert({
        id: 1, // Singleton row
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
    }).select().single();

    if (error) throw new Error(`Failed to save token: ${error.message}`);
    return tokenData.access_token;
}

/**
 * Fetch reservation details by ID
 */
export async function getReservation(reservationId) {
    const token = await getAccessToken();

    const res = await fetch(`${CLOUDBEDS_API_BASE}/getReservation?reservationID=${reservationId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });

    const json = await res.json();
    if (!json.success) {
        throw new Error(`Cloudbeds API Error: ${json.message}`);
    }
    return json.data;
}

/**
 * getReservations (plural) by check-in date window or modification time
 */
export async function getReservations({ checkInFrom, checkInTo, modifiedSince }) {
    const token = await getAccessToken();
    const params = new URLSearchParams();
    if (checkInFrom) params.append("checkInFrom", checkInFrom);
    if (checkInTo) params.append("checkInTo", checkInTo);
    // Cloudbeds filter logic varies, checking docs... usually filter by status too

    const url = `${CLOUDBEDS_API_BASE}/getReservations?${params.toString()}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    return await res.json();
}

/**
 * Search for a reservation by Reference ID (OTA ID)
 */
export async function findReservationByReference(referenceId) {
    const token = await getAccessToken();

    // Cloudbeds getReservations can filter or we can search. 
    // Usually, we search by thirdPartyIdentifier.
    const url = `${CLOUDBEDS_API_BASE}/getReservations?queryString=${referenceId}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const json = await res.json();
    if (!json.success || !json.data || json.data.length === 0) {
        return null;
    }

    // Return the first match
    return json.data[0];
}
