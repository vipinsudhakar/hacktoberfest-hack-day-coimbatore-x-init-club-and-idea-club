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
    labs: input.labs ?? [],
    comorbidities: input.comorbidities ?? [],
    otherFindings: input.otherFindings ?? [],
    evidence: input.evidence ?? [],
  };
}

export const TREATMENT_TYPES: { value: Treatment["type"]; label: string }[] = [
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

/** Short one-line description of the patient, used in the results header and printout. */
export function profileHeadline(p: PatientProfile): string {
  const parts: string[] = [];
  if (p.age !== null) parts.push(`${p.age} y`);
  if (p.sex) parts.push(p.sex === "female" ? "female" : "male");
  if (p.cancerType) parts.push(p.cancerType);
  if (p.stage) parts.push(p.stage);
  if (p.city) parts.push(p.city);
  return parts.join(" · ");
}
