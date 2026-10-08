import type { TranslateRequest, TranslateResponse } from "@/lib/api";
import { generateJson } from "@/lib/gemma";
import { errorResponse, gemmaErrorResponse } from "@/lib/http";
import { translatePrompt, translateSchema } from "@/lib/prompts";

export const maxDuration = 60;

const MAX_TEXTS = 120;
const MAX_TEXT_LENGTH = 600;
// Small batches answer faster and stay well inside the time budget; they run in parallel.
const TEXTS_PER_CALL = 25;

export async function POST(request: Request) {
  let body: Partial<TranslateRequest>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Send the texts to translate as JSON.", 400);
  }
  const { language, texts } = body;
  if (language !== "ta" && language !== "hi") return errorResponse("Choose Tamil (ta) or Hindi (hi).", 400);
  if (!Array.isArray(texts) || !texts.length || texts.length > MAX_TEXTS) {
    return errorResponse(`Send between 1 and ${MAX_TEXTS} texts.`, 400);
  }
  if (!texts.every((t) => typeof t === "string" && t.length <= MAX_TEXT_LENGTH)) {
    return errorResponse("Each text must be a short string.", 400);
  }

  try {
    const batches = Array.from({ length: Math.ceil(texts.length / TEXTS_PER_CALL) }, (_, i) =>
      texts.slice(i * TEXTS_PER_CALL, (i + 1) * TEXTS_PER_CALL),
    );
    const replies = await Promise.all(
      batches.map((batch) => generateJson(translatePrompt(language, batch), translateSchema(batch.length))),
    );
    return Response.json({ texts: replies.flatMap((r) => r.translations) } satisfies TranslateResponse);
  } catch (err) {
    console.error("translate failed:", err);
    return gemmaErrorResponse(err, "try the language switch again");
  }
}
