import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson } from "./gemma.ts";

test("extractJson reads the JSON inside a ```json fence", () => {
  const reply = 'Here is the result:\n```json\n{"results": [{"id": 1, "holds": "yes"}]}\n```\nLet me know if you need more.';
  assert.deepEqual(JSON.parse(extractJson(reply)), { results: [{ id: 1, holds: "yes" }] });
});

test("extractJson reads a fence without a language tag", () => {
  assert.deepEqual(JSON.parse(extractJson('```\n{"translations": ["a"]}\n```')), { translations: ["a"] });
});

test("extractJson drops text around the JSON", () => {
  const reply = 'Sure! {"plainSummary": "Tests a new drug.", "results": []} Hope this helps.';
  assert.deepEqual(JSON.parse(extractJson(reply)), { plainSummary: "Tests a new drug.", results: [] });
});

test("extractJson keeps a top-level array", () => {
  assert.deepEqual(JSON.parse(extractJson('The trials: [{"nctId": "NCT1"}, {"nctId": "NCT2"}] done.')), [
    { nctId: "NCT1" },
    { nctId: "NCT2" },
  ]);
  assert.deepEqual(JSON.parse(extractJson('```json\n["ஒன்று", "இரண்டு"]\n```')), ["ஒன்று", "இரண்டு"]);
});

test("extractJson leaves plain JSON as it is", () => {
  assert.equal(extractJson('  {"a": 1}\n'), '{"a": 1}');
});
