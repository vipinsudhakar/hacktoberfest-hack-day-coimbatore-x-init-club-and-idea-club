import { test } from "node:test";
import assert from "node:assert/strict";
import { splitCriteria } from "./criteria.ts";

// Eligibility texts below are copied from ClinicalTrials.gov records (U.S. National Library of Medicine).

const NCT06312176 = `Inclusion Criteria:

* Has unresectable locally advanced or metastatic centrally-confirmed hormone receptor positive (HR+)/human epidermal growth factor receptor 2 negative (HER2-) breast cancer
* Has radiographic disease progression on one or more lines of endocrine therapy for unresectable locally advanced/metastatic HR+/HER2- breast cancer, with one in combination with a CDK4/6 inhibitor
* Is a chemotherapy candidate
* Has an eastern cooperative oncology group (ECOG) performance status of 0 to 1 assessed within 7 days before randomization
* Has adequate organ function
* Human immunodeficiency virus (HIV)-infected participants must have well controlled HIV on antiretroviral therapy
* Participants who are Hepatitis B surface antigen (HBsAg) positive are eligible if they have received HBV antiviral therapy for at least 4 weeks, and have undetectable HBV viral load
* Participants with a history of Hepatitis C virus (HCV) infection are eligible if HCV viral load is undetectable

Exclusion Criteria:

* Has breast cancer amenable to treatment with curative intent
* Has experienced an early recurrence (\\<6 months after completing adjuvant/neoadjuvant chemotherapy) and therefore is eligible to receive second-line (2L) treatment
* Has symptomatic advanced/metastatic visceral spread at risk of rapidly evolving into life-threatening complications
* Has received prior chemotherapy for unresectable locally advanced or metastatic breast cancer
* Active autoimmune disease that has required systemic treatment in the past 2 years
* History of (noninfectious) pneumonitis/interstitial lung disease that requires steroids, or has current pneumonitis/interstitial lung disease
* Has an active infection requiring systemic therapy`;

const NCT05277844 = `Inclusion Criteria:

1. Patients with pathologically proven diagnosis of NSCLC
2. Patients with positive oncogene driver mutation (EGFR or ALK/ROS)
3. Patients who have received at least 2-4 months of TKI therapy without progression
4. Patients with 1-5 sites of metastatic disease not including the primary tumor and regional nodes (less than 3 metastatic lesions in one organ will be eligible and 4 or more metastatic lesions in one organ will be ineligible)
5. Patients suitable for local consolidative therapy
6. Adequate end-organ function CBC/differential obtained within 15 days prior to registration on study, with adequate bone marrow function defined as follows:

   * Absolute neutrophil count (ANC) ≥ 500 cells/mm3;
   * Platelets ≥ 50,000 cells/mm3;
   * Hemoglobin ≥ 8.0 g/dl (Use of transfusion or other intervention to achieve Hgb ≥ 8.0 g/dl is acceptable);
7. Patients with ECOG performance status of 0-2
8. Age \\> 18 years
9. For females of child-bearing potential, negative serum or urine pregnancy test within 14 days prior to study registration

Exclusion Criteria:

1. Patients with progressive disease after 2-3 months of initial TKI therapy
2. Patients with negative oncogene driver mutations (EGFR/ALK/ROS)
3. Patients not suitable for local consolidative radiation therapy
4. Patients who are not suitable for further continuation of TKI therapy due to toxicity
5. Severe, active co-morbidity defined as follows:

   * Unstable angina and/or congestive heart failure requiring hospitalization within the last 6 months;
   * Transmural myocardial infarction within the last 6 months;
   * Chronic Obstructive Pulmonary Disease exacerbation or other respiratory illness requiring hospitalization or precluding study therapy at the time of registration;
6. Patients with prior history of radiation therapy to thorax
7. Patients with second malignancy (Synchronous or Metachronous)
8. Pregnancy`;

const count = (text: string) => {
  const rules = splitCriteria(text);
  return {
    inclusion: rules.filter((r) => r.kind === "inclusion").length,
    exclusion: rules.filter((r) => r.kind === "exclusion").length,
  };
};

test("flat bullet lists split into one rule per bullet", () => {
  assert.deepEqual(count(NCT06312176), { inclusion: 8, exclusion: 7 });
});

test("markdown escapes are removed", () => {
  const rules = splitCriteria(NCT06312176);
  assert.match(rules.find((r) => r.text.includes("early recurrence"))!.text, /\(<6 months/);
  assert.equal(splitCriteria(NCT05277844).find((r) => r.text.startsWith("Age"))!.text, "Age > 18 years");
});

test("nested rules replace their lead-in line and remember it as the group", () => {
  assert.deepEqual(count(NCT05277844), { inclusion: 11, exclusion: 10 });
  const anc = splitCriteria(NCT05277844).find((r) => r.text.startsWith("Absolute neutrophil"))!;
  assert.equal(anc.kind, "inclusion");
  assert.equal(anc.text, "Absolute neutrophil count (ANC) ≥ 500 cells/mm3");
  assert.match(anc.group!, /^Adequate end-organ function/);
  const angina = splitCriteria(NCT05277844).find((r) => r.text.startsWith("Unstable angina"))!;
  assert.equal(angina.kind, "exclusion");
});

test("ids are sequential", () => {
  const rules = splitCriteria(NCT05277844);
  assert.deepEqual(rules.map((r) => r.id), rules.map((_, i) => i + 1));
});

test("text without headings is treated as inclusion, mixed notes are ignored", () => {
  const rules = splitCriteria(
    "* Age 18 or older\n* Confirmed diagnosis\n  of gastric cancer\n\nOther inclusion/exclusion criteria may apply",
  );
  assert.deepEqual(
    rules.map((r) => [r.kind, r.text]),
    [
      ["inclusion", "Age 18 or older"],
      ["inclusion", "Confirmed diagnosis of gastric cancer"],
    ],
  );
});

test("lead-in lines: kept when they state a rule, dropped when they only introduce one", () => {
  const rules = splitCriteria(
    "Inclusion Criteria\n\n* Adequate organ function:\n* ECOG 0-1\n\nExclusion Criteria\n\n* Participants are excluded if any of the following criteria apply\n* Pregnancy",
  );
  assert.deepEqual(
    rules.map((r) => [r.kind, r.text]),
    [
      ["inclusion", "Adequate organ function"],
      ["inclusion", "ECOG 0-1"],
      ["exclusion", "Pregnancy"],
    ],
  );
});

test("short labels with nested rules become groups; placeholders and notes are skipped", () => {
  const rules = splitCriteria(
    "Inclusion Criteria:\n\n* Age\n  * 18 years or older\n* Part A\n  * Confirmed NSCLC\n\nExclusion Criteria:\n\n* None\n* Other protocol-defined Inclusion/Exclusion criteria apply",
  );
  assert.deepEqual(
    rules.map((r) => [r.kind, r.group, r.text]),
    [
      ["inclusion", "Age", "18 years or older"],
      ["inclusion", "Part A", "Confirmed NSCLC"],
    ],
  );
  assert.deepEqual(rules.map((r) => r.id), [1, 2]);
});
