import type { TrialsRequest, TrialsResponse } from "@/lib/api";
import { broaderSearchTerm, filterByAgeAndSex, orderForChecking, searchTrials } from "@/lib/ctgov";
import { generateJson } from "@/lib/gemma";
import { errorResponse } from "@/lib/http";
import { screenPrompt, screenSchema } from "@/lib/prompts";
import { applyScreen } from "@/lib/screen";
import type { Trial } from "@/lib/types";
import snapshotJson from "@/data/ctgov-snapshot.json";

export const maxDuration = 60;

// Below this many candidates the quick screen saves little, so every trial is checked in full.
const SCREEN_FROM = 6;

const snapshot = snapshotJson as unknown as { savedAt: string; searches: Record<string, Trial[]> };

function snapshotKey(term: string): string | null {
  const t = term.toLowerCase();
  if (snapshot.searches[t]) return t;
  const broader = broaderSearchTerm(t);
  return broader && snapshot.searches[broader] ? broader : null;
}

export async function POST(request: Request) {
  let body: Partial<TrialsRequest>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Send the patient profile as JSON.", 400);
  }
  const profile = body.profile;
  const term = profile?.cancerType?.trim();
  if (!profile || !term) return errorResponse("Add the cancer type so we know which trials to search.", 400);

  let searchTerm = term;
  let trials: Trial[];
  let source: TrialsResponse["source"] = "live";
  try {
    trials = await searchTrials(searchTerm);
    const broader = trials.length ? null : broaderSearchTerm(searchTerm);
    if (broader) {
      searchTerm = broader;
      trials = await searchTrials(broader);
    }
  } catch (err) {
    console.error("ClinicalTrials.gov search failed, using the saved copy:", err);
    const key = snapshotKey(term);
    if (!key) return errorResponse("ClinicalTrials.gov can't be reached right now. Please try again.", 502);
    searchTerm = key;
    trials = snapshot.searches[key];
    source = "snapshot";
  }

  const candidates = orderForChecking(filterByAgeAndSex(trials, profile), profile);
  let screened = { toCheck: candidates, screenedOut: [] as TrialsResponse["screenedOut"] };
  if (candidates.length >= SCREEN_FROM) {
    try {
      const reply = await generateJson(screenPrompt(profile, candidates), screenSchema, [], 40_000);
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
  } satisfies TrialsResponse);
}
