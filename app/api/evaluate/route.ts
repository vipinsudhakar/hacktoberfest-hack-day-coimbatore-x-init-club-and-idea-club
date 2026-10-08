import type { EvaluateRequest, EvaluateResponse } from "@/lib/api";
import { splitCriteria } from "@/lib/criteria";
import { generateJson } from "@/lib/gemma";
import { errorResponse, gemmaErrorResponse } from "@/lib/http";
import { decideMatch, linkMedicine } from "@/lib/match";
import { assessmentSchema, evaluatePrompt } from "@/lib/prompts";

export const maxDuration = 60;

const RULES_PER_CALL = 20;

export async function POST(request: Request) {
  let body: Partial<EvaluateRequest>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Send the profile and trial as JSON.", 400);
  }
  const { profile, trial } = body;
  if (!profile || typeof trial?.nctId !== "string" || typeof trial.eligibilityText !== "string") {
    return errorResponse("Both a patient profile and a trial are required.", 400);
  }

  const criteria = splitCriteria(trial.eligibilityText);
  if (!criteria.length) {
    const match = decideMatch(trial.nctId, trial.title, [], []);
    match.status = "possible";
    match.questions = ["This trial doesn't list its eligibility rules online. Ask the trial team whether you qualify."];
    return Response.json({ match } satisfies EvaluateResponse);
  }

  try {
    // Long rule lists (some trials have 60+) are checked in parallel batches so each Gemma call
    // finishes well inside the request's time budget.
    const batches = Array.from({ length: Math.ceil(criteria.length / RULES_PER_CALL) }, (_, i) =>
      criteria.slice(i * RULES_PER_CALL, (i + 1) * RULES_PER_CALL),
    );
    const replies = await Promise.all(
      batches.map((batch) =>
        generateJson(evaluatePrompt(profile, trial, batch), assessmentSchema(batch.map((c) => c.id))),
      ),
    );
    const plainSummary = replies.find((r) => r.plainSummary)?.plainSummary ?? "";
    const assessments = replies
      .flatMap((r) => r.results)
      .map((a) => ({ ...a, medicine: linkMedicine(a.medicine, profile.medications ?? []) }));
    const match = decideMatch(trial.nctId, plainSummary, criteria, assessments);
    return Response.json({ match } satisfies EvaluateResponse);
  } catch (err) {
    console.error(`evaluate ${trial.nctId} failed:`, err);
    return gemmaErrorResponse(err, "retry this trial");
  }
}
