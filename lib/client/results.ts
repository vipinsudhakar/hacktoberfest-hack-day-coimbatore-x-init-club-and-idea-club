import type { CriterionResult, Medication, MatchStatus, Trial, TrialMatch } from "@/lib/types";

export type Evaluation =
  | { state: "queued" }
  | { state: "checking" }
  /** Gemma's free tier said "slow down": retried automatically at `retryAt` (epoch ms). */
  | { state: "waiting"; retryAt: number; seconds: number; attempt: number; maxAttempts: number }
  | { state: "done"; match: TrialMatch }
  | { state: "error"; message: string; rateLimited: boolean };

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

/** "Tab. Clarithromycin 500 mg" -> "tab clarithromycin 500 mg". */
const simplify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Index of the patient's medicine a rule names (by generic or written name), or -1. */
export function findMedication(medications: Medication[], medicine: string): number {
  const wanted = simplify(medicine);
  if (!wanted) return -1;
  return medications.findIndex((med) =>
    [med.genericName, med.name].some((name) => {
      const have = name ? simplify(name) : "";
      return have.length >= 3 && (have === wanted || have.includes(wanted) || wanted.includes(have));
    }),
  );
}

export type MedicineNote = { trial: Trial; rule: CriterionResult };

export type MedicineGroup = {
  key: string;
  /** The patient's medicine as entered, or null when a rule names a medicine that isn't on the list. */
  medication: Medication | null;
  label: string;
  notes: MedicineNote[];
};

const VERDICT_ORDER = { fail: 0, unknown: 1, pass: 2 } as const;

/** Every checked rule that concerns one of the patient's medicines, grouped by medicine (worst verdict first). */
export function medicineGroups(medications: Medication[], rows: TrialRow[]): MedicineGroup[] {
  const groups = new Map<string, MedicineGroup>();
  medications.forEach((med, i) =>
    groups.set(`med-${i}`, { key: `med-${i}`, medication: med, label: med.genericName || med.name, notes: [] }),
  );
  for (const row of rows) {
    if (row.evaluation.state !== "done") continue;
    for (const rule of row.evaluation.match.results) {
      const medicine = rule.medicine?.trim();
      if (!medicine) continue;
      const index = findMedication(medications, medicine);
      const key = index >= 0 ? `med-${index}` : `other-${simplify(medicine)}`;
      if (!groups.has(key)) groups.set(key, { key, medication: null, label: medicine, notes: [] });
      groups.get(key)!.notes.push({ trial: row.trial, rule });
    }
  }
  for (const group of groups.values()) {
    group.notes.sort((a, b) => VERDICT_ORDER[a.rule.verdict] - VERDICT_ORDER[b.rule.verdict] || a.trial.nctId.localeCompare(b.trial.nctId));
  }
  return [...groups.values()];
}
