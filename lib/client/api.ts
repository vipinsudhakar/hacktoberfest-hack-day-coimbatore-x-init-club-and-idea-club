import type {
  EvaluateRequest,
  EvaluateResponse,
  ExtractRequest,
  ExtractResponse,
  ImageUpload,
  TrialsRequest,
  TrialsResponse,
} from "@/lib/api";
import type { PatientProfile, Trial } from "@/lib/types";

/** An API call that failed; `message` is safe to show to the user. */
export class RequestError extends Error {
  /** HTTP status, or null when the server couldn't be reached. */
  status: number | null;
  /** Set on 429s from Gemma's free tier: the same request may be retried after this many seconds. */
  retryAfterSeconds: number | null;

  constructor(message: string, status: number | null = null, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Seconds to wait before retrying, when the failure was a rate limit that can be retried. */
export function retryAfter(error: unknown): number | null {
  return error instanceof RequestError && error.status === 429 ? error.retryAfterSeconds : null;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something unexpected went wrong.";
}

function fallbackMessage(status: number): string {
  if (status === 404) return "This part of TrialBridge isn't available right now.";
  if (status === 413) return "The reports are too large to send. Try fewer pages at a time.";
  if (status === 429) return "Too many requests right now. Please wait a moment and try again.";
  if (status >= 500) return `Something went wrong on our side (error ${status}).`;
  return `The request couldn't be completed (error ${status}).`;
}

async function postJson<TResponse>(path: string, body: unknown, signal?: AbortSignal): Promise<TResponse> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new RequestError("We couldn't reach TrialBridge. Check your internet connection and try again.");
  }
  if (!res.ok) {
    let message = "";
    let retryAfterSeconds: number | null = null;
    try {
      const data: unknown = await res.json();
      if (data && typeof data === "object") {
        if ("error" in data && typeof data.error === "string") message = data.error;
        if ("retryAfterSeconds" in data && typeof data.retryAfterSeconds === "number") {
          retryAfterSeconds = data.retryAfterSeconds;
        }
      }
    } catch {
      // Not JSON (e.g. a platform error page) – fall back to a generic message.
    }
    if (retryAfterSeconds === null && res.status === 429) {
      const header = Number(res.headers.get("Retry-After"));
      if (Number.isFinite(header) && header > 0) retryAfterSeconds = header;
    }
    throw new RequestError(message || fallbackMessage(res.status), res.status, retryAfterSeconds);
  }
  try {
    return (await res.json()) as TResponse;
  } catch {
    throw new RequestError("TrialBridge sent back an answer we couldn't read. Please try again.");
  }
}

export function extractProfile(images: ImageUpload[], signal?: AbortSignal) {
  return postJson<ExtractResponse>("/api/extract", { images } satisfies ExtractRequest, signal);
}

export function findTrials(profile: PatientProfile, signal?: AbortSignal) {
  return postJson<TrialsResponse>("/api/trials", { profile } satisfies TrialsRequest, signal);
}

export function evaluateTrial(profile: PatientProfile, trial: Trial, signal?: AbortSignal) {
  return postJson<EvaluateResponse>("/api/evaluate", { profile, trial } satisfies EvaluateRequest, signal);
}
