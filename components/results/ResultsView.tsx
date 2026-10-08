"use client";

import { useState } from "react";
import type { TrialsResponse } from "@/lib/api";
import { profileHeadline } from "@/lib/client/profile";
import { rowFilterKey, sortRows, type ResultFilter, type TrialRow } from "@/lib/client/results";
import type { PatientProfile, Trial } from "@/lib/types";
import { Disclaimer } from "../Disclaimer";
import { ErrorNotice } from "../ErrorNotice";
import { ArrowLeft, Info, Printer, Spinner } from "../Icons";
import { buttonPrimary, buttonSecondary, card } from "../ui";
import { STATUS_META } from "./StatusBadge";
import { TrialCard } from "./TrialCard";

export type SearchState =
  | { phase: "searching" }
  | { phase: "error"; message: string }
  | { phase: "ready"; response: TrialsResponse };

function Progress({ checked, total }: { checked: number; total: number }) {
  const done = checked >= total;
  const pct = total === 0 ? 100 : Math.round((checked / total) * 100);
  return (
    <div className={`${card} p-4 sm:p-5`}>
      <div className="flex items-center gap-2" aria-live="polite">
        {!done && <Spinner size={18} className="text-brand-600" />}
        <p className="font-semibold">
          {done
            ? `Checked all ${total} ${total === 1 ? "trial" : "trials"}, rule by rule.`
            : `Checked ${checked} of ${total} trials…`}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Trials checked"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={checked}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-brand-100"
      >
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      {!done && (
        <p className="mt-2 text-sm text-ink-subtle">
          Gemma 4 checks each trial against every eligibility rule. Results appear below as they finish.
        </p>
      )}
    </div>
  );
}

function FilterChips({
  rows,
  filter,
  onChange,
}: {
  rows: TrialRow[];
  filter: ResultFilter;
  onChange: (f: ResultFilter) => void;
}) {
  const count = (key: ResultFilter) => rows.filter((r) => rowFilterKey(r) === key).length;
  const chips: { key: ResultFilter; label: string; n: number; meta?: (typeof STATUS_META)[keyof typeof STATUS_META] }[] = [
    { key: "all", label: "All checked", n: rows.filter((r) => rowFilterKey(r) !== null).length },
    { key: "likely", label: STATUS_META.likely.label, n: count("likely"), meta: STATUS_META.likely },
    { key: "possible", label: STATUS_META.possible.label, n: count("possible"), meta: STATUS_META.possible },
    { key: "not_eligible", label: STATUS_META.not_eligible.label, n: count("not_eligible"), meta: STATUS_META.not_eligible },
  ];
  const errors = count("error");
  if (errors > 0) chips.push({ key: "error", label: "Couldn't check", n: errors });

  return (
    <div role="group" aria-label="Show trials by result" className="flex flex-wrap gap-2">
      {chips.map(({ key, label, n, meta }) => {
        const active = filter === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[0.95rem] font-semibold transition-colors ${
              active ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-surface text-ink hover:border-brand-600"
            }`}
          >
            {meta && <meta.Icon size={18} className={active ? "text-white" : meta.icon} />}
            {label}
            <span
              className={`rounded-full px-2 text-sm tabular-nums ${active ? "bg-white/20" : "bg-canvas text-ink-muted"}`}
            >
              {n}
            </span>
          </button>
        );
      })}
    </div>
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-serif text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">
            Trials the patient may qualify for
          </h1>
          <p className="mt-1 text-ink-muted">{profileHeadline(profile)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEditProfile} className={buttonSecondary}>
            <ArrowLeft size={18} /> Edit details
          </button>
          {search.phase === "ready" && search.response.trials.length > 0 && (
            <button type="button" onClick={() => window.print()} className={buttonPrimary}>
              <Printer size={20} /> Print summary for your oncologist
            </button>
          )}
        </div>
      </header>

      {search.phase === "searching" && (
        <div className={`${card} flex items-center gap-3 p-5`} aria-live="polite">
          <Spinner size={22} className="shrink-0 text-brand-600" />
          <p>
            Searching ClinicalTrials.gov for trials recruiting in India for{" "}
            <strong>&ldquo;{profile.cancerType}&rdquo;</strong>…
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

      {search.phase === "ready" && (
        <>
          <div className="space-y-2">
            <p className="text-ink-muted">
              Searched ClinicalTrials.gov for <strong className="text-ink">&ldquo;{search.response.searchTerm}&rdquo;</strong>:{" "}
              {search.response.totalFound} recruiting in India
              {search.response.totalFound !== search.response.trials.length &&
                `, ${search.response.trials.length} open to the patient's age and sex`}
              .
            </p>
            {search.response.source === "snapshot" && (
              <p className="flex gap-2 text-sm text-ink-subtle">
                <Info size={16} className="mt-0.5 shrink-0" />
                ClinicalTrials.gov couldn&apos;t be reached, so a saved copy of the registry was used. Check the
                trial pages for the latest status.
              </p>
            )}
          </div>

          {search.response.trials.length === 0 ? (
            <div className={`${card} p-6`}>
              <h2 className="font-serif text-xl font-semibold">No recruiting trials found</h2>
              <p className="mt-2 text-ink-muted">
                No trials recruiting in India matched &ldquo;{search.response.searchTerm}&rdquo; for this patient right
                now. Try a broader or more common name for the cancer type, for example &ldquo;lung cancer&rdquo;
                instead of a specific subtype.
              </p>
              <button type="button" onClick={onEditProfile} className={`${buttonSecondary} mt-4`}>
                Change cancer type
              </button>
            </div>
          ) : (
            <>
              <Progress checked={finished.length} total={rows.length} />
              {finished.length > 0 && <FilterChips rows={rows} filter={filter} onChange={setFilter} />}
              {visible.length > 0 ? (
                <ol className="space-y-4" aria-label="Checked trials">
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
                finished.length > 0 && <p className="text-ink-muted">No trials in this group{pending.length ? " yet" : ""}.</p>
              )}
              {pending.length > 0 && (
                <section aria-label="Trials still being checked" className="rounded-2xl border border-dashed border-line-strong p-4 sm:p-5">
                  <h2 className="font-semibold">Still checking {pending.length} {pending.length === 1 ? "trial" : "trials"}</h2>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-subtle">
                    {pending.map((row) => (
                      <li key={row.trial.nctId} className="flex items-start gap-2">
                        {row.evaluation.state === "checking" ? (
                          <Spinner size={16} className="mt-0.5 shrink-0 text-brand-600" />
                        ) : (
                          <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-line-strong" />
                        )}
                        <span>
                          <span className="font-mono">{row.trial.nctId}</span> {row.trial.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </>
      )}

      <Disclaimer />
    </div>
  );
}
