import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CLIENT_ID = process.env.CLOUDBEDS_CLIENT_ID;
const CLIENT_SECRET = process.env.CLOUDBEDS_CLIENT_SECRET;
const REDIRECT_URI = process.env.CLOUDBEDS_REDIRECT_URI;
const TOKEN_TABLE = "cloudbeds_tokens";

export default async function handler(req, res) {
    const { code, error } = req.query;

    if (error) {
        return res.status(400).json({ error: `OAuth Error: ${error}` });
    }

    if (!code) {
        return res.status(400).json({ error: "Missing authorization code" });
    }

    try {
        const params = new URLSearchParams();
        params.append("grant_type", "authorization_code");
        params.append("client_id", CLIENT_ID);
        params.append("client_secret", CLIENT_SECRET);
        params.append("redirect_uri", REDIRECT_URI);
        params.append("code", code);

        const tokenRes = await fetch("https://api.cloudbeds.com/api/v1.1/access_token", {
            method: "POST",
            body: params,
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
            throw new Error(`Failed to exchange token: ${JSON.stringify(tokenData)}`);
        }

        // Save to Supabase
        // tokenData: { access_token, token_type, expires_in, refresh_token, scope }

        // We assume the table is created. If not, this will fail.
        // The table needs: id (int PK), access_token (text), refresh_token (text), expires_at (timestamptz), updated_at (timestamptz)

        const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

        const { error: dbError } = await supabase.from(TOKEN_TABLE).upsert({
            id: 1, // Singleton row for simplicity
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
        });

        if (dbError) {
            console.error("DB Save Error", dbError);
            return res.status(500).json({ error: "Failed to save token to database", details: dbError });
        }

        return res.status(200).send("Cloudbeds connected successfully! You can close this window.");

    } catch (err) {
        console.error("Callback Error", err);
        res.status(500).json({ error: err.message });
    }
}
