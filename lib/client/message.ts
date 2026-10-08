import type { PatientProfile, Trial, TrialMatch, TrialSite } from "../types";
import { sameCity } from "./results.ts";

/** The site to mention: one in the patient's city if there is one, otherwise the first recruiting site. */
export function preferredSite(trial: Trial, city: string | null): TrialSite | null {
  return trial.indiaSites.find((s) => sameCity(s.city, city)) ?? trial.indiaSites[0] ?? null;
}

/**
 * A de-identified note the family can send to the trial team: no name or ID, only the medical facts
 * needed for pre-screening, the open questions, and the site they would like to go to.
 */
export function buildTrialMessage(trial: Trial, match: TrialMatch, profile: PatientProfile): string {
  const who = [profile.age != null ? `${profile.age}-year-old` : null, profile.sex].filter(Boolean).join(" ");
  const diagnosis = [profile.cancerType, profile.histology ? `(${profile.histology})` : null].filter(Boolean).join(" ");
  const facts = [
    who || diagnosis ? `- ${[who, diagnosis].filter(Boolean).join(", ")}` : null,
    profile.stage ? `- Stage: ${profile.stage}` : null,
    profile.biomarkers.length ? `- Biomarkers: ${profile.biomarkers.map((b) => `${b.name} ${b.result}`).join("; ")}` : null,
    profile.treatments.length
      ? `- Previous treatment: ${profile.treatments.map((t) => (t.outcome ? `${t.name} (${t.outcome})` : t.name)).join("; ")}`
      : null,
    profile.ecog != null ? `- ECOG performance status: ${profile.ecog}` : null,
    profile.medications.length
      ? `- Current medicines: ${profile.medications.map((m) => [m.name, m.until ? `until ${m.until}` : null].filter(Boolean).join(", ")).join("; ")}`
      : null,
  ].filter(Boolean);

  const site = preferredSite(trial, profile.city);
  const where = site ? ` at ${site.facility}${site.city ? `, ${site.city}` : ""}` : "";
  const questions = match.questions.length
    ? ["", "We would also like to ask:", ...match.questions.map((q) => `- ${q}`)]
    : [];

  return [
    "Hello,",
    "",
    `I am writing on behalf of a patient about the clinical trial ${trial.nctId}: ${trial.title}.`,
    "",
    "Patient summary (no name or ID):",
    ...facts,
    "",
    `Could the patient be considered for screening${where}?`,
    ...questions,
    "",
    "Thank you.",
    "(Prepared with TrialBridge from the patient's reports. The patient's oncologist will confirm the details.)",
  ].join("\n");
}
