import { test } from "node:test";
import assert from "node:assert/strict";
import { decideMatch, linkMedicine, toVerdict, type RuleAssessment } from "./match.ts";
import type { Criterion } from "./types.ts";

const rules: Criterion[] = [
  { id: 1, kind: "inclusion", text: "Metastatic HR+/HER2- breast cancer", group: null },
  { id: 2, kind: "inclusion", text: "ECOG 0-1", group: null },
  { id: 3, kind: "exclusion", text: "Prior chemotherapy for metastatic disease", group: null },
  { id: 4, kind: "inclusion", text: "Able to give informed consent", group: null },
];

const assess = (id: number, holds: RuleAssessment["holds"], extra: Partial<RuleAssessment> = {}): RuleAssessment => ({
  id,
  holds,
  siteCheck: false,
  reason: "r",
  evidence: null,
  question: holds === "unknown" ? `Question ${id}?` : null,
  medicine: null,
  ...extra,
});

test("exclusion rules flip: a true exclusion statement fails the patient", () => {
  assert.equal(toVerdict("inclusion", "yes"), "pass");
  assert.equal(toVerdict("inclusion", "no"), "fail");
  assert.equal(toVerdict("exclusion", "yes"), "fail");
  assert.equal(toVerdict("exclusion", "no"), "pass");
  assert.equal(toVerdict("exclusion", "unknown"), "unknown");
});

test("all rules satisfied -> likely; site-only rules don't count", () => {
  const m = decideMatch("NCT1", "s", rules, [
    assess(1, "yes"),
    assess(2, "yes"),
    assess(3, "no"),
    assess(4, "unknown", { siteCheck: true }),
  ]);
  assert.equal(m.status, "likely");
  assert.deepEqual(m.questions, []);
});

test("unknown medical rules -> possible, with their questions", () => {
  const m = decideMatch("NCT1", "s", rules, [assess(1, "yes"), assess(2, "unknown"), assess(3, "no"), assess(4, "yes")]);
  assert.equal(m.status, "possible");
  assert.deepEqual(m.questions, ["Question 2?"]);
});

test("a failed rule -> not eligible, listed as a blocker; missing assessments become unknown", () => {
  const m = decideMatch("NCT1", "s", rules, [assess(1, "yes"), assess(3, "yes")]);
  assert.equal(m.status, "not_eligible");
  assert.deepEqual(m.blockers.map((b) => b.id), [3]);
  assert.equal(m.results.find((r) => r.id === 2)!.verdict, "unknown");
});

test("medicine tags are kept only for current medications, by generic name", () => {
  const meds = [
    { name: "Tab. Claribid 500 mg", genericName: "Clarithromycin", dose: null, until: null, reason: null },
    { name: "Tab. Tegretol 200 mg", genericName: null, dose: null, until: null, reason: null },
  ];
  assert.equal(linkMedicine("clarithromycin", meds), "clarithromycin");
  assert.equal(linkMedicine("Claribid", meds), "clarithromycin");
  assert.equal(linkMedicine("tegretol", meds), "tab. tegretol 200 mg");
  assert.equal(linkMedicine("letrozole", meds), null);
  assert.equal(linkMedicine(null, meds), null);
});

test("a rule failed only because of a current medicine is a question for the doctor, not a verdict", () => {
  const m = decideMatch("NCT1", "s", rules, [
    assess(1, "yes"),
    assess(2, "yes"),
    assess(3, "yes", { medicine: "clarithromycin" }),
    assess(4, "yes"),
  ]);
  assert.equal(m.status, "possible");
  assert.deepEqual(m.blockers, []);
  assert.deepEqual(m.questions, ["Could clarithromycin be changed or finished before screening for this trial?"]);
  const other = decideMatch("NCT1", "s", rules, [assess(1, "no"), assess(2, "yes"), assess(3, "yes", { medicine: "clarithromycin" }), assess(4, "yes")]);
  assert.equal(other.status, "not_eligible");
  assert.deepEqual(other.blockers.map((b) => b.id), [1]);
});
