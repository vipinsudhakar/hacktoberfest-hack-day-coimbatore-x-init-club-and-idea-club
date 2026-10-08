import { GoogleGenAI, ThinkingLevel, createPartFromBase64, type Part } from "@google/genai";
import type { z } from "zod";
import type { ImageUpload } from "./api";
import { suggestedRetrySeconds } from "./http";

// Gemma 4 is an open-weight model (Apache 2.0); here it is served through the Gemini API.
export const GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

// All attempts for one request share a time budget that stays under the route's maxDuration,
// so a slow reply or a retry ends in our own JSON error instead of a platform timeout page.
const DEFAULT_BUDGET_MS = 55_000; // for routes with maxDuration = 60
const MIN_CALL_MS = 5_000;

let clients: GoogleGenAI[] | undefined;
// Keys the API rejected (deleted or revoked); the next listed key takes over.
const rejected = new Set<GoogleGenAI>();
// Flipped off if the API rejects JSON mode for Gemma; prompts already ask for JSON either way.
let jsonModeSupported = true;

function getClients(): GoogleGenAI[] {
  if (!clients) {
    // One key, or several separated by commas as backups in case a key is deleted or revoked.
    const keys = (process.env.GEMINI_API_KEY ?? "").split(",").map((k) => k.trim()).filter(Boolean);
    if (!keys.length) {
      throw new Error("GEMINI_API_KEY is not set. Copy .env.example to .env.local and add your key.");
    }
    clients = keys.map((apiKey) => new GoogleGenAI({ apiKey }));
  }
  return clients;
}

/** The first key the API hasn't rejected; later keys are only backups for a deleted or revoked key. */
function pickClient(): GoogleGenAI {
  const all = getClients();
  return all.find((c) => !rejected.has(c)) ?? all[0];
}

/** Pulls the JSON value out of a reply that may be wrapped in a code fence or extra text. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/[[{]/);
  const end = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** How long to wait before retrying: the delay a 429 asks for, or a short backoff. */
function retryWaitMs(message: string, attempt: number): number {
  const asked = suggestedRetrySeconds(message);
  return asked != null ? asked * 1000 + 500 : 2000 * (attempt + 1);
}

async function callGemma(parts: Part[], deadline: number): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_CALL_MS) throw new Error("Gemma request timed out: no time left in this request.");
    const client = pickClient();
    try {
      const response = await client.models.generateContent({
        model: GEMMA_MODEL,
        contents: [{ role: "user", parts }],
        config: {
          temperature: 0.1,
          // Default thinking made rule checks take minutes; minimal thinking answers in ~20-30 s
          // and the prompts already spell out the medical reasoning steps.
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          httpOptions: { timeout: remaining },
          ...(jsonModeSupported ? { responseMimeType: "application/json" } : {}),
        },
      });
      return response.text ?? "";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (jsonModeSupported && /json mode|response_?mime_?type/i.test(message)) {
        jsonModeSupported = false;
        continue;
      }
      if (/\b(401|403)\b|api key not valid|permission.?denied|unauthenticated/i.test(message)) {
        rejected.add(client);
        if (getClients().some((c) => !rejected.has(c))) continue; // try another key straight away
      }
      const retryable = /\b(429|500|502|503|504)\b|overloaded|unavailable|resource.?exhausted/i.test(message);
      const wait = retryWaitMs(message, attempt);
      if (!retryable || attempt >= 3 || deadline - Date.now() - wait < MIN_CALL_MS) throw err;
      await sleep(wait);
    }
  }
}

/**
 * Sends the prompt (plus any images) to Gemma and validates the JSON reply.
 * A reply that fails validation is retried once with the validation error attached,
 * as long as the request's time budget allows another call.
 */
export async function generateJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  images: ImageUpload[] = [],
  budgetMs = DEFAULT_BUDGET_MS,
): Promise<T> {
  const deadline = Date.now() + budgetMs;
  const imageParts = images.map((img) => createPartFromBase64(img.data, img.mimeType));
  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callGemma([...imageParts, { text: feedback ? `${prompt}\n\n${feedback}` : prompt }], deadline);
    try {
      return schema.parse(JSON.parse(extractJson(text)));
    } catch (err) {
      const reason = err instanceof Error ? err.message.slice(0, 400) : "invalid JSON";
      feedback = `Your previous reply could not be used (${reason}). Reply again with only valid JSON in the requested shape.`;
    }
  }
  throw new Error("Gemma did not return usable JSON after a retry.");
}
