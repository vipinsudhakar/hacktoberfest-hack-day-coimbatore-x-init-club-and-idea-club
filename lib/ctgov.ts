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
export interface CtgovStudy {
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

export function toTrial(study: CtgovStudy): Trial {
  const p = study.protocolSection;
  const eligibility = p.eligibilityModule ?? {};
  // Only Indian sites that are recruiting or about to open; searchTrials drops trials without one.
  const indiaSites: TrialSite[] = (p.contactsLocationsModule?.locations ?? [])
    .filter((l) => l.country === "India" && (l.status === "RECRUITING" || l.status === "NOT_YET_RECRUITING"))
    .map((l) => ({
      facility: l.facility ?? "Site name not listed",
      city: l.city ?? "",
      state: l.state ?? null,
      openingSoon: l.status === "NOT_YET_RECRUITING",
    }))
    .sort((a, b) => Number(a.openingSoon) - Number(b.openingSoon));
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

/**
 * Every recruiting trial with an Indian site that is recruiting or about to open, matching the search term.
 * `signal` covers every page; without one each page gets its own 20 s timeout.
 */
export async function searchTrials(searchTerm: string, signal?: AbortSignal): Promise<Trial[]> {
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
      signal: signal ?? AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`ClinicalTrials.gov returned ${response.status}`);
    const data = (await response.json()) as { studies?: CtgovStudy[]; nextPageToken?: string };
    const found = (data.studies ?? []).map(toTrial);
    found.forEach(rememberTrial);
    trials.push(...found);
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return trials.filter((t) => t.indiaSites.length > 0 && t.eligibilityText.trim());
}

const NCT_ID = /^NCT\d{8}$/;
const TRIAL_CACHE_MS = 60 * 60 * 1000;
const TRIAL_CACHE_SIZE = 2_000;
const LOOKUP_TIMEOUT_MS = 8_000;
const trialCache = new Map<string, { trial: Trial; expires: number }>();

/** True for a well-formed ClinicalTrials.gov ID such as "NCT01234567". */
export function isNctId(id: unknown): id is string {
  return typeof id === "string" && NCT_ID.test(id);
}

function rememberTrial(trial: Trial) {
  trialCache.delete(trial.nctId);
  trialCache.set(trial.nctId, { trial, expires: Date.now() + TRIAL_CACHE_MS });
  const oldest = trialCache.keys().next().value;
  if (trialCache.size > TRIAL_CACHE_SIZE && oldest) trialCache.delete(oldest);
}

/**
 * The registry's own copy of one trial, so a check never relies on trial text sent by the browser.
 * Looks in recent search results, then the saved snapshot, then asks ClinicalTrials.gov.
 * Null for a malformed ID, an unknown trial, or a registry that can't be reached.
 */
export async function getTrial(nctId: string, signal?: AbortSignal): Promise<Trial | null> {
  if (!isNctId(nctId)) return null;
  const cached = trialCache.get(nctId);
  if (cached && cached.expires > Date.now()) return cached.trial;

  try {
    const { snapshotTrial } = await import("./snapshot.ts");
    const saved = await snapshotTrial(nctId);
    if (saved) return saved;
  } catch (err) {
    console.error("saved copy of the registry unavailable:", err);
  }

  const timeout = AbortSignal.timeout(LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(`${API}/${nctId}?${new URLSearchParams({ fields: FIELDS })}`, {
      headers: { accept: "application/json" },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) {
      if (response.status !== 404) console.error(`ClinicalTrials.gov returned ${response.status} for ${nctId}`);
      return null;
    }
    const trial = toTrial((await response.json()) as CtgovStudy);
    if (trial.nctId !== nctId) return null;
    rememberTrial(trial);
    return trial;
  } catch (err) {
    console.error(`looking up ${nctId} failed:`, err);
    return null;
  }
}

const BLOOD_CANCERS =["leukemia", "lymphoma", "myeloma"];
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

/**
 * Puts the trials most likely to fit first, so strong matches show up early while checking runs.
 * Only reorders; every trial is still checked rule by rule.
 */
export function orderForChecking(trials: Trial[], profile: Pick<PatientProfile, "metastatic">): Trial[] {
  const score = (t: Trial) => {
    const text = `${t.title} ${t.conditions.join(" ")}`.toLowerCase();
    let s = t.phases.length ? 1 : 0; // treatment trials before observational studies
    if (profile.metastatic === true) {
      if (/metasta|advanced|unresectable|recurren|stage iv/.test(text)) s += 2;
      if (/early|adjuvant|operable|mastectomy|node.?negative/.test(text)) s -= 2;
    } else if (profile.metastatic === false) {
      if (/early|adjuvant|operable/.test(text)) s += 2;
      if (/metasta|advanced/.test(text)) s -= 1;
    }
    return s;
  };
  return [...trials].sort((a, b) => score(b) - score(a));
}
