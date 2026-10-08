import type { TrialsRequest, TrialsResponse } from "@/lib/api";
import { broaderSearchTerm, filterByAgeAndSex, orderForChecking, searchTrials } from "@/lib/ctgov";
import { errorResponse } from "@/lib/http";
import type { Trial } from "@/lib/types";
import snapshotJson from "@/data/ctgov-snapshot.json";

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

  return Response.json({
    trials: orderForChecking(filterByAgeAndSex(trials, profile), profile),
    searchTerm,
    totalFound: trials.length,
    source,
  } satisfies TrialsResponse);
}
