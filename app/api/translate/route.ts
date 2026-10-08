import type { TranslateResponse } from "@/lib/api";
import { generateJson } from "@/lib/gemma";
import { gemmaErrorResponse } from "@/lib/http";
import { translatePrompt, translateSchema } from "@/lib/prompts";
import { readBody, translateRequestSchema } from "@/lib/requests";

export const maxDuration = 60;

// Small batches answer faster and stay well inside the time budget; they run in parallel.
const TEXTS_PER_CALL = 25;

export async function POST(request: Request) {
  const parsed = await readBody(request, translateRequestSchema, "Send the texts to translate as JSON.");
  if (!parsed.ok) return parsed.response;
  const { language, texts } = parsed.data;

  // Stops the other batches when one fails or the client goes away, so no Gemma quota is wasted.
  const controller = new AbortController();
  const signal = AbortSignal.any([request.signal, controller.signal]);
  try {
    const batches = Array.from({ length: Math.ceil(texts.length / TEXTS_PER_CALL) }, (_, i) =>
      texts.slice(i * TEXTS_PER_CALL, (i + 1) * TEXTS_PER_CALL),
    );
    const replies = await Promise.all(
      batches.map((batch) =>
        generateJson(translatePrompt(language, batch), translateSchema(batch.length), [], undefined, signal).catch(
          (err: unknown) => {
            controller.abort();
            throw err;
          },
        ),
      ),
    );
    return Response.json({ texts: replies.flatMap((r) => r.translations) } satisfies TranslateResponse);
  } catch (err) {
    console.error("translate failed:", err);
    return gemmaErrorResponse(err, "try the language switch again");
  }
}
