import { test } from "node:test";
import assert from "node:assert/strict";
import { checkDocuments } from "./documents.ts";

const doc = (page: number, isMedical: boolean, note = "") => ({ page, isMedical, kind: isMedical ? "clinic summary" : "not a medical document", note });

test("medical photos pass with nothing skipped", () => {
  assert.deepEqual(checkDocuments([doc(1, true), doc(2, true)], 2), { ok: true, skipped: [] });
});

test("a mix passes and lists the non-medical photos as skipped", () => {
  const result = checkDocuments([doc(1, true), doc(2, false, "a screenshot of a chat")], 2);
  assert.equal(result.ok, true);
  assert.deepEqual(result.ok && result.skipped.map((d) => d.page), [2]);
});

test("no medical photos is refused with a plain explanation per photo", () => {
  const result = checkDocuments([doc(2, false, "a plate of food"), doc(1, false, "A photo of a person")], 2);
  assert.deepEqual(result, {
    ok: false,
    message:
      "These photos don't look like medical documents. Photo 1 looks like a photo of a person, not a medical report. Photo 2 looks like a plate of food, not a medical report. Add photos of the patient's reports or prescriptions.",
  });
});

test("a missing or partial classification never blocks", () => {
  assert.deepEqual(checkDocuments([], 1), { ok: true, skipped: [] });
  assert.equal(checkDocuments([doc(1, false, "a cat")], 2).ok, true);
});

test("a single photo is described in the singular", () => {
  const result = checkDocuments([doc(1, false, "A recipe for coconut chutney")], 1);
  assert.equal(result.ok === false && result.message, "This photo doesn't look like a medical document. Photo 1 looks like a recipe for coconut chutney, not a medical report. Add photos of the patient's reports or prescriptions.");
});
