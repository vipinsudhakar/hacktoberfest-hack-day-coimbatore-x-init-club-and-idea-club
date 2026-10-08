import { medicineGroups, type MedicineGroup, type TrialRow } from "@/lib/client/results";
import type { Medication } from "@/lib/types";
import { AlertTriangle, Pill } from "../Icons";
import { sectionTitle, textLink } from "../ui";
import { VERDICT_META } from "./StatusBadge";

const shortTitle = (title: string) => (title.length > 90 ? `${title.slice(0, 88).trimEnd()}…` : title);

function MedicineBlock({ group }: { group: MedicineGroup }) {
  const serious = group.notes.filter((n) => n.rule.verdict !== "pass");
  const fine = group.notes.filter((n) => n.rule.verdict === "pass");
  const med = group.medication;
  const details = [med?.dose, med?.until ? `until ${med.until}` : null, med?.reason ? `for ${med.reason}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <h3 className="font-semibold text-ink">
        <span className="capitalize">{group.label}</span>
        {med && med.name && med.genericName && med.name.toLowerCase() !== med.genericName.toLowerCase() && (
          <span className="font-normal text-ink-3"> ({med.name})</span>
        )}
      </h3>
      {details && <p className="text-sm text-ink-3">{details}</p>}
      {!med && <p className="text-sm text-ink-3">Named by a trial rule; not on the medicines list you checked.</p>}

      {serious.length > 0 && (
        <ul className="mt-3 space-y-4">
          {serious.map(({ trial, rule }) => {
            const meta = VERDICT_META[rule.verdict];
            return (
              <li key={`${trial.nctId}-${rule.id}`} className="flex gap-3">
                <meta.Icon size={20} className={`mt-0.5 shrink-0 ${meta.color}`} />
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {rule.verdict === "fail" ? "Rules the patient out while taking it" : "Ask your doctor"}
                    <span className="font-normal text-ink-3">
                      {" "}
                      · <span className="font-mono">{trial.nctId}</span> {shortTitle(trial.title)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-ink-2">
                    <span className="text-ink-3">Trial rule: </span>
                    {rule.text}
                  </p>
                  {rule.reason && <p className="mt-0.5 text-sm text-ink-2">{rule.reason}</p>}
                  {rule.verdict === "fail" && med?.until && (
                    <p className="mt-1 text-sm text-ink">
                      Prescribed until: {med.until}. Ask the doctor whether this trial could be possible once the
                      medicine has finished.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {fine.length > 0 && (
        <p className="mt-3 flex gap-3 text-sm text-ink-2">
          <VERDICT_META.pass.Icon size={18} className="mt-px shrink-0 text-pass" />
          <span>
            Not a problem for {fine.length === 1 ? "1 other trial" : `${fine.length} other trials`}:{" "}
            <span className="font-mono">{[...new Set(fine.map((n) => n.trial.nctId))].join(", ")}</span>
          </span>
        </p>
      )}
    </li>
  );
}

/** "Your medicines and these trials": every checked rule that is about one of the patient's medicines. */
export function MedicinesPanel({
  medications,
  rows,
  onEditProfile,
}: {
  medications: Medication[];
  rows: TrialRow[];
  onEditProfile: () => void;
}) {
  const checked = rows.filter((r) => r.evaluation.state === "done").length;
  const allDone = rows.every((r) => r.evaluation.state === "done" || r.evaluation.state === "error");
  const groups = medicineGroups(medications, rows);
  const withNotes = groups.filter((g) => g.notes.length > 0);
  const quiet = groups.filter((g) => g.notes.length === 0 && g.medication);
  const soFar = allDone ? "" : " so far";

  return (
    <section aria-labelledby="medicines-heading" className="rounded-lg border border-line bg-white px-5 py-6 sm:px-7">
      <div className="flex items-start gap-3">
        <Pill size={22} className="mt-1 shrink-0 text-accent" />
        <div className="min-w-0">
          <h2 id="medicines-heading" className={sectionTitle}>
            Your medicines and these trials
          </h2>
          <p className="mt-1 max-w-[40rem] text-sm text-ink-2">
            Some trials have rules about other medicines the patient takes. This is what the {checked}{" "}
            {checked === 1 ? "trial" : "trials"} checked{soFar} say about the medicines you listed.
          </p>
        </div>
      </div>

      <p className="mt-4 flex gap-2.5 rounded-md bg-ask-soft px-3 py-2.5 text-ink">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-ask" />
        <strong className="font-semibold">Never stop or change a medicine without talking to your doctor first.</strong>
      </p>

      {medications.length === 0 && withNotes.length === 0 ? (
        <p className="mt-5 text-ink-2">
          No current medicines were listed, so trial rules about other medicines couldn&apos;t be checked.{" "}
          <button type="button" onClick={onEditProfile} className={`${textLink} inline-flex min-h-11 items-center`}>
            Add the patient&apos;s medicines
          </button>
        </p>
      ) : withNotes.length === 0 ? (
        <p className="mt-5 text-ink-2">
          None of the trials checked{soFar} has a rule about{" "}
          {medications.length === 1 ? "this medicine" : "these medicines"}.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {withNotes.map((group) => (
            <MedicineBlock key={group.key} group={group} />
          ))}
        </ul>
      )}

      {withNotes.length > 0 && quiet.length > 0 && (
        <p className="mt-5 border-t border-line pt-4 text-sm text-ink-3">
          No trial rules{soFar} mention: {quiet.map((g) => g.label).join(", ")}.
        </p>
      )}
    </section>
  );
}
