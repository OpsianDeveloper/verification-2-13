import { normalizeKey } from "./utils";

export function parseMrzTD3(mrz) {
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

export function parseAnalyzeIdFields(fields = []) {
    const raw = {};
    for (const f of fields) {
        const key = normalizeKey(f?.Type?.Text);
        const val = f?.ValueDetection?.Text;
        if (key && val) raw[key] = val;
    }

    const first_name = raw.first_name || raw.firstname || raw.given_name || raw.givenname || null;
    const middle_name = raw.middle_name || raw.middlename || raw.second_name || raw.secondname || null;
    const last_name = raw.last_name || raw.lastname || raw.surname || raw.family_name || raw.familyname || null;

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
