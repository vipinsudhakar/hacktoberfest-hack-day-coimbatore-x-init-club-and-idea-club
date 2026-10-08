import { broaderSearchTerm } from "./ctgov.ts";
import type { Trial } from "./types";

// The saved copy of ClinicalTrials.gov searches (npm run snapshot), used when the registry is unreachable.
// It is loaded on first use so requests that never need it don't pay for parsing it.

export interface Snapshot {
  savedAt: string; // ISO date
  searches: Record<string, Trial[]>;
}

let loading: Promise<{ snapshot: Snapshot; byId: Map<string, Trial> }> | null = null;

function load() {
  loading ??= import("@/data/ctgov-snapshot.json")
    .then((mod) => {
      const snapshot = (mod.default ?? mod) as unknown as Snapshot;
      const byId = new Map<string, Trial>();
      for (const trials of Object.values(snapshot.searches)) {
        for (const trial of trials) byId.set(trial.nctId, trial);
      }
      return { snapshot, byId };
    })
    .catch((err) => {
      loading = null;
      throw err;
    });
  return loading;
}

export async function getSnapshot(): Promise<Snapshot> {
  return (await load()).snapshot;
}

/** The saved search for this term, or for its broader form; null if neither was saved. */
export function snapshotKey(snapshot: Snapshot, term: string): string | null {
  const t = term.toLowerCase();
  if (snapshot.searches[t]) return t;
  const broader = broaderSearchTerm(t);
  return broader && snapshot.searches[broader] ? broader : null;
}

/** The saved copy of one trial, by NCT ID. */
export async function snapshotTrial(nctId: string): Promise<Trial | null> {
  return (await load()).byId.get(nctId) ?? null;
}
