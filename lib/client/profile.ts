import type { PatientProfile, Treatment } from "@/lib/types";

export function emptyProfile(): PatientProfile {
  return {
    age: null,
    sex: null,
    city: null,
    cancerType: null,
    histology: null,
    stage: null,
    metastatic: null,
    metastasisSites: [],
    biomarkers: [],
    treatments: [],
    ecog: null,
    medications: [],
    labs: [],
    comorbidities: [],
    otherFindings: [],
    evidence: [],
  };
}

/** Fills any missing fields so the editor never trips over a partial model answer. */
export function normalizeProfile(input: Partial<PatientProfile> | null | undefined): PatientProfile {
  const base = emptyProfile();
  if (!input) return base;
  return {
    ...base,
    ...input,
    metastasisSites: input.metastasisSites ?? [],
    biomarkers: input.biomarkers ?? [],
    treatments: input.treatments ?? [],
    medications: input.medications ?? [],
    labs: input.labs ?? [],
    comorbidities: input.comorbidities ?? [],
    otherFindings: input.otherFindings ?? [],
    evidence: input.evidence ?? [],
  };
}

const trimOrNull = (value: string | null) => (value?.trim() ? value.trim() : null);
const cleanList = (values: string[]) => values.map((v) => v.trim()).filter(Boolean);

/** Trims text and drops half-filled rows before the profile is sent for matching. */
export function cleanProfile(p: PatientProfile): PatientProfile {
  return {
    ...p,
    age: p.age !== null && Number.isFinite(p.age) ? p.age : null,
    city: trimOrNull(p.city),
    cancerType: trimOrNull(p.cancerType),
    histology: trimOrNull(p.histology),
    stage: trimOrNull(p.stage),
    metastasisSites: cleanList(p.metastasisSites),
    biomarkers: p.biomarkers
      .map((b) => ({ name: b.name.trim(), result: b.result.trim() }))
      .filter((b) => b.name),
    treatments: p.treatments
      .map((t) => ({ ...t, name: t.name.trim(), details: trimOrNull(t.details), outcome: trimOrNull(t.outcome) }))
      .filter((t) => t.name),
    medications: p.medications
      .map((m) => ({
        name: m.name.trim(),
        genericName: trimOrNull(m.genericName),
        dose: trimOrNull(m.dose),
        until: trimOrNull(m.until),
        reason: trimOrNull(m.reason),
      }))
      .filter((m) => m.name),
    labs: p.labs
      .map((l) => ({ name: l.name.trim(), value: l.value.trim(), unit: trimOrNull(l.unit) }))
      .filter((l) => l.name && l.value),
    comorbidities: cleanList(p.comorbidities),
    otherFindings: cleanList(p.otherFindings),
  };
}

export const TREATMENT_TYPES:{ value: Treatment["type"]; label: string }[] = [
  { value: "surgery", label: "Surgery" },
  { value: "chemotherapy", label: "Chemotherapy" },
  { value: "radiation", label: "Radiation" },
  { value: "hormonal", label: "Hormonal therapy" },
  { value: "targeted", label: "Targeted therapy" },
  { value: "immunotherapy", label: "Immunotherapy" },
  { value: "other", label: "Other" },
];

export const ECOG_LABELS: Record<number, string> = {
  0: "0 – fully active",
  1: "1 – limited in strenuous activity, can do light work",
  2: "2 – up and about more than half the day, can't work",
  3: "3 – in bed or chair more than half the day",
  4: "4 – completely bedbound",
  5: "5",
};

/** Short one-line description of the patient, used in the results header. */
export function profileHeadline(p: PatientProfile): string {
  const parts: string[] = [];
  if (p.age !== null) parts.push(`${p.age} y`);
  if (p.sex) parts.push(p.sex === "female" ? "female" : "male");
  if (p.cancerType) parts.push(p.cancerType);
  if (p.stage) parts.push(p.stage);
  if (p.city) parts.push(p.city);
  return parts.join(" · ");
}
