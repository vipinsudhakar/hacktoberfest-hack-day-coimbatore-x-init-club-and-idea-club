import { createHash } from "node:crypto";
import { GoogleGenAI, ThinkingLevel, createPartFromBase64, type Part } from "@google/genai";
import type { z } from "zod";
import type { ImageUpload } from "./api";
import { suggestedRetrySeconds } from "./http.ts";

// Gemma 4 is an open-weight model (Apache 2.0); here it is served through the Gemini API.
export const GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

// All attempts for one request share a time budget that stays under the route's maxDuration,
// so a slow reply or a retry ends in our own JSON error instead of a platform timeout page.
const DEFAULT_BUDGET_MS = 55_000; // for routes with maxDuration = 60
const MIN_CALL_MS = 5_000;

let clients: GoogleGenAI[] | undefined;
// When the API rejected each key (deleted or revoked); the next listed key takes over.
const rejectedAt = new Map<GoogleGenAI, number>();
// When the API last rejected JSON mode for Gemma; prompts already ask for JSON either way.
let jsonModeRejectedAt: number | undefined;
// A rejected key or JSON mode gets another chance after this, in case the problem was temporary.
const RECHECK_AFTER_MS = 10 * 60 * 1000;

const recently = (at: number | undefined) => at !== undefined && Date.now() - at < RECHECK_AFTER_MS;
const isRejected = (client: GoogleGenAI) => recently(rejectedAt.get(client));

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
  return all.find((c) => !isRejected(c)) ?? all[0];
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

// Recent validated answers, kept in memory while the server instance stays warm.
const MAX_CACHED_ANSWERS = 300;
const CACHE_TTL_MS = 60 * 60 * 1000; // answers contain medical details, so they are forgotten after an hour
const answers = new Map<string, { value: unknown; at: number }>();

function remember(key: string, value: unknown) {
  const now = Date.now();
  answers.delete(key); // re-adding moves the key to the end, so the map stays ordered oldest first
  // Expired answers sit at the front: drop them before making room.
  for (const [oldKey, entry] of answers) {
    if (now - entry.at <= CACHE_TTL_MS) break;
    answers.delete(oldKey);
  }
  if (answers.size >= MAX_CACHED_ANSWERS) answers.delete(answers.keys().next().value as string);
  answers.set(key, { value, at: now });
}

function recall(key: string): { value: unknown } | null {
  const hit = answers.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    answers.delete(key);
    return null;
  }
  return hit;
}

/** How long to wait before retrying: the delay a 429 asks for, or a short backoff. */
function retryWaitMs(message: string, attempt: number): number {
  const asked = suggestedRetrySeconds(message);
  return asked != null ? asked * 1000 + 500 : 2000 * (attempt + 1);
}

async function callGemma(parts: Part[], deadline: number, signal?: AbortSignal): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) throw new Error("Gemma request aborted: the client went away.");
    const remaining = deadline - Date.now();
    if (remaining < MIN_CALL_MS) throw new Error("Gemma request timed out: no time left in this request.");
    const client = pickClient();
    const jsonMode = !recently(jsonModeRejectedAt);
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
          ...(signal ? { abortSignal: signal } : {}),
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        },
      });
      return response.text ?? "";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (jsonMode && /json mode|response_?mime_?type/i.test(message)) {
        jsonModeRejectedAt = Date.now();
        continue;
      }
      if (/\b(401|403)\b|api key not valid|permission.?denied|unauthenticated/i.test(message)) {
        rejectedAt.set(client, Date.now());
        if (getClients().some((c) => !isRejected(c))) continue; // try another key straight away
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
  signal?: AbortSignal,
): Promise<T> {
  // The same reports or the same profile + trial give the same answer: reuse it instead of spending quota.
  const cacheKey = createHash("sha256")
    .update(GEMMA_MODEL)
    .update(prompt)
    .update(images.map((img) => img.data).join("|"))
    .digest("hex");
  const cached = recall(cacheKey);
  if (cached) return cached.value as T;

  const deadline = Date.now() + budgetMs;
  const imageParts = images.map((img) => createPartFromBase64(img.data, img.mimeType));
  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callGemma([...imageParts, { text: feedback ? `${prompt}\n\n${feedback}` : prompt }], deadline, signal);
    try {
      const parsed = schema.parse(JSON.parse(extractJson(text)));
      remember(cacheKey, parsed);
      return parsed;
    } catch (err) {
      const reason = err instanceof Error ? err.message.slice(0, 400) : "invalid JSON";
      feedback = `Your previous reply could not be used (${reason}). Reply again with only valid JSON in the requested shape.`;
    }
  }
  throw new Error("Gemma did not return usable JSON after a retry.");
}
