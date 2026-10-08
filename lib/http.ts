import type { ApiError } from "./api";

export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message } satisfies ApiError, { status });
}

export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Gemma's error as a response: 429 with retryAfterSeconds for rate limits, so the UI can retry by itself. */
export function gemmaErrorResponse(err: unknown, nextStep: string): Response {
  const message = describeError(err);
  if (/429|quota|resource.?exhausted|rate.?limit/i.test(message)) {
    const asked = message.match(/retryDelay"?:s*"(d+(?:.d+)?)s"/);
    const retryAfterSeconds = Math.min(60, Math.ceil(asked ? Number(asked[1]) : 20));
    return Response.json(
      { error: gemmaErrorMessage(err, nextStep), retryAfterSeconds } satisfies ApiError,
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }
  return errorResponse(gemmaErrorMessage(err, nextStep), 502);
}

/** A message a patient can act on; the technical details go to the server log instead. */
export function gemmaErrorMessage(err: unknown, nextStep: string): string {
  const message = describeError(err);
  if (/429|quota|resource.?exhausted|rate.?limit/i.test(message)) {
    return `Gemma's free usage limit is busy right now. Wait a minute, then ${nextStep}.`;
  }
  if (/time.?out|timed out|aborted|deadline/i.test(message)) {
    return `Gemma took too long to answer. Please ${nextStep}.`;
  }
  return `Gemma couldn't finish this step. Please ${nextStep}.`;
}
