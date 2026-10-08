import type { PatientProfile, Trial, TrialMatch } from "./types";

// Request and response bodies for the app's API routes, shared by the server and the UI.
// Every route answers errors as { error: string } with a 4xx/5xx status.

/** A report image, base64-encoded without the "data:...;base64," prefix. */
export interface ImageUpload {
  data: string;
  mimeType: string;
}

/** POST /api/extract – Gemma 4 reads report images into a patient profile. */
export interface ExtractRequest {
  images: ImageUpload[];
}
export interface ExtractResponse {
  profile: PatientProfile;
}

/** POST /api/trials – recruiting trials in India for the profile's cancer, filtered by age and sex. */
export interface TrialsRequest {
  profile: PatientProfile;
}
/** A trial a quick screen set aside as clearly meant for a different group of patients. */
export interface ScreenedOutTrial {
  trial: Trial;
  reason: string;
}

export interface TrialsResponse {
  trials: Trial[]; // to be checked rule by rule
  screenedOut: ScreenedOutTrial[]; // shown with their reason; the user can still check them
  searchTerm: string;
  totalFound: number; // before the age/sex filter
  source: "live" | "snapshot"; // snapshot = saved copy used when ClinicalTrials.gov is unreachable
}

/** POST /api/evaluate – Gemma 4 checks one trial's rules against the profile. */
export interface EvaluateRequest {
  profile: PatientProfile;
  trial: Trial;
}
export interface EvaluateResponse {
  match: TrialMatch;
}

export interface ApiError {
  error: string;
  /** Set when Gemma's free-tier rate limit was hit: retry the same request after this many seconds. */
  retryAfterSeconds?: number;
}

/**
 * Vercel caps request bodies at 4.5 MB, so the UI shrinks photos before upload
 * (longest side 1600 px, JPEG) and keeps the total under this budget.
 */
export const UPLOAD_LIMITS = {
  maxImages: 6,
  maxTotalBase64Chars: 4_000_000,
  maxImageSide: 1600,
} as const;
