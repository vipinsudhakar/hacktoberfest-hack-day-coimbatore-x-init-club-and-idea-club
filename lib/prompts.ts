import { z } from "zod";
import type { RuleAssessment } from "./match";
import type { Criterion, PatientProfile, Trial } from "./types";

// Model replies are parsed leniently: a malformed field falls back to "not stated"
// instead of failing the whole reply.

const lower = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : v);
const text = z.string().trim().min(1).nullable().catch(null);
const textList = z.array(z.string()).catch([]);
const numberIn = (min: number, max: number) =>
  z
    .preprocess((v) => (typeof v === "string" ? Number.parseFloat(v) : v), z.number().min(min).max(max).nullable())
    .catch(null);

function listOf<T>(item: z.ZodType<T>) {
  return z
    .preprocess((v) => (Array.isArray(v) ? v : []), z.array(item.nullable().catch(null)))
    .transform((items) => items.filter((i): i is NonNullable<typeof i> => i !== null));
}

export const profileSchema = z.object({
  age: numberIn(0, 120),
  sex: z.preprocess(lower, z.enum(["female", "male"]).nullable()).catch(null),
  city: text,
  cancerType: text,
  histology: text,
  stage: text,
  metastatic: z.boolean().nullable().catch(null),
  metastasisSites: textList,
  biomarkers: listOf(z.object({ name: z.string(), result: z.string() })),
  treatments: listOf(
    z.object({
      name: z.string(),
      type: z
        .preprocess(
          lower,
          z.enum(["surgery", "chemotherapy", "radiation", "hormonal", "targeted", "immunotherapy", "other"]),
        )
        .catch("other"),
      details: text,
      outcome: text,
    }),
  ),
  ecog: numberIn(0, 5),
  medications: listOf(z.object({ name: z.string(), genericName: text, dose: text, until: text, reason: text })),
  labs: listOf(z.object({ name: z.string(), value: z.union([z.string(), z.number()]).transform(String), unit: text })),
  comorbidities: textList,
  otherFindings: textList,
  evidence: listOf(z.object({ field: z.string(), quote: z.string() })),
}) as unknown as z.ZodType<PatientProfile>;

export const EXTRACT_PROMPT = `You are reading a cancer patient's medical documents (the images above: pathology, imaging, clinic or discharge summaries, prescriptions, lab reports). Build a structured profile that will be used to screen the patient for clinical trials.

Rules:
- Use only what the documents say. If something is not stated, use null (or an empty list). Never guess values that are not written.
- Copy medical results as written, e.g. "HER2 negative (IHC 1+)", "EGFR exon 19 deletion", "PD-L1 TPS 30%".
- city: the city where the patient lives (from their address), not the hospital's city.
- cancerType: a short search term for a trial registry, e.g. "breast cancer", "non-small cell lung cancer", "head and neck cancer", "acute myeloid leukemia".
- stage: as written, including TNM if given. metastatic: true if the documents describe metastatic or stage IV disease, false if they clearly describe non-metastatic disease, otherwise null.
- treatments: every surgery, chemotherapy, radiation, hormonal, targeted and immunotherapy treatment. Put dates, cycles and the setting (adjuvant, first-line metastatic, ...) in details and the result in outcome (e.g. "progressed after 28 months").
- ecog: the ECOG performance status if stated. A Karnofsky score is not ECOG: leave ecog null and add the Karnofsky score to otherFindings.
- medications: every medicine the patient is currently taking (prescriptions, "current medications" lists), including non-cancer medicines and short courses such as antibiotics. Give the active ingredient in genericName (e.g. "clarithromycin" for "Tab. Claribid 500"), the dose and frequency, the end date or duration in until if written, and what it is for if stated. Leave out medicines the documents say were stopped.
- labs: the most recent value of each lab test.
- evidence: for the most important values (diagnosis, stage, each biomarker, each line of treatment, ECOG), copy the exact snippet from the document.
- Documents may be photos taken at an angle or slightly blurred; read carefully.

Reply with only a JSON object with exactly these keys:
{
  "age": number | null,
  "sex": "female" | "male" | null,
  "city": string | null,
  "cancerType": string | null,
  "histology": string | null,
  "stage": string | null,
  "metastatic": boolean | null,
  "metastasisSites": string[],
  "biomarkers": [{"name": string, "result": string}],
  "treatments": [{"name": string, "type": "surgery" | "chemotherapy" | "radiation" | "hormonal" | "targeted" | "immunotherapy" | "other", "details": string | null, "outcome": string | null}],
  "ecog": number | null,
  "medications": [{"name": string, "genericName": string | null, "dose": string | null, "until": string | null, "reason": string | null}],
  "labs": [{"name": string, "value": string, "unit": string | null}],
  "comorbidities": string[],
  "otherFindings": string[],
  "evidence": [{"field": string, "quote": string}]
}`;

