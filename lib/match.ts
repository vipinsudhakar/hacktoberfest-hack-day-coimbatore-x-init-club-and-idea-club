import type { Criterion, CriterionKind, CriterionResult, MatchStatus, TrialMatch, Verdict } from "./types";

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

  // Rules only the trial team can confirm (consent, contraception, screening tests) never decide the status.
  const blockers = results.filter((r) => r.verdict === "fail" && !r.siteCheck);
  const unknowns = results.filter((r) => r.verdict === "unknown" && !r.siteCheck);
  const status: MatchStatus = blockers.length ? "not_eligible" : unknowns.length ? "possible" : "likely";
  const questions = [...new Set(unknowns.map((r) => r.question?.trim()).filter((q): q is string => !!q))];

  return { nctId, status, plainSummary, results, blockers, questions };
}
