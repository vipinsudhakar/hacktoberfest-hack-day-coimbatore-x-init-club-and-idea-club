import { UPLOAD_LIMITS, type ExtractRequest, type ExtractResponse } from "@/lib/api";
import { generateJson } from "@/lib/gemma";
import { describeError, errorResponse } from "@/lib/http";
import { EXTRACT_PROMPT, profileSchema } from "@/lib/prompts";

export const maxDuration = 60;

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
    const profile = await generateJson(EXTRACT_PROMPT, profileSchema, images);
    return Response.json({ profile } satisfies ExtractResponse);
  } catch (err) {
    console.error("extract failed:", err);
    return errorResponse(`Gemma couldn't read the reports: ${describeError(err)}`, 502);
  }
}
