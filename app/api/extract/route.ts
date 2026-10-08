import { UPLOAD_LIMITS, type ExtractRequest, type ExtractResponse } from "@/lib/api";
import { generateJson } from "@/lib/gemma";
import { errorResponse, gemmaErrorResponse } from "@/lib/http";
import { checkDocuments } from "@/lib/documents";
import { EXTRACT_PROMPT, extractReplySchema } from "@/lib/prompts";

// Reading a full report is the heaviest call; on Vercel it can take close to a minute.
export const maxDuration = 120;
const GEMMA_BUDGET_MS = 110_000;

const IMAGE_TYPES = /^image\/(png|jpe?g|webp)$/;

export async function POST(request: Request) {
  let body: Partial<ExtractRequest>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Send the report images as JSON.", 400);
  }

  const images = Array.isArray(body.images) ? body.images : [];
  if (!images.length) return errorResponse("Add at least one report image.", 400);
  if (images.length > UPLOAD_LIMITS.maxImages) {
    return errorResponse(`Upload at most ${UPLOAD_LIMITS.maxImages} images.`, 400);
  }
  if (!images.every((img) => typeof img?.data === "string" && IMAGE_TYPES.test(img?.mimeType ?? ""))) {
    return errorResponse("Reports must be JPG, PNG or WebP images.", 400);
  }
  if (images.reduce((total, img) => total + img.data.length, 0) > UPLOAD_LIMITS.maxTotalBase64Chars) {
    return errorResponse("The images are too large. Try fewer or smaller photos.", 413);
  }

  try {
    const { documents, ...profile } = await generateJson(EXTRACT_PROMPT, extractReplySchema, images, GEMMA_BUDGET_MS);
    const check = checkDocuments(documents, images.length);
    if (!check.ok) return errorResponse(check.message, 422);
    return Response.json({ profile, documents } satisfies ExtractResponse);
  } catch (err) {
    console.error("extract failed:", err);
    return gemmaErrorResponse(err, "try again, or use clearer photos of the reports");
  }
}
