"use client";

import { useEffect, useMemo, useState } from "react";
import type { ScreenedOutTrial, TrialsResponse } from "@/lib/api";
import { translateTexts } from "@/lib/client/api";
import { TranslateContext } from "@/lib/client/i18n";
import { profileHeadline } from "@/lib/client/profile";
import {
  countRows,
  formatSavedDate,
  rowFilterKey,
  sortRows,
  type ResultFilter,
  type RowCounts,
  type TrialRow,
} from "@/lib/client/results";
import type { PatientProfile, Trial } from "@/lib/types";
import { Disclaimer } from "../Disclaimer";
import { ErrorNotice } from "../ErrorNotice";
import { AlertTriangle, ArrowLeft, ChevronDown, Clock, ExternalLink, Info, Plus, Printer, Spinner } from "../Icons";
import { buttonPrimary, buttonSecondary, pageTitle, panel, sectionTitle } from "../ui";
import { ArrivingList } from "./ArrivingList";
import { LanguageSwitch, type ResultLanguage } from "./LanguageSwitch";
import { Countdown } from "./Countdown";
import { MedicinesPanel } from "./MedicinesPanel";
import { STATUS_META } from "./StatusBadge";
import { TrialCard } from "./TrialCard";

export type SearchState =
  | { phase: "searching" }
  | { phase: "error"; message: string }
  | { phase: "ready"; response: TrialsResponse };

const trialsWord = (n: number) => `${n} ${n === 1 ? "trial" : "trials"}`;

/** Set-aside trials the user hasn't yet asked to check. */
export function remainingSetAside(response: TrialsResponse, rows: TrialRow[]): ScreenedOutTrial[] {
  const checking = new Set(rows.map((r) => r.trial.nctId));
  return (response.screenedOut ?? []).filter((s) => !checking.has(s.trial.nctId));
}

/** Never counts a trial that couldn't be checked as checked. */
function progressHeadline({ total, done, failed, pending }: RowCounts): string {
  if (pending > 0) return `Checking ${trialsWord(total)}, rule by rule`;
  if (failed === 0) return `All ${trialsWord(total)} checked, rule by rule`;
  return `${done} of ${trialsWord(total)} checked · ${failed} couldn't be checked`;
}

