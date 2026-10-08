import type { TrialsResponse } from "@/lib/api";
import { broaderSearchTerm, filterByAgeAndSex, orderForChecking, searchTrials } from "@/lib/ctgov";
import { generateJson } from "@/lib/gemma";
import { errorResponse } from "@/lib/http";
import { screenPrompt, screenSchema } from "@/lib/prompts";
import { readBody, trialsRequestSchema } from "@/lib/requests";
import { applyScreen } from "@/lib/screen";
import { getSnapshot, snapshotKey } from "@/lib/snapshot";
import type { Trial } from "@/lib/types";

export const maxDuration = 60;

// One deadline for the whole request, inside maxDuration.
const DEADLINE_MS = 55_000;
// The first search and the broader retry share this much time before the saved copy is used.
const SEARCH_TIMEOUT_MS = 25_000;
const SCREEN_MAX_MS = 40_000;
// With less time left than this the quick screen is skipped and every trial is checked in full.
const SCREEN_MIN_MS = 10_000;
// Below this many candidates the quick screen saves little, so every trial is checked in full.
const SCREEN_FROM = 6;

export async function POST(request: Request) {
  const started = Date.now();
  const remaining = () => DEADLINE_MS - (Date.now() - started);

  const parsed = await readBody(request, trialsRequestSchema, "Send the patient profile as JSON.");
  if (!parsed.ok) return parsed.response;
  const { profile } = parsed.data;
  const term = profile.cancerType;

  let searchTerm = term;
  let trials: Trial[];
  let source: TrialsResponse["source"] = "live";
  let snapshotSavedAt: string | undefined;
  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(SEARCH_TIMEOUT_MS)]);
    trials = await searchTrials(searchTerm, signal);
    const broader = trials.length ? null : broaderSearchTerm(searchTerm);
    if (broader) {
      searchTerm = broader;
      trials = await searchTrials(broader, signal);
    }
  } catch (err) {
    console.error("ClinicalTrials.gov search failed, using the saved copy:", err);
    const snapshot = await getSnapshot().catch((loadErr) => {
      console.error("saved copy of the registry unavailable:", loadErr);
      return null;
    });
    const key = snapshot && snapshotKey(snapshot, term);
    if (!snapshot || !key) return errorResponse("ClinicalTrials.gov can't be reached right now. Please try again.", 502);
    searchTerm = key;
    trials = snapshot.searches[key];
    source = "snapshot";
    snapshotSavedAt = snapshot.savedAt;
  }

  const candidates = orderForChecking(filterByAgeAndSex(trials, profile), profile);
  let screened = { toCheck: candidates, screenedOut: [] as TrialsResponse["screenedOut"] };
  if (candidates.length >= SCREEN_FROM && remaining() >= SCREEN_MIN_MS) {
    try {
      const budgetMs = Math.min(SCREEN_MAX_MS, remaining() - 3_000);
      const reply = await generateJson(screenPrompt(profile, candidates), screenSchema, [], budgetMs, request.signal);
      screened = applyScreen(candidates, reply.results);
    } catch (err) {
      console.error("quick screen failed, checking every trial:", err);
    }
  }

  return Response.json({
    trials: screened.toCheck,
    screenedOut: screened.screenedOut,
    searchTerm,
    totalFound: trials.length,
    source,
    ...(snapshotSavedAt ? { snapshotSavedAt } : {}),
  } satisfies TrialsResponse);
}
