import type { Criterion, CriterionKind, CriterionResult, MatchStatus, Medication, TrialMatch, Verdict } from "./types";

/** What Gemma says about one rule: is the rule's statement true for this patient? */
export interface RuleAssessment {
  id: number;
  holds: "yes" | "no" | "unknown";
  siteCheck: boolean;
  reason: string;
  evidence: string | null;
  question: string | null;
  medicine: string | null;
}

/**
 * Gemma judges each rule's statement on its own ("does the patient have X?"), which avoids
 * double negatives on exclusion rules. Whether that helps or hurts depends on the rule kind.
 */
export function toVerdict(kind: CriterionKind, holds: RuleAssessment["holds"]): Verdict {
  if (holds === "unknown") return "unknown";
  const satisfied = kind === "inclusion" ? holds === "yes" : holds === "no";
  return satisfied ? "pass" : "fail";
}

/**
 * Gemma names the medicine a rule is about; keep that only when it is one of the patient's
 * current medications, and report it by that medication's generic name.
 */
export function linkMedicine(named: string | null, medications: Medication[]): string | null {
  const n = named?.trim().toLowerCase();
  if (!n) return null;
  const match = medications.find((m) =>
    [m.genericName, m.name].some((label) => label && (label.toLowerCase().includes(n) || n.includes(label.toLowerCase()))),
  );
  return match ? (match.genericName ?? match.name).toLowerCase() : null;
}

export function decideMatch(
  nctId: string,
  plainSummary: string,
  criteria: Criterion[],
  assessments: RuleAssessment[],
): TrialMatch {
  const byId = new Map(assessments.map((a) => [a.id, a]));
  const results: CriterionResult[] = criteria.map((c) => {
    const a = byId.get(c.id);
    if (!a) {
      return { ...c, verdict: "unknown", siteCheck: false, reason: "Not assessed.", evidence: null, question: null, medicine: null };
    }
    return {
      ...c,
      verdict: toVerdict(c.kind, a.holds),
      siteCheck: a.siteCheck,
      reason: a.reason,
      evidence: a.evidence,
      question: a.holds === "unknown" ? a.question : null,
      medicine: a.medicine,
    };
  });

  // A rule the trial team checks at enrolment (consent, contraception) can't decide the status either way,
  // but if Gemma says it fails, that becomes an open question rather than being ignored.
  const fails = results.filter((r) => r.verdict === "fail" && !r.siteCheck);
  const siteFails = results.filter((r) => r.verdict === "fail" && r.siteCheck);
  // A rule failed only because of a current medicine is an open point for the doctor, not a verdict:
  // a medicine can sometimes be switched or finished, and a patient must never stop one on their own.
  const blockers = fails.filter((r) => !r.medicine);
  const medicineFails = fails.filter((r) => r.medicine);
  // (medicine-only fails never hide a separate blocker: any untagged fail still makes the trial not eligible)
  const unknowns = results.filter((r) => r.verdict === "unknown" && !r.siteCheck);
  const status: MatchStatus = blockers.length
    ? "not_eligible"
    : unknowns.length || medicineFails.length || siteFails.length
      ? "possible"
      : "likely";
  const questions = [
    ...new Set([
      ...medicineFails.map((r) => `Could ${r.medicine} be changed or finished before screening for this trial?`),
      ...unknowns.map((r) => r.question?.trim()).filter((q): q is string => !!q),
      ...siteFails.map((r) => `The trial team will check: "${r.text}". Is this a problem for the patient?`),
    ]),
  ];

  return { nctId, status, plainSummary, results, blockers, questions };
}
