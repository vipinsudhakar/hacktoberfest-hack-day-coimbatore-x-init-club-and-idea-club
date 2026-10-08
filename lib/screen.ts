import type { ScreenedOutTrial } from "./api";
import type { Trial } from "./types";

export interface ScreenDecision {
  nctId: string;
  decision: "check" | "skip";
  reason: string;
}

/**
 * Splits trials by the quick screen's decisions. Anything the screen didn't mention, or skipped
 * without a reason, is still checked: the screen only removes clear mismatches.
 */
export function applyScreen(trials: Trial[], decisions: ScreenDecision[]): { toCheck: Trial[]; screenedOut: ScreenedOutTrial[] } {
  const skips = new Map(
    decisions.filter((d) => d.decision === "skip" && d.reason.trim()).map((d) => [d.nctId, d.reason.trim()]),
  );
  return {
    toCheck: trials.filter((t) => !skips.has(t.nctId)),
    screenedOut: trials.filter((t) => skips.has(t.nctId)).map((trial) => ({ trial, reason: skips.get(trial.nctId)! })),
  };
}
