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
export class RequestError extends Error {}

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
    try {
      const data: unknown = await res.json();
      if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
        message = data.error;
      }
    } catch {
      // Not JSON (e.g. a platform error page) – fall back to a generic message.
    }
    throw new RequestError(message || fallbackMessage(res.status));
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
