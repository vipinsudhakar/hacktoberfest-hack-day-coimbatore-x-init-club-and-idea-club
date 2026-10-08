import { z } from "zod";
import { UPLOAD_LIMITS } from "./api";
import { errorResponse } from "./http";

// Request-body schemas for the API routes. Malformed input becomes a 400 with { error }, never a 500.
// Limits keep a hand-made request from inflating the prompts sent to Gemma.

const MAX_SHORT = 300; // names, values, single facts
const MAX_LONG = 2_000; // free text such as treatment details or report quotes
const MAX_ITEMS = 50;

const short = z.string().max(MAX_SHORT);
const long = z.string().max(MAX_LONG);
const list = <T extends z.ZodType>(item: T) => z.array(item).max(MAX_ITEMS).default([]);
const optionalNull = <T extends z.ZodType>(schema: T) => schema.nullable().default(null);

const treatmentTypes = ["surgery", "chemotherapy", "radiation", "hormonal", "targeted", "immunotherapy", "other"] as const;

/** A PatientProfile as edited in the UI. Missing lists and values default to empty; unknown keys are kept. */
export const profileSchema = z.looseObject({
  age: optionalNull(z.number().min(0).max(130)),
  sex: optionalNull(z.enum(["female", "male"])),
  city: optionalNull(short),
  cancerType: optionalNull(short),
  histology: optionalNull(short),
  stage: optionalNull(short),
  metastatic: optionalNull(z.boolean()),
  metastasisSites: list(short),
  biomarkers: list(z.object({ name: short, result: short })),
  treatments: list(
    z.object({
      name: short,
      type: z.enum(treatmentTypes).catch("other"),
      details: optionalNull(long),
      outcome: optionalNull(long),
    }),
  ),
  ecog: optionalNull(z.number().int().min(0).max(5)),
  medications: list(
    z.object({
      name: short,
      genericName: optionalNull(short),
      dose: optionalNull(short),
      until: optionalNull(short),
      reason: optionalNull(short),
    }),
  ),
  labs: list(z.object({ name: short, value: short, unit: optionalNull(short) })),
  comorbidities: list(short),
  otherFindings: list(long),
  evidence: list(z.object({ field: short, quote: long })),
});

export const trialsRequestSchema = z.object({
  profile: profileSchema.extend({
    cancerType: z
      .string({ error: "Add the cancer type so we know which trials to search." })
      .trim()
      .min(1, "Add the cancer type so we know which trials to search.")
      .max(120, "Keep the cancer type under 120 characters."),
  }),
});

/** Only the trial's ID is used: the server checks the registry's own copy of the trial. */
export const evaluateRequestSchema = z.object({
  profile: profileSchema,
  trial: z.looseObject({ nctId: z.string({ error: "Both a patient profile and a trial are required." }).max(20) }),
});

export const translateRequestSchema = z.object({
  language: z.enum(["ta", "hi"], { error: "Choose Tamil (ta) or Hindi (hi)." }),
  texts: z
    .array(z.string().max(600, "Each text must be a short string."), { error: "Send between 1 and 120 texts." })
    .min(1, "Send between 1 and 120 texts.")
    .max(120, "Send between 1 and 120 texts."),
});

const IMAGE_TYPES = /^image\/(png|jpe?g|webp)$/;
export const extractRequestSchema = z.object({
  images: z
    .array(
      z.object(
        {
          data: z.string({ error: "Reports must be JPG, PNG or WebP images." }).min(1, "One of the images is empty."),
          mimeType: z.string().regex(IMAGE_TYPES, "Reports must be JPG, PNG or WebP images."),
        },
        { error: "Reports must be JPG, PNG or WebP images." },
      ),
      { error: "Add at least one report image." },
    )
    .min(1, "Add at least one report image.")
    .max(UPLOAD_LIMITS.maxImages, `Upload at most ${UPLOAD_LIMITS.maxImages} images.`),
});

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: Response };

/**
 * Reads and validates a JSON body. A body that isn't JSON or isn't an object gets `notJson` as its
 * message; any other problem names the first field that failed.
 */
export async function readBody<T>(request: Request, schema: z.ZodType<T>, notJson: string): Promise<ParsedBody<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: errorResponse(notJson, 400) };
  }
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, response: errorResponse(describeIssue(result.error.issues[0], notJson), 400) };
}

function describeIssue(issue: z.core.$ZodIssue | undefined, notJson: string): string {
  if (!issue || !issue.path.length) return notJson;
  // Messages written above are full sentences; zod's own ones get the field name in front.
  if (/^[A-Z]/.test(issue.message) && issue.message.endsWith(".")) return issue.message;
  return `Check ${issue.path.join(".")}: ${issue.message}.`;
}
