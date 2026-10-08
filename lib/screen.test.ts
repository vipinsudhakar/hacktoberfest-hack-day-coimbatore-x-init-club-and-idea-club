import { test } from "node:test";
import assert from "node:assert/strict";
import { applyScreen } from "./screen.ts";
import type { Trial } from "./types.ts";

const trial = (nctId: string) => ({ nctId }) as Trial;

test("skipped trials are set aside with their reason; everything else is checked", () => {
  const { toCheck, screenedOut } = applyScreen(
    [trial("A"), trial("B"), trial("C"), trial("D")],
    [
      { nctId: "A", decision: "check", reason: "Metastatic HR+ breast cancer" },
      { nctId: "B", decision: "skip", reason: "For early, operable breast cancer" },
      { nctId: "C", decision: "skip", reason: "  " },
    ],
  );
  assert.deepEqual(toCheck.map((t) => t.nctId), ["A", "C", "D"]);
  assert.deepEqual(screenedOut.map((s) => [s.trial.nctId, s.reason]), [["B", "For early, operable breast cancer"]]);
});
