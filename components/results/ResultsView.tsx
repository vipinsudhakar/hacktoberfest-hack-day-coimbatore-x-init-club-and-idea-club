"use client";

import { useState } from "react";
import type { TrialsResponse } from "@/lib/api";
import { profileHeadline } from "@/lib/client/profile";
import { rowFilterKey, sortRows, type ResultFilter, type TrialRow } from "@/lib/client/results";
import type { PatientProfile, Trial } from "@/lib/types";
import { Disclaimer } from "../Disclaimer";
import { ErrorNotice } from "../ErrorNotice";
import { AlertTriangle, ArrowLeft, Clock, Info, Printer, Spinner } from "../Icons";
import { buttonPrimary, buttonSecondary, pageTitle, panel, sectionTitle } from "../ui";
import { Countdown } from "./Countdown";
import { MedicinesPanel } from "./MedicinesPanel";
import { STATUS_META } from "./StatusBadge";
import { TrialCard } from "./TrialCard";

export type SearchState =
  | { phase: "searching" }
  | { phase: "error"; message: string }
  | { phase: "ready"; response: TrialsResponse };

function Progress({ rows }: { rows: TrialRow[] }) {
  const total = rows.length;
  const checked = rows.filter((r) => rowFilterKey(r) !== null).length;
  const waiting = rows.filter((r) => r.evaluation.state === "waiting").length;
  const done = checked >= total;
  const pct = total === 0 ? 100 : Math.round((checked / total) * 100);
  const trials = (n: number) => `${n} ${n === 1 ? "trial" : "trials"}`;

  return (
    <div className="border-y border-line py-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="flex items-center gap-2.5 font-semibold text-ink">
          {!done && <Spinner size={18} className="shrink-0 text-accent" />}
          {done ? `All ${trials(total)} checked, rule by rule` : `Checking ${trials(total)}, rule by rule`}
        </p>
        <p className="shrink-0 font-mono text-sm tabular-nums text-ink-3" aria-hidden="true">
          {checked}/{total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Trials checked"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={checked}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-2"
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-700 ease-[var(--ease-out-expo)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {done
          ? `All ${trials(total)} checked.`
          : `${checked} of ${trials(total)} checked.${waiting ? ` ${trials(waiting)} waiting for Gemma's free tier.` : ""}`}
      </p>
      {!done && (
        <p className="mt-3 text-sm text-ink-3">
          Gemma 4 checks each trial against every one of its rules. Results appear below as they finish; with many
          trials this takes a few minutes.
        </p>
      )}
      {waiting > 0 && (
        <p className="mt-2 flex gap-2 text-sm text-ink">
          <Clock size={18} className="mt-px shrink-0 text-ask" />
          {trials(waiting)} waiting for Gemma&apos;s free tier, which limits how fast it can answer. They retry by
          themselves.
        </p>
      )}
    </div>
  );
}

function Filters({ rows, filter, onChange }: { rows: TrialRow[]; filter: ResultFilter; onChange: (f: ResultFilter) => void }) {
  const count = (key: ResultFilter) => rows.filter((r) => rowFilterKey(r) === key).length;
  const chips: { key: ResultFilter; label: string; n: number; Icon?: typeof Clock; icon?: string }[] = [
    { key: "all", label: "All", n: rows.filter((r) => rowFilterKey(r) !== null).length },
    { key: "likely", label: STATUS_META.likely.label, n: count("likely"), Icon: STATUS_META.likely.Icon, icon: STATUS_META.likely.icon },
    { key: "possible", label: STATUS_META.possible.label, n: count("possible"), Icon: STATUS_META.possible.Icon, icon: STATUS_META.possible.icon },
    { key: "not_eligible", label: STATUS_META.not_eligible.label, n: count("not_eligible"), Icon: STATUS_META.not_eligible.Icon, icon: STATUS_META.not_eligible.icon },
  ];
  const errors = count("error");
  if (errors > 0 || filter === "error") chips.push({ key: "error", label: "Couldn't check", n: errors, Icon: AlertTriangle, icon: "text-ask" });

  return (
    <div role="group" aria-label="Show trials by result" className="flex flex-wrap gap-2">
      {chips.map(({ key, label, n, Icon, icon }) => {
        const active = filter === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3.5 text-[0.9375rem] font-semibold transition-colors duration-150 ${
              active ? "border-ink bg-ink text-white" : "border-line-2 bg-white text-ink hover:border-ink-2"
            }`}
          >
            {Icon && <Icon size={17} className={active ? "text-white" : icon} />}
            {label}
            <span className={`font-mono text-sm tabular-nums ${active ? "text-white/80" : "text-ink-3"}`}>{n}</span>
          </button>
        );
      })}
    </div>
  );
}

function Pending({ rows }: { rows: TrialRow[] }) {
  return (
    <section aria-labelledby="pending-heading" className="rounded-lg border border-dashed border-line-2 px-5 py-5 sm:px-7">
      <h2 id="pending-heading" className="font-semibold text-ink">
        Still to check: {rows.length} {rows.length === 1 ? "trial" : "trials"}
      </h2>
      <ul className="mt-3 divide-y divide-line">
        {rows.map(({ trial, evaluation }) => (
          <li key={trial.nctId} className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:items-start sm:gap-4">
            <span className="min-w-0 flex-1 text-ink-2">
              <span className="font-mono text-ink-3">{trial.nctId}</span> {trial.title}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-ink-2 sm:w-56 sm:justify-end">
              {evaluation.state === "checking" && (
                <>
                  <Spinner size={15} className="text-accent" /> Checking now
                </>
              )}
              {evaluation.state === "queued" && <span className="text-ink-3">In line</span>}
              {evaluation.state === "waiting" && (
                <>
                  <Clock size={16} className="shrink-0 text-ask" />
                  <span>
                    Waiting for Gemma&apos;s free tier · retry in{" "}
                    <Countdown key={evaluation.retryAt} retryAt={evaluation.retryAt} seconds={evaluation.seconds} />
                    <span className="block text-xs text-ink-3 sm:text-right">
                      Try {evaluation.attempt} of {evaluation.maxAttempts}
                    </span>
                  </span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ResultsView({
  profile,
  search,
  rows,
  onRetrySearch,
  onRetryTrial,
  onEditProfile,
}: {
  profile: PatientProfile;
  search: SearchState;
  rows: TrialRow[];
  onRetrySearch: () => void;
  onRetryTrial: (trial: Trial) => void;
  onEditProfile: () => void;
}) {
  const [filter, setFilter] = useState<ResultFilter>("all");
  const finished = sortRows(rows.filter((r) => rowFilterKey(r) !== null));
  const pending = rows.filter((r) => rowFilterKey(r) === null);
  const visible = filter === "all" ? finished : finished.filter((r) => rowFilterKey(r) === filter);
  const anyDone = rows.some((r) => r.evaluation.state === "done");
  const ready = search.phase === "ready" ? search.response : null;

  return (
    <div className="space-y-10">
      <header>
        <h1 className={pageTitle}>Trials the patient may qualify for</h1>
        <p className="mt-3 text-lg text-ink-2">{profileHeadline(profile)}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={onEditProfile} className={buttonSecondary}>
            <ArrowLeft size={18} /> Edit details
          </button>
          {ready && ready.trials.length > 0 && (
            <button type="button" onClick={() => window.print()} className={buttonPrimary}>
              <Printer size={20} /> Print a summary for the oncologist
            </button>
          )}
        </div>
      </header>

      {search.phase === "searching" && (
        <div className="flex items-center gap-3 border-y border-line py-5" aria-live="polite">
          <Spinner size={20} className="shrink-0 text-accent" />
          <p className="text-ink">
            Searching ClinicalTrials.gov for trials recruiting in India for{" "}
            <strong className="font-semibold">&ldquo;{profile.cancerType}&rdquo;</strong>…
          </p>
        </div>
      )}

      {search.phase === "error" && (
        <ErrorNotice title="We couldn't search the trial registry" message={search.message} onRetry={onRetrySearch}>
          <button type="button" onClick={onEditProfile} className={buttonSecondary}>
            Edit details
          </button>
        </ErrorNotice>
      )}

      {ready && (
        <>
          <div className="-mt-4 space-y-2">
            <p className="max-w-[42rem] text-ink-2">
              Searched ClinicalTrials.gov for{" "}
              <strong className="font-semibold text-ink">&ldquo;{ready.searchTerm}&rdquo;</strong>:{" "}
              <span className="tabular-nums">{ready.totalFound}</span> recruiting in India
              {ready.totalFound !== ready.trials.length &&
                `, ${ready.trials.length} of them open to the patient's age and sex`}
              .
            </p>
            {ready.source === "snapshot" && (
              <p className="flex max-w-[42rem] gap-2 text-sm text-ink-3">
                <Info size={16} className="mt-0.5 shrink-0" />
                ClinicalTrials.gov couldn&apos;t be reached, so a saved copy of the registry was used. Check each
                trial&apos;s page for its latest status.
              </p>
            )}
          </div>

          {ready.trials.length === 0 ? (
            <div className={`${panel} px-5 py-6 sm:px-7`}>
              <h2 className={sectionTitle}>No recruiting trials found</h2>
              <p className="mt-2 max-w-[40rem] text-ink-2">
                No trials recruiting in India matched &ldquo;{ready.searchTerm}&rdquo; for this patient right now. Try a
                broader or more common name for the cancer, for example &ldquo;lung cancer&rdquo; instead of a specific
                subtype.
              </p>
              <button type="button" onClick={onEditProfile} className={`${buttonSecondary} mt-5`}>
                Change the cancer type
              </button>
            </div>
          ) : (
            <>
              <Progress rows={rows} />

              {anyDone && <MedicinesPanel medications={profile.medications} rows={rows} onEditProfile={onEditProfile} />}

              {finished.length > 0 && (
                <section aria-labelledby="trials-heading" className="space-y-5">
                  <h2 id="trials-heading" className={sectionTitle}>
                    Checked trials
                  </h2>
                  <Filters rows={rows} filter={filter} onChange={setFilter} />
                  {visible.length > 0 ? (
                    <ol className="space-y-5" aria-label="Checked trials, best matches first">
                      {visible.map((row) => (
                        <li key={row.trial.nctId}>
                          <TrialCard
                            trial={row.trial}
                            evaluation={row.evaluation}
                            patientCity={profile.city}
                            onRetry={() => onRetryTrial(row.trial)}
                          />
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-ink-2">No trials in this group{pending.length ? " yet" : ""}.</p>
                  )}
                </section>
              )}

              {pending.length > 0 && <Pending rows={pending} />}
            </>
          )}
        </>
      )}

      <Disclaimer />
    </div>
  );
}
