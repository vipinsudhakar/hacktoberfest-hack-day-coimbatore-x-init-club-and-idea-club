// Shared data shapes for the TrialBridge pipeline:
// medical reports -> PatientProfile -> candidate Trials -> TrialMatch per trial.

export interface Biomarker {
  name: string; // e.g. "HER2", "EGFR", "PD-L1"
  result: string; // e.g. "negative (IHC 1+)", "exon 19 deletion", "TPS 60%"
}

export interface Treatment {
  name: string; // e.g. "Palbociclib + letrozole", "Modified radical mastectomy"
  type: "surgery" | "chemotherapy" | "radiation" | "hormonal" | "targeted" | "immunotherapy" | "other";
  details: string | null; // dates, cycles, setting (adjuvant / metastatic, line of therapy)
  outcome: string | null; // e.g. "progressed after 14 months"
}

/** A medicine the patient currently takes, read from prescriptions or clinic notes. */
export interface Medication {
  name: string; // as written, e.g. "Tab. Clarithromycin 500 mg"
  genericName: string | null; // active ingredient, e.g. "clarithromycin"
  dose: string | null; // e.g. "500 mg twice daily"
  until: string | null; // end date or duration if the prescription gives one, e.g. "till 06-Oct-2026"
  reason: string | null; // what it is for, if stated
}

export interface LabResult {
  name: string;
  value: string;
  unit: string | null;
}

/** What Gemma read from the patient's reports. Every field stays editable by the user. */
export interface PatientProfile {
  age: number | null;
  sex: "female" | "male" | null;
  city: string | null;
  cancerType: string | null; // registry search term, e.g. "breast cancer"
  histology: string | null;
  stage: string | null; // e.g. "Stage IV (pT2 N1 M1)"
  metastatic: boolean | null;
  metastasisSites: string[];
  biomarkers: Biomarker[];
  treatments: Treatment[];
  ecog: number | null; // ECOG performance status 0-5
  medications: Medication[]; // current medicines; trial rules about other drugs are checked against these
  labs: LabResult[];
  comorbidities: string[];
  otherFindings: string[];
  /** Exact snippets from the reports that the values above came from. */
  evidence: { field: string; quote: string }[];
}

export interface TrialSite {
  facility: string;
  city: string;
  state: string | null;
  /** Listed as "not yet recruiting": the site is about to open. */
  openingSoon: boolean;
}

export interface TrialContact {
  name: string | null;
  phone: string | null;
  email: string | null;
}

/** A recruiting trial from ClinicalTrials.gov, trimmed to what matching and display need. */
export interface Trial {
  nctId: string;
  title: string;
  phases: string[];
  conditions: string[];
  interventions: string[];
  summary: string;
  minAgeYears: number | null;
  maxAgeYears: number | null;
  sex: "ALL" | "FEMALE" | "MALE";
  eligibilityText: string;
  indiaSites: TrialSite[];
  contacts: TrialContact[];
  url: string;
}

export type CriterionKind = "inclusion" | "exclusion";

/** One rule split out of a trial's eligibility text. */
export interface Criterion {
  id: number;
  kind: CriterionKind;
  text: string;
  /** Lead-in line for nested rules, e.g. "Adequate bone marrow function defined as follows". */
  group: string | null;
}

/**
 * pass    – the patient satisfies this rule (inclusion holds / exclusion does not apply)
 * fail    – the rule rules the patient out
 * unknown – the reports don't say; becomes a question for the doctor
 */
export type Verdict = "pass" | "fail" | "unknown";

export interface CriterionResult extends Criterion {
  verdict: Verdict;
  /** Consent, willingness, contraception etc. – only the trial site can confirm these. */
  siteCheck: boolean;
  reason: string;
  evidence: string | null;
  question: string | null;
  /** The patient's medicine this rule is about (e.g. "clarithromycin" for a CYP3A4 inhibitor rule), if any. */
  medicine: string | null;
}

export type MatchStatus = "likely" | "possible" | "not_eligible";

export interface TrialMatch {
  nctId: string;
  status: MatchStatus;
  plainSummary: string; // what the trial tests, in plain words
  results: CriterionResult[];
  blockers: CriterionResult[];
  questions: string[];
}