const assessmentReply = z.object({
  plainSummary: z.string().catch(""),
  results: listOf(
    z.object({
      id: z.coerce.number().int(),
      holds: z.preprocess(lower, z.enum(["yes", "no", "unknown"])).catch("unknown"),
      siteCheck: z.boolean().catch(false),
      reason: z.string().catch(""),
      evidence: z.string().nullable().catch(null),
      question: z.string().nullable().catch(null),
      medicine: text,
    }),
  ),
});

/** A reply that skips any of the expected rule ids is rejected, so generateJson retries it. */
export function assessmentSchema(ruleIds: number[]) {
  return assessmentReply.superRefine((reply, ctx) => {
    const answered = new Set(reply.results.map((r) => r.id));
    const missing = ruleIds.filter((id) => !answered.has(id));
    if (missing.length) {
      ctx.addIssue({ code: "custom", message: `results is missing rule ids ${missing.join(", ")}` });
    }
  }) as unknown as z.ZodType<{ plainSummary: string; results: RuleAssessment[] }>;
}

export function evaluatePrompt(profile: PatientProfile, trial: Trial, criteria: Criterion[]): string {
  const facts = { ...profile, evidence: undefined }; // the quotes aren't needed to judge rules
  const rules = criteria
    .map((c) => `[${c.id}] (${c.kind}) ${c.group ? `${c.group}: ` : ""}${c.text}`)
    .join("\n");

  return `You are helping an oncologist pre-screen a patient for a clinical trial. Judge each eligibility rule against the patient profile.

TRIAL ${trial.nctId}: ${trial.title}
Conditions: ${trial.conditions.join("; ") || "not listed"}
Treatments being tested: ${trial.interventions.join("; ") || "not listed"}
Summary: ${trial.summary.slice(0, 500)}

PATIENT PROFILE (read from their medical reports and checked by the user):
${JSON.stringify(facts)}

RULES:
${rules}

For every rule, set "holds":
- Inclusion rule: does the patient MEET this requirement? "yes", "no", or "unknown" if the profile doesn't say. A requirement that only applies to some patients (e.g. "HIV-positive participants must have controlled HIV") is met by a patient it doesn't apply to.
- Exclusion rule: does this exclusion APPLY to the patient? "yes", "no", or "unknown".
- For exclusions about other illnesses or history (autoimmune disease, lung disease, infections, heart disease, other cancers), answer "no" when the profile's comorbidities and history don't mention it, and say "not mentioned in the reports" in the reason.
- Use medical knowledge to connect terms: stage IV means metastatic; HER2 IHC 0 or 1+ is HER2-negative; palbociclib, ribociclib and abemaciclib are CDK4/6 inhibitors; letrozole, anastrozole, exemestane, fulvestrant and tamoxifen are endocrine therapies; osimertinib, gefitinib and erlotinib are EGFR TKIs. Work out time intervals from the dates given.
- Rules about other medicines (e.g. "strong CYP3A4 inhibitors or inducers", "systemic corticosteroids", "anticoagulants", "other investigational drugs") must be checked against the profile's medications by drug class: clarithromycin, itraconazole and ketoconazole are strong CYP3A4 inhibitors; rifampicin, carbamazepine and phenytoin are strong CYP3A4 inducers. If a short course ends before the trial would start, say so in the reason.
- Never invent facts that are not in the profile.

Other fields:
- siteCheck: true only for rules the trial team checks at enrolment that don't depend on medical history: informed consent, willingness or ability to comply, contraception and pregnancy tests, investigator judgement, life expectancy, central lab confirmation, tests done during screening. Otherwise false.
- reason: one short plain-English sentence a patient can understand.
- evidence: the profile value you relied on (e.g. "ECOG 1"), or null.
- question: only when holds is "unknown" and siteCheck is false, a short question the patient can ask their doctor (e.g. "What is my ECOG performance status?"). Otherwise null.
- medicine: when the rule is about one of the patient's current medications, that medicine's generic name; otherwise null.
- plainSummary: one plain-English sentence (at most 30 words) saying what this trial tests and for whom. No jargon.

Reply with only JSON, with exactly one result for each of the ${criteria.length} rules above (use their ids):
{"plainSummary": string, "results": [{"id": number, "holds": "yes" | "no" | "unknown", "siteCheck": boolean, "reason": string, "evidence": string | null, "question": string | null, "medicine": string | null}]}`;
}
