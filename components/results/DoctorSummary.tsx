import type { TrialsResponse } from "@/lib/api";
import { ECOG_LABELS, TREATMENT_TYPES } from "@/lib/client/profile";
import { openRules, rowFilterKey, sortRows, type TrialRow } from "@/lib/client/results";
import type { PatientProfile } from "@/lib/types";
import { DISCLAIMER_BODY, DISCLAIMER_LEAD } from "../Disclaimer";
import { STATUS_META } from "./StatusBadge";

const join = (items: (string | null | undefined)[], sep = "; ") => items.filter(Boolean).join(sep);

function profileRows(p: PatientProfile): [string, string][] {
  const typeLabel = (t: string) => TREATMENT_TYPES.find((x) => x.value === t)?.label ?? t;
  const rows: [string, string][] = [
    ["Age / sex", join([p.age !== null ? `${p.age} years` : null, p.sex], ", ")],
    ["City", p.city ?? ""],
    ["Cancer type", p.cancerType ?? ""],
    ["Histology", p.histology ?? ""],
    ["Stage", p.stage ?? ""],
    [
      "Metastatic",
      p.metastatic === null ? "" : p.metastatic ? join(["Yes", p.metastasisSites.join(", ")], ": ") : "No",
    ],
    ["Biomarkers", join(p.biomarkers.map((b) => `${b.name}: ${b.result}`))],
    ["Treatments", join(p.treatments.map((t) => join([`${t.name} (${typeLabel(t.type)})`, t.details, t.outcome], ", ")))],
    ["ECOG", p.ecog !== null ? (ECOG_LABELS[p.ecog] ?? String(p.ecog)) : ""],
    ["Labs", join(p.labs.map((l) => join([l.name, l.value, l.unit], " ")))],
    ["Other conditions", p.comorbidities.join(", ")],
    ["Other findings", p.otherFindings.join(", ")],
  ];
  return rows.map(([k, v]) => [k, v || "Not stated"]);
}

/** Print-only page for the oncologist; shown by the browser's print dialog, hidden on screen. */
export function DoctorSummary({
  profile,
  response,
  rows,
  printedAt,
}: {
  profile: PatientProfile;
  response: TrialsResponse;
  rows: TrialRow[];
  printedAt: string | null;
}) {
  const count = (key: string) => rows.filter((r) => rowFilterKey(r) === key).length;
  const unchecked = rows.filter((r) => r.evaluation.state !== "done").length;
  const shortlist = sortRows(rows).flatMap((r) =>
    r.evaluation.state === "done" && r.evaluation.match.status !== "not_eligible"
      ? [{ trial: r.trial, match: r.evaluation.match }]
      : [],
  );

  return (
    <div className="hidden text-[10.5pt] leading-snug text-black print:block">
      <header className="border-b-2 border-black pb-2">
        <p className="text-[9pt] uppercase tracking-wider">TrialBridge · AI-assisted clinical trial screening</p>
        <h1 className="font-serif text-[18pt] font-semibold">Clinical trial summary for the oncologist</h1>
        <p>{printedAt ? `Prepared ${printedAt}.` : ""} For discussion with the patient&apos;s treating oncologist.</p>
      </header>

      <h2 className="mt-4 font-serif text-[13pt] font-semibold">Patient details (checked by the user)</h2>
      <table className="mt-1 w-full border-collapse">
        <tbody>
          {profileRows(profile).map(([label, value]) => (
            <tr key={label} className="border-b border-gray-300 align-top">
              <th scope="row" className="w-40 py-1 pr-3 text-left font-semibold">{label}</th>
              <td className="py-1">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-5 font-serif text-[13pt] font-semibold">
        Trials the patient may qualify for ({shortlist.length})
      </h2>
      <p className="mt-1">
        ClinicalTrials.gov search: &ldquo;{response.searchTerm}&rdquo;, recruiting in India
        {response.source === "snapshot" ? " (saved copy of the registry)" : ""}. {rows.length} trials were checked
        rule by rule by Gemma 4: {count("likely")} likely, {count("possible")} possible, {count("not_eligible")} not
        eligible{unchecked > 0 ? `, ${unchecked} not checked` : ""}.
      </p>
      {shortlist.length === 0 && <p className="mt-2">No likely or possible matches were found.</p>}

      {shortlist.map(({ trial, match }) => {
        const open = openRules(match.results);
        return (
          <section key={trial.nctId} className="mt-4 break-inside-avoid border border-gray-400 p-3">
            <p className="text-[9pt] font-semibold uppercase">{STATUS_META[match.status].label}</p>
            <h3 className="font-semibold">
              {trial.nctId}: {trial.title}
            </h3>
            <p className="text-[9pt]">{trial.url}</p>
            {match.plainSummary && <p className="mt-1">{match.plainSummary}</p>}
            {trial.indiaSites.length > 0 && (
              <p className="mt-1">
                <strong>Sites:</strong>{" "}
                {join(trial.indiaSites.map((s) => `${s.facility} (${join([s.city, s.state], ", ")})${s.openingSoon ? ", opening soon" : ""}`))}
              </p>
            )}
            {trial.contacts.length > 0 && (
              <p className="mt-1">
                <strong>Contacts:</strong> {join(trial.contacts.map((c) => join([c.name, c.phone, c.email], ", ")))}
              </p>
            )}
            {match.questions.length > 0 && (
              <>
                <p className="mt-1 font-semibold">Questions to settle:</p>
                <ul className="list-disc pl-5">{match.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
              </>
            )}
            {open.length > 0 && (
              <>
                <p className="mt-1 font-semibold">Rules the reports didn&apos;t settle:</p>
                <ul className="list-disc pl-5">
                  {open.map((r) => (
                    <li key={r.id}>
                      {r.kind === "exclusion" ? "Exclusion: " : ""}
                      {r.text}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        );
      })}

      <p className="mt-5 border-t border-gray-400 pt-2 text-[9pt]">
        <strong>{DISCLAIMER_LEAD}</strong> {DISCLAIMER_BODY} Trial information comes from ClinicalTrials.gov and
        may have changed since it was retrieved.
      </p>
    </div>
  );
}
