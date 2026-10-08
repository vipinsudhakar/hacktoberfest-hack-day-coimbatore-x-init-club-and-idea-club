import type { EvaluateResponse } from "@/lib/api";
import { splitCriteria } from "@/lib/criteria";
import { getTrial, isNctId } from "@/lib/ctgov";
import { generateJson } from "@/lib/gemma";
import { errorResponse, gemmaErrorResponse } from "@/lib/http";
import { decideMatch, linkMedicine } from "@/lib/match";
import { assessmentSchema, evaluatePrompt } from "@/lib/prompts";
import { evaluateRequestSchema, readBody } from "@/lib/requests";

export const maxDuration = 60;

// One deadline for the whole request, inside maxDuration: the trial lookup comes out of Gemma's share.
const DEADLINE_MS = 55_000;
const RULES_PER_CALL = 20;

export async function POST(request: Request) {
  const started = Date.now();
  const parsed = await readBody(request, evaluateRequestSchema, "Send the profile and trial as JSON.");
  if (!parsed.ok) return parsed.response;
  const { profile } = parsed.data;
  const nctId = parsed.data.trial.nctId;
  if (!isNctId(nctId)) return errorResponse("That trial ID isn't valid. It should look like NCT01234567.", 400);

  // Only the registry's copy of the trial is checked, never trial text sent with the request.
  const trial = await getTrial(nctId, request.signal);
  if (!trial) return errorResponse("We couldn't verify this trial right now. Please retry.", 503);

  if (trial.eligibilityText.length > 40_000) return errorResponse("This trial's rules are too long to check here.", 413);
  const criteria = splitCriteria(trial.eligibilityText).slice(0, 120);
  if (!criteria.length) {
    const match = decideMatch(trial.nctId, trial.title, [], []);
    match.status = "possible";
    match.questions = ["This trial doesn't list its eligibility rules online. Ask the trial team whether you qualify."];
    return Response.json({ match } satisfies EvaluateResponse);
  }

  // Stops the other batches when one fails or the client goes away, so no Gemma quota is wasted.
  const controller = new AbortController();
  const signal = AbortSignal.any([request.signal, controller.signal]);
  const budgetMs = DEADLINE_MS - (Date.now() - started);
  try {
    // Long rule lists (some trials have 60+) are checked in parallel batches so each Gemma call
    // finishes well inside the request's time budget.
    const batches = Array.from({ length: Math.ceil(criteria.length / RULES_PER_CALL) }, (_, i) =>
      criteria.slice(i * RULES_PER_CALL, (i + 1) * RULES_PER_CALL),
    );
    const replies = await Promise.all(
      batches.map((batch) =>
        generateJson(
          evaluatePrompt(profile, trial, batch),
          assessmentSchema(batch.map((c) => c.id)),
          [],
          budgetMs,
          signal,
        ).catch((err: unknown) => {
          controller.abort();
          throw err;
        }),
      ),
    );
    const plainSummary = replies.find((r) => r.plainSummary)?.plainSummary ?? "";
    const assessments = replies
      .flatMap((r) => r.results)
      .map((a) => ({ ...a, medicine: linkMedicine(a.medicine, profile.medications) }));
    const match = decideMatch(trial.nctId, plainSummary, criteria, assessments);
    return Response.json({ match } satisfies EvaluateResponse);
  } catch (err) {
    console.error(`evaluate ${trial.nctId} failed:`, err);
    return gemmaErrorResponse(err, "retry this trial");
  }
}
