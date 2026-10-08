import type { ApiError } from "./api";

const RATE_LIMITED = /\b429\b|quota|resource.?exhausted|rate.?limit/i;
const TIMED_OUT = /time.?out|timed out|aborted|deadline/i;

export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message } satisfies ApiError, { status });
}

export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** The wait Gemma's rate-limit error asks for (its retryDelay), in seconds, or null if it doesn't say. */
export function suggestedRetrySeconds(message: string): number | null {
  const asked = message.match(/retryDelay"?:\s*"(\d+(?:\.\d+)?)s"/);
  return asked ? Number(asked[1]) : null;
}

/** Seconds the client should wait before retrying: Gemma's suggestion capped at a minute, else 20. */
export function retryAfterSeconds(message: string): number {
  return Math.min(60, Math.ceil(suggestedRetrySeconds(message) ?? 20));
}

/** Gemma's error as a response: 429 with retryAfterSeconds for rate limits, so the UI can retry by itself. */
export function gemmaErrorResponse(err: unknown, nextStep: string): Response {
  const message = describeError(err);
  if (RATE_LIMITED.test(message)) {
    const wait = retryAfterSeconds(message);
    return Response.json(
      { error: gemmaErrorMessage(err, nextStep), retryAfterSeconds: wait } satisfies ApiError,
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }
  return errorResponse(gemmaErrorMessage(err, nextStep), 502);
}

/** A message a patient can act on; the technical details go to the server log instead. */
export function gemmaErrorMessage(err: unknown, nextStep: string): string {
  const message = describeError(err);
  if (RATE_LIMITED.test(message)) {
    return `Gemma's free usage limit is busy right now. Wait a minute, then ${nextStep}.`;
  }
  if (TIMED_OUT.test(message)) {
    return `Gemma took too long to answer. Please ${nextStep}.`;
  }
  return `Gemma couldn't finish this step. Please ${nextStep}.`;
}
