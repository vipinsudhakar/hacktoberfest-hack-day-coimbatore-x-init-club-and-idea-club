import { test } from "node:test";
import assert from "node:assert/strict";
import { buildTrialMessage, preferredSite } from "./message.ts";
import type { PatientProfile, Trial, TrialMatch } from "../types.ts";

const trial = {
  nctId: "NCT06312176",
  title: "A Study of Sacituzumab Tirumotecan",
  indiaSites: [
    { facility: "Tata Memorial Hospital", city: "Mumbai", state: null, openingSoon: false },
    { facility: "Kovai Medical Center", city: "Coimbatore", state: null, openingSoon: false },
  ],
} as Trial;

const profile = {
  age: 52,
  sex: "female",
  city: "Kovai",
  cancerType: "breast cancer",
  histology: "invasive ductal carcinoma",
  stage: "Stage IV",
  biomarkers: [{ name: "HER2", result: "negative (IHC 1+)" }],
  treatments: [{ name: "Palbociclib + fulvestrant", type: "targeted", details: null, outcome: "progressed Sep 2026" }],
  ecog: 1,
  medications: [{ name: "Clarithromycin 500 mg", genericName: "clarithromycin", dose: null, until: "06-Oct-2026", reason: null }],
} as PatientProfile;

const match = { questions: ["What is my creatinine clearance?"] } as TrialMatch;

test("the site in the patient's city is preferred, using city aliases", () => {
  assert.equal(preferredSite(trial, profile.city)?.facility, "Kovai Medical Center");
  assert.equal(preferredSite(trial, "Delhi")?.facility, "Tata Memorial Hospital");
});

test("the message carries the medical facts and questions, and no name", () => {
  const text = buildTrialMessage(trial, match, profile);
  assert.match(text, /NCT06312176: A Study of Sacituzumab Tirumotecan/);
  assert.match(text, /- 52-year-old female, breast cancer \(invasive ductal carcinoma\)/);
  assert.match(text, /- Previous treatment: Palbociclib \+ fulvestrant \(progressed Sep 2026\)/);
  assert.match(text, /- Current medicines: Clarithromycin 500 mg, until 06-Oct-2026/);
  assert.match(text, /screening at Kovai Medical Center, Coimbatore\?/);
  assert.match(text, /- What is my creatinine clearance\?/);
  assert.doesNotMatch(text, /Meena/);
});
