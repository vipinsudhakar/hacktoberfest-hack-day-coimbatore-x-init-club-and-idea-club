import { test } from "node:test";
import assert from "node:assert/strict";
import { gemmaErrorMessage, gemmaErrorResponse, retryAfterSeconds } from "./http.ts";

const rateLimit = new Error(
  '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","details":[{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"23s"}]}}',
);

test("rate limits become 429 with Gemma's suggested wait", async () => {
  const res = gemmaErrorResponse(rateLimit, "retry this trial");
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "23");
  assert.deepEqual(await res.json(), {
    error: "Gemma's free usage limit is busy right now. Wait a minute, then retry this trial.",
    retryAfterSeconds: 23,
  });
});

test("retry delay falls back to 20 s and is capped at a minute", () => {
  assert.equal(retryAfterSeconds("429 Too Many Requests"), 20);
  assert.equal(retryAfterSeconds('"retryDelay": "95.5s"'), 60);
});

test("other failures are 502 with a plain message", () => {
  assert.equal(gemmaErrorResponse(new Error("socket hang up"), "retry").status, 502);
  assert.equal(gemmaErrorMessage(new Error("Request timed out"), "retry"), "Gemma took too long to answer. Please retry.");
  assert.equal(gemmaErrorMessage(new Error("HTTP 4290 bytes"), "retry"), "Gemma couldn't finish this step. Please retry.");
});
