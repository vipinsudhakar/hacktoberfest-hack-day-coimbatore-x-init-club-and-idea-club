import type { ApiError } from "./api";

export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message } satisfies ApiError, { status });
}

export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
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
