import type { EvaluateRequest, EvaluateResponse } from "@/lib/api";
import { splitCriteria } from "@/lib/criteria";
import { generateJson } from "@/lib/gemma";
import { errorResponse, gemmaErrorMessage } from "@/lib/http";
import { decideMatch } from "@/lib/match";
import { assessmentSchema, evaluatePrompt } from "@/lib/prompts";

export const maxDuration = 60;

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
    const reply = await generateJson(evaluatePrompt(profile, trial, criteria), assessmentSchema);
    const match = decideMatch(trial.nctId, reply.plainSummary, criteria, reply.results);
    return Response.json({ match } satisfies EvaluateResponse);
  } catch (err) {
    console.error(`evaluate ${trial.nctId} failed:`, err);
    return errorResponse(gemmaErrorMessage(err, "retry this trial"), 502);
  }
}
