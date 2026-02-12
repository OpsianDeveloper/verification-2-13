
const CLIENT_ID = process.env.CLOUDBEDS_CLIENT_ID;
const REDIRECT_URI = process.env.CLOUDBEDS_REDIRECT_URI;
const SCOPE = "read:reservation,write:reservation"; // Adjust based on needs

export default function handler(req, res) {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: SCOPE,
        // state: "random_string" // Optional but recommended for CSRF
    });

    const authUrl = `https://hotels.cloudbeds.com/api/v1.1/oauth?${params.toString()}`;
    res.redirect(authUrl);
}
