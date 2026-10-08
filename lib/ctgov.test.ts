import { test } from "node:test";
import assert from "node:assert/strict";
import {
  broaderSearchTerm,
  filterByAgeAndSex,
  getTrial,
  orderForChecking,
  parseAgeYears,
  toTrial,
  type CtgovStudy,
} from "./ctgov.ts";

test("a malformed trial ID is refused without asking the registry", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("fetch should not be called");
  };
  try {
    for (const id of ["", "NCT123", "nct01234567", "NCT01234567/../x", "NCT012345678", "../studies"]) {
      assert.equal(await getTrial(id), null);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});
import type { Trial } from "./types.ts";

const trial = (nctId: string, overrides: Partial<Trial> = {}): Trial => ({
  nctId,
  title: nctId,
  phases: [],
  conditions: [],
  interventions: [],
  summary: "",
  minAgeYears: null,
  maxAgeYears: null,
  sex: "ALL",
  eligibilityText: "* rule",
  indiaSites: [{ facility: "Hospital", city: "Chennai", state: null, openingSoon: false }],
  contacts: [],
  url: "",
  ...overrides,
});

test("ages from the registry are converted to years", () => {
  assert.equal(parseAgeYears("18 Years"), 18);
  assert.equal(parseAgeYears("6 Months"), 0.5);
  assert.equal(parseAgeYears("N/A"), null);
  assert.equal(parseAgeYears(undefined), null);
});

test("age and sex limits filter trials, unknown patient values never exclude", () => {
  const trials = [
    trial("ADULT", { minAgeYears: 18, maxAgeYears: 65 }),
    trial("WOMEN", { sex: "FEMALE" }),
    trial("ELDERLY", { minAgeYears: 70 }),
  ];
  assert.deepEqual(filterByAgeAndSex(trials, { age: 52, sex: "male" }).map((t) => t.nctId), ["ADULT"]);
  assert.deepEqual(filterByAgeAndSex(trials, { age: null, sex: null }).map((t) => t.nctId), ["ADULT", "WOMEN", "ELDERLY"]);
});

test("specific cancer names widen to the organ, blood cancers keep their family name", () => {
  assert.equal(broaderSearchTerm("Invasive ductal carcinoma of the breast"), "breast cancer");
  assert.equal(broaderSearchTerm("non-small cell lung cancer"), "lung cancer");
  assert.equal(broaderSearchTerm("acute myeloid leukemia"), "leukemia");
  assert.equal(broaderSearchTerm("breast cancer"), null);
});

test("metastatic patients see advanced-disease treatment trials first, early-stage trials last", () => {
  const ordered = orderForChecking(
    [
      trial("EARLY", { title: "Ribociclib in Early Breast Cancer", phases: ["PHASE3"] }),
      trial("SURVEY", { title: "Quality of life survey" }),
      trial("METASTATIC", { title: "New drug in metastatic breast cancer", phases: ["PHASE3"] }),
    ],
    { metastatic: true },
  );
  assert.deepEqual(ordered.map((t) => t.nctId), ["METASTATIC", "SURVEY", "EARLY"]);
});

test("only Indian sites that are recruiting or about to open are kept", () => {
  const study = (nctId: string, sites: [string, string][]): CtgovStudy => ({
    protocolSection: {
      identificationModule: { nctId, briefTitle: nctId },
      contactsLocationsModule: {
        locations: sites.map(([country, status], i) => ({ facility: `Site ${i}`, city: "Chennai", country, status })),
      },
    },
  });
  const mixed = toTrial(
    study("MIXED", [
      ["India", "NOT_YET_RECRUITING"],
      ["India", "RECRUITING"],
      ["India", "WITHDRAWN"],
      ["United States", "RECRUITING"],
    ]),
  );
  assert.deepEqual(
    mixed.indiaSites.map((s) => [s.facility, s.openingSoon]),
    [
      ["Site 1", false],
      ["Site 0", true],
    ],
  );
  const closed = toTrial(study("CLOSED", [["India", "ACTIVE_NOT_RECRUITING"], ["India", "TERMINATED"]]));
  assert.deepEqual(closed.indiaSites, []);
});