/** The same news for screen readers, read out from one live region that stays on the page. */
function progressAnnouncement(rows: TrialRow[], { total, done, failed, pending }: RowCounts): string {
  const waiting = rows.filter((r) => r.evaluation.state === "waiting").length;
  const likely = rows.filter((r) => rowFilterKey(r) === "likely").length;
  return [
    pending === 0 && failed === 0 ? `All ${trialsWord(total)} checked.` : `${done} of ${trialsWord(total)} checked.`,
    failed > 0 ? `${failed} couldn't be checked.` : "",
    waiting > 0 ? `${trialsWord(waiting)} waiting for Gemma's free tier.` : "",
    likely > 0 ? `${likely} likely ${likely === 1 ? "match" : "matches"}${pending > 0 ? " so far" : ""}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function Progress({ rows, counts }: { rows: TrialRow[]; counts: RowCounts }) {
  const { total, done, failed, pending } = counts;
  const waiting = rows.filter((r) => r.evaluation.state === "waiting").length;
  const finished = done + failed;
  const fraction = total === 0 ? 1 : finished / total;

  return (
    <div className="border-y border-line py-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="flex items-center gap-2.5 font-semibold text-ink">
          {pending > 0 && <Spinner size={18} className="shrink-0 text-accent" />}
          {progressHeadline(counts)}
        </p>
        <p className="shrink-0 font-mono text-sm tabular-nums text-ink-3" aria-hidden="true">
          {finished}/{total}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Trials finished"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={finished}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-2"
      >
        {/* Scaled, not resized: the fill glides without re-laying out the page. */}
        <div
          className="h-full origin-left rounded-full bg-accent transition-transform duration-500 ease-[var(--ease-out-expo)]"
          style={{ transform: `scaleX(${fraction})` }}
        />
      </div>
      {pending > 0 && (
        <p className="mt-3 text-sm text-ink-3">
          Gemma 4 checks each trial against every one of its rules. Results appear below as they finish; with many
          trials this takes a few minutes.
        </p>
      )}
      {pending === 0 && failed > 0 && (
        <p className="mt-3 text-sm text-ink-3">
          The results are partial. Use Retry on {failed === 1 ? "the trial" : "each trial"} below that couldn&apos;t
          be checked.
        </p>
      )}
      {waiting > 0 && (
        <p className="mt-2 flex gap-2 text-sm text-ink">
          <Clock size={18} className="mt-px shrink-0 text-ask" />
          {trialsWord(waiting)} waiting for Gemma&apos;s free tier, which limits how fast it can answer. They retry by
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
            className={`press inline-flex min-h-11 items-center gap-2 rounded-md border px-3.5 text-[0.9375rem] font-semibold ${
              active ? "border-ink bg-ink text-paper" : "border-line-2 bg-surface text-ink hover:border-ink-2"
            }`}
          >
            {Icon && <Icon size={17} className={active ? "text-paper" : icon} />}
            {label}
            <span className={`font-mono text-sm tabular-nums ${active ? "text-paper/80" : "text-ink-3"}`}>{n}</span>
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
        Still to check: <span className="tabular-nums">{trialsWord(rows.length)}</span>
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
                    <span className="block text-xs tabular-nums text-ink-3 sm:text-right">
                      Retry {evaluation.attempt} of {evaluation.maxAttempts}
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

/** Placeholder cards while the registry search runs, shaped like the trial cards that will replace them. */
function SearchingSkeleton({ cancerType }: { cancerType: string | null }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 border-y border-line py-5">
        <Spinner size={20} className="shrink-0 text-accent" />
        <p className="text-ink">
          Searching ClinicalTrials.gov for trials recruiting in India for{" "}
          <strong className="font-semibold">&ldquo;{cancerType}&rdquo;</strong>…
        </p>
      </div>
      <div aria-hidden="true" className="space-y-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${panel} px-5 py-6 sm:px-7`} style={{ opacity: 1 - i * 0.25 }}>
            <div className="flex items-center gap-3">
              <span className="skeleton block h-6 w-28" />
              <span className="skeleton block h-4 w-16" />
              <span className="skeleton ml-auto block h-4 w-24" />
            </div>
            <span className="skeleton mt-4 block h-5 w-[85%]" />
            <span className="skeleton mt-2 block h-5 w-[60%]" />
            <span className="skeleton mt-5 block h-3.5 w-full" />
            <span className="skeleton mt-2 block h-3.5 w-[92%]" />
            <span className="skeleton mt-2 block h-3.5 w-[70%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** "20 found · 9 to check rule by rule · 11 set aside at a first look", counting honestly as trials move between groups. */
function SearchSummary({ response, counts, setAside }: { response: TrialsResponse; counts: RowCounts; setAside: number }) {
  const ruledOutByAgeOrSex = Math.max(0, response.totalFound - counts.total - setAside);
  const checkParts: [number, string][] =
    counts.pending > 0
      ? [[counts.total, "to check rule by rule"]]
      : [
          [counts.done, "checked rule by rule"],
          [counts.failed, "couldn't be checked"],
        ];
  const parts: [number, string][] = [
    [response.totalFound, "found"],
    ...checkParts,
    [setAside, "set aside at a first look"],
    [ruledOutByAgeOrSex, "not open to the patient's age or sex"],
  ];
  const savedOn = formatSavedDate(response.snapshotSavedAt);
  return (
    <div className="-mt-4 space-y-3">
      <p className="max-w-[42rem] text-ink-2">
        Searched ClinicalTrials.gov for{" "}
        <strong className="font-semibold text-ink">&ldquo;{response.searchTerm}&rdquo;</strong>, recruiting in India.
      </p>
      <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-ink-2">
        {parts
          .filter(([n], i) => i === 0 || n > 0)
          .map(([n, label], i) => (
            <span key={label} className="whitespace-nowrap">
              {i > 0 && (
                <span aria-hidden="true" className="mr-2 text-line-2">
                  ·
                </span>
              )}
              <span className="font-mono font-semibold tabular-nums text-ink">{n}</span> {label}
            </span>
          ))}
      </p>
      {response.source === "snapshot" && (
        <div className="flex max-w-[42rem] gap-3 rounded-md bg-stone px-4 py-3 text-sm text-ink-2">
          <Info size={18} className="mt-0.5 shrink-0 text-ink-3" />
          <p>
            <strong className="font-semibold text-ink">ClinicalTrials.gov couldn&apos;t be reached just now,</strong>{" "}
            so TrialBridge used its saved copy {savedOn ? `from ${savedOn}` : "of the registry"}. A trial may have
            closed or changed since; check each
            trial&apos;s page for its latest status.
          </p>
        </div>
      )}
    </div>
  );
}

/** Trials the quick screen set aside: collapsed by default, each with its reason and a way to check it anyway. */
function SetAside({
  items,
  open,
  onCheckAnyway,
}: {
  items: ScreenedOutTrial[];
  open: boolean;
  onCheckAnyway: (trial: Trial) => void;
}) {
  // Open on arrival only when there's nothing else to show; after that it's the reader's to open or close.
  const [startOpen] = useState(open);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="set-aside-heading" className="border-t border-line">
      <details open={startOpen}>
        <summary className="-mx-2 mt-1 flex min-h-14 items-center gap-4 rounded-md px-2 py-3 hover:bg-stone">
          <span className="min-w-0 flex-1">
            <span id="set-aside-heading" className="block font-semibold text-ink">
              <span className="tabular-nums">{trialsWord(items.length)}</span> set aside at a first look
            </span>
            <span className="block text-sm text-ink-3">
              A quick read suggested each is meant for a different group of patients, so they weren&apos;t checked rule
              by rule. You can still check any of them.
            </span>
          </span>
          <ChevronDown className="chevron shrink-0 text-ink-3" />
        </summary>
        <ul className="divide-y divide-line pb-2">
          {items.map(({ trial, reason }) => (
            <li key={trial.nctId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:gap-6">
              <div className="min-w-0 flex-1">
                <p className="text-ink">{trial.title}</p>
                <p className="mt-1 text-sm text-ink-2">{reason}</p>
                <a
                  href={trial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-8 items-center gap-1.5 font-mono text-sm text-ink-3 underline decoration-line-2 underline-offset-4 hover:text-accent hover:decoration-accent"
                >
                  {trial.nctId}
                  <ExternalLink size={13} />
                  <span className="sr-only">on ClinicalTrials.gov (opens in a new tab)</span>
                </a>
              </div>
              <button
                type="button"
                onClick={() => onCheckAnyway(trial)}
                className={`${buttonSecondary} shrink-0 self-start text-[0.9375rem]`}
              >
                Check every rule anyway
              </button>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

/** When every checked trial rules the patient out: say so kindly, and say what can still be done. */
function NoneFit({ total, setAside, onEditProfile }: { total: number; setAside: number; onEditProfile: () => void }) {
  return (
    <div className={`${panel} px-5 py-6 sm:px-7`}>
      <h2 className={sectionTitle}>None of the {trialsWord(total)} checked fit right now</h2>
      <p className="mt-2 max-w-[42rem] text-ink-2">
        Each one has at least one rule the reports suggest the patient doesn&apos;t meet. That&apos;s common, and it
        isn&apos;t the last word: the AI can misread a report, and new trials open in India every month.
      </p>
      <ul className="mt-4 max-w-[42rem] space-y-2 text-ink-2">
        <li className="flex gap-3">
          <span aria-hidden="true" className="mt-[0.75em] h-px w-3 shrink-0 bg-line-2" />
          Read the reasons below with the oncologist. If a detail is wrong, fix it and check again.
        </li>
        {setAside > 0 && (
          <li className="flex gap-3">
            <span aria-hidden="true" className="mt-[0.75em] h-px w-3 shrink-0 bg-line-2" />
            {trialsWord(setAside)} {setAside === 1 ? "was" : "were"} set aside at a first look. You can check any of
            them rule by rule.
          </li>
        )}
        <li className="flex gap-3">
          <span aria-hidden="true" className="mt-[0.75em] h-px w-3 shrink-0 bg-line-2" />
          Come back in a few weeks: the search always uses the latest list of recruiting trials.
        </li>
      </ul>
      <button type="button" onClick={onEditProfile} className={`${buttonSecondary} mt-5`}>
        <ArrowLeft size={18} /> Check the details again
      </button>
    </div>
  );
}

// Headings and status lines shown with every result; translated together with the explanations.
const FIXED_TEXTS = [
  "May qualify. Confirm with your oncologist.",
  "May qualify if the open questions check out. Confirm with your oncologist.",
  "Questions to ask your doctor",
  "Why it likely doesn't fit",
];

/** The patient-facing explanations on screen: plain summaries, questions, blocking and medicine reasons. */
function explanationTexts(rows: TrialRow[]): string[] {
  const texts = new Set(FIXED_TEXTS);
  for (const { evaluation } of rows) {
    if (evaluation.state !== "done") continue;
    const m = evaluation.match;
    if (m.plainSummary) texts.add(m.plainSummary);
    m.questions.forEach((q) => texts.add(q));
    m.blockers.forEach((b) => b.reason && texts.add(b.reason));
    m.results.forEach((r) => r.medicine && r.reason && texts.add(r.reason));
  }
  return [...texts].filter((t) => t.length <= 600).slice(0, 120);
}

export function ResultsView({
  profile,
  search,
  rows,
  onRetrySearch,
  onRetryTrial,
  onCheckAnyway,
  onEditProfile,
  onStartOver,
  celebrateId,
}: {
  profile: PatientProfile;
  search: SearchState;
  rows: TrialRow[];
  onRetrySearch: () => void;
  onRetryTrial: (trial: Trial) => void;
  onCheckAnyway: (trial: Trial) => void;
  onEditProfile: () => void;
  onStartOver?: () => void;
  celebrateId: string | null;
}) {
  const [filter, setFilter] = useState<ResultFilter>("all");
  const counts = countRows(rows);
  const finished = sortRows(rows.filter((r) => rowFilterKey(r) !== null));
  const pending = rows.filter((r) => rowFilterKey(r) === null);
  const visible = filter === "all" ? finished : finished.filter((r) => rowFilterKey(r) === filter);
  const doneRows = rows.filter((r) => r.evaluation.state === "done");
  const anyDone = doneRows.length > 0;
  const ready = search.phase === "ready" ? search.response : null;
  const setAside = ready ? remainingSetAside(ready, rows) : [];
  // "All checked" means nothing pending and nothing failed; none-fit looks only at trials that were checked.
  const allChecked = rows.length > 0 && counts.pending === 0 && counts.failed === 0;
  const noneFit = counts.pending === 0 && anyDone && doneRows.every((r) => rowFilterKey(r) === "not_eligible");
  const printLabel = allChecked
    ? "Print a summary for the oncologist"
    : counts.pending > 0
      ? "Print the results so far (still checking)"
      : "Print the partial results (some trials couldn't be checked)";
  const announcement =
    search.phase === "searching"
      ? `Searching ClinicalTrials.gov for trials recruiting in India for "${profile.cancerType ?? ""}"…`
      : rows.length > 0
        ? progressAnnouncement(rows, counts)
        : "";
  const nothingFound = ready !== null && rows.length === 0 && setAside.length === 0;

  // Tamil / Hindi: once every trial is checked, Gemma translates the explanations in one batched call.
  const [language, setLanguage] = useState<ResultLanguage>("en");
  const [translated, setTranslated] = useState<{ key: string; map: Map<string, string> } | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const texts = useMemo(() => (allChecked ? explanationTexts(rows) : []), [allChecked, rows]);
  const translateKey = language === "en" ? "" : `${language}:${texts.join("")}`;
  useEffect(() => {
    if (language === "en" || !texts.length || translated?.key === translateKey) return;
    const controller = new AbortController();
    translateTexts(language, texts, controller.signal)
      .then((res) => setTranslated({ key: translateKey, map: new Map(texts.map((t, i) => [t, res.texts[i] ?? t])) }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setTranslateError(err instanceof Error ? err.message : "The translation didn't work. Showing English.");
      });
    return () => controller.abort();
  }, [language, texts, translateKey, translated?.key]);
  const ready_ = language !== "en" && translated?.key === translateKey;
  const t = useMemo(
    () => (text: string) => (ready_ && translated ? (translated.map.get(text) ?? text) : text),
    [ready_, translated],
  );
  const languageStatus =
    language === "en"
      ? allChecked
        ? null
        : "Available once every trial is checked."
      : translateError
        ? translateError
        : ready_
          ? "Explanations translated by Gemma 4. The trials' own rules stay in English."
          : "Translating with Gemma 4…";

  return (
    <TranslateContext value={t}>
    <div className="space-y-10" lang={ready_ ? language : "en"}>
      <header>
        <h1 className={pageTitle}>Trials the patient may qualify for</h1>
        <p className="mt-3 text-lg text-ink-2">{profileHeadline(profile)}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={onEditProfile} className={buttonSecondary}>
            <ArrowLeft size={18} /> Edit details
          </button>
          {onStartOver && (
            <button type="button" onClick={onStartOver} className={buttonSecondary}>
              <Plus size={18} /> Start another patient
            </button>
          )}
          {ready && rows.length > 0 && (
            <button type="button" onClick={() => window.print()} className={buttonPrimary}>
              <Printer size={20} /> {printLabel}
            </button>
          )}
        </div>
        {/* One live region for the whole search, so screen readers hear each update without a new region appearing. */}
        <p className="sr-only" role="status" aria-live="polite">
          {announcement}
        </p>
        {ready && rows.length > 0 && (
          <div className="mt-6">
            <LanguageSwitch
              value={language}
              onChange={(next) => {
                setTranslateError(null);
                setLanguage(next);
              }}
              disabled={!allChecked}
              status={languageStatus}
            />
          </div>
        )}
      </header>

      {search.phase === "searching" && <SearchingSkeleton cancerType={profile.cancerType} />}

      {search.phase === "error" && (
        <ErrorNotice title="We couldn't search the trial registry" message={search.message} onRetry={onRetrySearch}>
          <button type="button" onClick={onEditProfile} className={buttonSecondary}>
            Edit details
          </button>
        </ErrorNotice>
      )}

      {ready && (
        <>
          <SearchSummary response={ready} counts={counts} setAside={setAside.length} />

          {nothingFound && (
            <div className={`${panel} px-5 py-6 sm:px-7`}>
              <h2 className={sectionTitle}>No recruiting trials found for this search</h2>
              <p className="mt-2 max-w-[40rem] text-ink-2">
                No trials recruiting in India matched &ldquo;{ready.searchTerm}&rdquo; for this patient right now. Try a
                broader or more common name for the cancer, for example &ldquo;lung cancer&rdquo; instead of a specific
                subtype. New trials open often, so it&apos;s also worth searching again in a few weeks.
              </p>
              <button type="button" onClick={onEditProfile} className={`${buttonSecondary} mt-5`}>
                <ArrowLeft size={18} /> Change the cancer type
              </button>
            </div>
          )}

          {rows.length === 0 && setAside.length > 0 && (
            <div className={`${panel} px-5 py-6 sm:px-7`}>
              <h2 className={sectionTitle}>Every trial found was set aside at a first look</h2>
              <p className="mt-2 max-w-[40rem] text-ink-2">
                A quick read suggested each one is meant for a different group of patients. The reasons are listed
                below; if one looks wrong, check that trial rule by rule.
              </p>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <Progress rows={rows} counts={counts} />

              {noneFit && <NoneFit total={counts.done} setAside={setAside.length} onEditProfile={onEditProfile} />}

              {anyDone && <MedicinesPanel medications={profile.medications} rows={rows} onEditProfile={onEditProfile} />}

              {finished.length > 0 && (
                <section aria-labelledby="trials-heading" className="space-y-5">
                  <h2 id="trials-heading" className={sectionTitle}>
                    Checked trials
                  </h2>
                  <Filters rows={rows} filter={filter} onChange={setFilter} />
                  {visible.length > 0 ? (
                    <ArrivingList className="space-y-5" label="Checked trials, best matches first">
                      {visible.map((row) => (
                        <li key={row.trial.nctId} data-key={row.trial.nctId}>
                          <TrialCard
                            trial={row.trial}
                            evaluation={row.evaluation}
                            profile={profile}
                            celebrate={row.trial.nctId === celebrateId}
                            onRetry={() => onRetryTrial(row.trial)}
                          />
                        </li>
                      ))}
                    </ArrivingList>
                  ) : (
                    <p className="rounded-lg border border-dashed border-line-2 px-5 py-4 text-ink-2">
                      No trials in this group{pending.length ? " yet. More results are still coming in." : "."}
                    </p>
                  )}
                </section>
              )}

              {pending.length > 0 && <Pending rows={pending} />}
            </>
          )}

          <SetAside
            items={setAside}
            open={rows.length === 0}
            onCheckAnyway={onCheckAnyway}
          />
        </>
      )}

      <Disclaimer />
    </div>
    </TranslateContext>
  );
}
