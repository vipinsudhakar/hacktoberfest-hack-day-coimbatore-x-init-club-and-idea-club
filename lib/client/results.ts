import type { CriterionResult, MatchStatus, Trial, TrialMatch } from "@/lib/types";

export type Evaluation =
  | { state: "queued" }
  | { state: "checking" }
  | { state: "done"; match: TrialMatch }
  | { state: "error"; message: string };

export type TrialRow = { trial: Trial; index: number; evaluation: Evaluation };

export type ResultFilter = "all" | MatchStatus | "error";

/** Rules the reports didn't settle and the doctor can answer (site-only checks excluded). */
export function openRules(results: CriterionResult[]): CriterionResult[] {
  return results.filter((r) => r.verdict === "unknown" && !r.siteCheck);
}

function openCount(match: TrialMatch): number {
  return Math.max(match.questions.length, openRules(match.results).length);
}

function rank(row: TrialRow): number {
  if (row.evaluation.state === "error") return 2;
  if (row.evaluation.state !== "done") return 4;
  return { likely: 0, possible: 1, not_eligible: 3 }[row.evaluation.match.status];
}

/** likely -> possible (fewest open questions first) -> couldn't check -> not eligible; ties keep registry order. */
export function sortRows(rows: TrialRow[]): TrialRow[] {
  return [...rows].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    if (a.evaluation.state === "done" && b.evaluation.state === "done") {
      const byOpen = openCount(a.evaluation.match) - openCount(b.evaluation.match);
      if (byOpen !== 0) return byOpen;
    }
    return a.index - b.index;
  });
}

export function rowFilterKey(row: TrialRow): ResultFilter | null {
  if (row.evaluation.state === "done") return row.evaluation.match.status;
  if (row.evaluation.state === "error") return "error";
  return null;
}

/** "PHASE2" -> "Phase 2", "EARLY_PHASE1" -> "Early phase 1", "NA" -> null. */
export function formatPhase(phase: string): string | null {
  const p = phase.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!p || p === "NA" || p === "N/A") return null;
  const early = p.startsWith("EARLY_");
  const num = p.replace(/^EARLY_/, "").replace(/^PHASE_?/, "");
  if (!/^\d$/.test(num)) return phase;
  return `${early ? "Early phase" : "Phase"} ${num}`;
}

// Old and new names of Indian cities, so "Bangalore" in a report matches a "Bengaluru" trial site.
const CITY_ALIASES: Record<string, string> = {
  bengaluru: "bangalore",
  bombay: "mumbai",
  madras: "chennai",
  "new delhi": "delhi",
  trivandrum: "thiruvananthapuram",
  calcutta: "kolkata",
  gurgaon: "gurugram",
  cochin: "kochi",
  mysore: "mysuru",
  pondicherry: "puducherry",
  kovai: "coimbatore",
};

function canonicalCity(name: string): string {
  const city = name.trim().toLowerCase();
  return CITY_ALIASES[city] ?? city;
}

export function sameCity(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return canonicalCity(a) === canonicalCity(b);
}
