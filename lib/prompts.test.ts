import { test } from "node:test";
import assert from "node:assert/strict";
import { assessmentSchema, translateSchema } from "./prompts.ts";

const result = (id: number) => ({
  id,
  holds: "yes",
  siteCheck: false,
  reason: "The reports say so.",
  evidence: null,
  question: null,
  medicine: null,
});

const reply = (ids: number[]) => ({ plainSummary: "Tests a new drug for breast cancer.", results: ids.map(result) });

/** The validation messages, or "" when the reply is accepted. */
function problems(parsed: { error?: { issues: { message: string }[] } }): string {
  return parsed.error?.issues.map((i) => i.message).join("; ") ?? "";
}

test("assessmentSchema accepts exactly one result per rule", () => {
  const parsed = assessmentSchema([1, 2, 3]).safeParse(reply([3, 1, 2]));
  assert.equal(problems(parsed), "");
  assert.deepEqual(
    parsed.data?.results.map((r) => r.id),
    [3, 1, 2],
  );
});

test("assessmentSchema rejects a reply that skips a rule", () => {
  const parsed = assessmentSchema([1, 2, 3]).safeParse(reply([1, 3]));
  assert.equal(parsed.success, false);
  assert.match(problems(parsed), /missing rule ids 2/);
});

test("assessmentSchema rejects a rule answered twice", () => {
  const parsed = assessmentSchema([1, 2, 3]).safeParse(reply([1, 2, 2, 3]));
  assert.equal(parsed.success, false);
  assert.match(problems(parsed), /duplicate rule ids 2/);
});

test("assessmentSchema rejects a rule id that wasn't asked about", () => {
  const parsed = assessmentSchema([1, 2, 3]).safeParse(reply([1, 2, 3, 7]));
  assert.equal(parsed.success, false);
  assert.match(problems(parsed), /unexpected or duplicate rule ids 7/);
});

test("translateSchema needs exactly one translation per text", () => {
  const schema = translateSchema(2);
  assert.equal(schema.safeParse({ translations: ["ஒன்று", "இரண்டு"] }).success, true);
  for (const translations of [["ஒன்று"], ["ஒன்று", "இரண்டு", "மூன்று"]]) {
    const parsed = schema.safeParse({ translations });
    assert.equal(parsed.success, false);
    assert.match(problems(parsed), /exactly 2 items/);
  }
});
