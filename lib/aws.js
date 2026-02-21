import { S3Client } from "@aws-sdk/client-s3";
import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { TextractClient, AnalyzeIDCommand } from "@aws-sdk/client-textract";
import { parseAnalyzeIdFields } from "./id-parser";

const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1";
export const BUCKET = process.env.S3_BUCKET_NAME;

export const s3 = new S3Client({ region: AWS_REGION });
export const rekognition = new RekognitionClient({ region: AWS_REGION });
export const textract = new TextractClient({ region: AWS_REGION });

export async function runTextractAnalyzeIdWithTimeout(imageBuffer, timeoutMs = 15000) {
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
