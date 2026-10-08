import type { PatientProfile, Trial, TrialContact, TrialSite } from "./types";

// ClinicalTrials.gov API v2 – public, no key needed. https://clinicaltrials.gov/data-api/api
const API = "https://clinicaltrials.gov/api/v2/studies";

const FIELDS = [
  "NCTId",
  "BriefTitle",
  "Phase",
  "Condition",
  "InterventionName",
  "BriefSummary",
  "EligibilityCriteria",
  "MinimumAge",
  "MaximumAge",
  "Sex",
  "LocationFacility",
  "LocationCity",
  "LocationState",
  "LocationCountry",
  "LocationStatus",
  "CentralContactName",
  "CentralContactPhone",
  "CentralContactEMail",
].join(",");

/** "18 Years" -> 18, "6 Months" -> 0.5; missing or "N/A" -> null. */
export function parseAgeYears(age: string | undefined): number | null {
  const match = age?.match(/^(\d+(?:\.\d+)?)\s*(year|month|week|day)/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const perYear = { year: 1, month: 12, week: 52, day: 365 }[unit as "year" | "month" | "week" | "day"];
  return Math.round((value / perYear) * 10) / 10;
}

// Only the parts of the API's study record that we read.
interface Study {
  protocolSection: {
    identificationModule: { nctId: string; briefTitle: string };
    descriptionModule?: { briefSummary?: string };
    conditionsModule?: { conditions?: string[] };
    designModule?: { phases?: string[] };
    armsInterventionsModule?: { interventions?: { name: string }[] };
    eligibilityModule?: { eligibilityCriteria?: string; minimumAge?: string; maximumAge?: string; sex?: string };
    contactsLocationsModule?: {
      centralContacts?: { name?: string; phone?: string; email?: string }[];
      locations?: { facility?: string; city?: string; state?: string; country?: string; status?: string }[];
    };
  };
}

export function toTrial(study: Study): Trial {
  const p = study.protocolSection;
  const eligibility = p.eligibilityModule ?? {};
  const locations = p.contactsLocationsModule?.locations ?? [];
  // Prefer sites that are actively recruiting, but keep the others when none are.
  const india = locations.filter((l) => l.country === "India");
  const recruiting = india.filter((l) => !l.status || l.status === "RECRUITING" || l.status === "NOT_YET_RECRUITING");
  const indiaSites: TrialSite[] = (recruiting.length ? recruiting : india).map((l) => ({
    facility: l.facility ?? "Site name not listed",
    city: l.city ?? "",
    state: l.state ?? null,
  }));
  const contacts: TrialContact[] = (p.contactsLocationsModule?.centralContacts ?? []).map((c) => ({
    name: c.name ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
  }));
  const sex = eligibility.sex === "FEMALE" || eligibility.sex === "MALE" ? eligibility.sex : "ALL";

  return {
    nctId: p.identificationModule.nctId,
    title: p.identificationModule.briefTitle,
    phases: (p.designModule?.phases ?? []).filter((ph) => ph !== "NA"),
    conditions: p.conditionsModule?.conditions ?? [],
    interventions: [...new Set((p.armsInterventionsModule?.interventions ?? []).map((i) => i.name))],
    summary: p.descriptionModule?.briefSummary ?? "",
    minAgeYears: parseAgeYears(eligibility.minimumAge),
    maxAgeYears: parseAgeYears(eligibility.maximumAge),
    sex,
    eligibilityText: eligibility.eligibilityCriteria ?? "",
    indiaSites,
    contacts,
    url: `https://clinicaltrials.gov/study/${p.identificationModule.nctId}`,
  };
}

/** Every recruiting trial with a site in India whose conditions match the search term. */
export async function searchTrials(searchTerm: string): Promise<Trial[]> {
  const trials: Trial[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 3; page++) {
    const params = new URLSearchParams({
      "query.cond": searchTerm,
      "query.locn": "India",
      "filter.overallStatus": "RECRUITING",
      fields: FIELDS,
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`${API}?${params}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`ClinicalTrials.gov returned ${response.status}`);
    const data = (await response.json()) as { studies?: Study[]; nextPageToken?: string };
    trials.push(...(data.studies ?? []).map(toTrial));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return trials.filter((t) => t.indiaSites.length > 0 && t.eligibilityText.trim());
}

const BLOOD_CANCERS = ["leukemia", "lymphoma", "myeloma"];
const ORGANS = [
  "head and neck", "breast", "lung", "cervical", "ovarian", "endometrial", "uterine", "prostate", "colorectal",
  "colon", "rectal", "gastric", "stomach", "esophageal", "liver", "pancreatic", "oral", "thyroid", "bladder",
  "kidney", "renal", "brain", "skin", "bone",
];

/** A wider search term for when a specific one ("invasive ductal carcinoma of breast") finds nothing. */
export function broaderSearchTerm(term: string): string | null {
  const t = term.toLowerCase();
  const blood = BLOOD_CANCERS.find((b) => t.includes(b));
  if (blood) return blood === "myeloma" ? "multiple myeloma" : blood;
  const organ = ORGANS.find((o) => t.includes(o));
  const broader = organ ? `${organ} cancer` : null;
  return broader && broader !== t ? broader : null;
}

/** Drops trials the patient clearly can't join on age or sex; unknown values never exclude. */
export function filterByAgeAndSex(trials: Trial[], profile: Pick<PatientProfile, "age" | "sex">): Trial[] {
  return trials.filter((t) => {
    if (profile.age != null) {
      if (t.minAgeYears != null && profile.age < t.minAgeYears) return false;
      if (t.maxAgeYears != null && profile.age > t.maxAgeYears) return false;
    }
    if (profile.sex && t.sex !== "ALL" && t.sex !== profile.sex.toUpperCase()) return false;
    return true;
  });
}
