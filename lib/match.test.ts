import { test } from "node:test";
import assert from "node:assert/strict";
import { decideMatch, toVerdict, type RuleAssessment } from "./match.ts";
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
