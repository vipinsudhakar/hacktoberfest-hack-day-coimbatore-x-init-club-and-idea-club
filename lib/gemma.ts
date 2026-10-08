import { GoogleGenAI, ThinkingLevel, createPartFromBase64, type Part } from "@google/genai";
import type { z } from "zod";
import type { ImageUpload } from "./api";

// Gemma 4 is an open-weight model (Apache 2.0); here it is served through the Gemini API.
export const GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma-4-26b-a4b-it";

let client: GoogleGenAI | undefined;
// Flipped off if the API rejects JSON mode for Gemma; prompts already ask for JSON either way.
let jsonModeSupported = true;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Copy .env.example to .env.local and add your key.");
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
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

async function callGemma(parts: Part[]): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await getClient().models.generateContent({
        model: GEMMA_MODEL,
        contents: [{ role: "user", parts }],
        config: {
          temperature: 0.1,
          // Default thinking made rule checks take minutes; minimal thinking answers in ~20-30 s
          // and the prompts already spell out the medical reasoning steps.
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          // Fail before the route's 60 s limit so the UI can offer a retry.
          httpOptions: { timeout: 50_000 },
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
      const retryable = /\b(429|500|502|503|504)\b|overloaded|unavailable|resource.?exhausted/i.test(message);
      if (!retryable || attempt >= 3) throw err;
      await sleep(2000 * (attempt + 1));
    }
  }
}

/**
 * Sends the prompt (plus any images) to Gemma and validates the JSON reply.
 * A reply that fails validation is retried once with the validation error attached.
 */
export async function generateJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  images: ImageUpload[] = [],
): Promise<T> {
  const imageParts = images.map((img) => createPartFromBase64(img.data, img.mimeType));
  let feedback = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callGemma([...imageParts, { text: feedback ? `${prompt}\n\n${feedback}` : prompt }]);
    try {
      return schema.parse(JSON.parse(extractJson(text)));
    } catch (err) {
      const reason = err instanceof Error ? err.message.slice(0, 400) : "invalid JSON";
      feedback = `Your previous reply could not be used (${reason}). Reply again with only valid JSON in the requested shape.`;
    }
  }
  throw new Error("Gemma did not return usable JSON after a retry.");
}
