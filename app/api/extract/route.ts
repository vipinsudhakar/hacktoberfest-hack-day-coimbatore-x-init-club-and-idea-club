import { UPLOAD_LIMITS, type ExtractResponse } from "@/lib/api";
import { generateJson } from "@/lib/gemma";
import { errorResponse, gemmaErrorResponse } from "@/lib/http";
import { checkDocuments } from "@/lib/documents";
import { EXTRACT_PROMPT, extractReplySchema } from "@/lib/prompts";
import { extractRequestSchema, readBody } from "@/lib/requests";

// Reading a full report is the heaviest call; on Vercel it can take close to a minute.
export const maxDuration = 120;
const GEMMA_BUDGET_MS = 110_000;
// The image budget plus room for the JSON around it; larger bodies are refused before parsing.
const MAX_BODY_BYTES = 4_600_000;
const TOO_LARGE = "The images are too large. Try fewer or smaller photos.";

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (declaredLength > MAX_BODY_BYTES) return errorResponse(TOO_LARGE, 413);

  const parsed = await readBody(request, extractRequestSchema, "Send the report images as JSON.");
  if (!parsed.ok) return parsed.response;
  const { images } = parsed.data;
  if (images.reduce((total, img) => total + img.data.length, 0) > UPLOAD_LIMITS.maxTotalBase64Chars) {
    return errorResponse(TOO_LARGE, 413);
  }

  try {
    const { documents, ...profile } = await generateJson(
      EXTRACT_PROMPT,
      extractReplySchema,
      images,
      GEMMA_BUDGET_MS,
      request.signal,
    );
    const check = checkDocuments(documents, images.length);
    if (!check.ok) return errorResponse(check.message, 422);
    return Response.json({ profile, documents } satisfies ExtractResponse);
  } catch (err) {
    console.error("extract failed:", err);
    return gemmaErrorResponse(err, "try again, or use clearer photos of the reports");
  }
}
