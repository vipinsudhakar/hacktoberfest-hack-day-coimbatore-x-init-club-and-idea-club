// Saves recruiting trials in India for common cancers to data/ctgov-snapshot.json.
// /api/trials falls back to this copy when ClinicalTrials.gov can't be reached.
// Run with: npm run snapshot
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { searchTrials } from "../lib/ctgov.ts";
import type { Trial } from "../lib/types.ts";

const TERMS = [
  "breast cancer",
  "non-small cell lung cancer",
  "lung cancer",
  "head and neck cancer",
  "oral cancer",
  "cervical cancer",
  "ovarian cancer",
  "colorectal cancer",
  "gastric cancer",
  "prostate cancer",
  "leukemia",
  "lymphoma",
  "multiple myeloma",
];

const searches: Record<string, Trial[]> = {};
for (const term of TERMS) {
  searches[term] = await searchTrials(term);
  console.log(`${term}: ${searches[term].length} trials`);
}

const file = new URL("../data/ctgov-snapshot.json", import.meta.url);
writeFileSync(file, JSON.stringify({ savedAt: new Date().toISOString(), searches }) + "\n");
console.log(`saved ${fileURLToPath(file)}`);
