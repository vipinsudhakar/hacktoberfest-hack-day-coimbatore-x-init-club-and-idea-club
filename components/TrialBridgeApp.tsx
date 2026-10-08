"use client";

import { ViewTransition, addTransitionType, startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { UPLOAD_LIMITS } from "@/lib/api";
import { RequestError, errorMessage, evaluateTrial, extractProfile, findTrials, isAbortError, retryAfter } from "@/lib/client/api";
import { isAcceptedImage, prepareImages } from "@/lib/client/images";
import { runWithConcurrency } from "@/lib/client/pool";
import { cleanProfile, emptyProfile, normalizeProfile } from "@/lib/client/profile";
import type { Evaluation, TrialRow } from "@/lib/client/results";
import type { PatientProfile, Trial } from "@/lib/types";
import { ErrorNotice } from "./ErrorNotice";
import { ProfileEditor } from "./ProfileEditor";
import { ReadingStep } from "./ReadingStep";
import { DoctorSummary } from "./results/DoctorSummary";
import { ResultsView, type SearchState } from "./results/ResultsView";
import { StepIndicator } from "./StepIndicator";
import { UploadStep, type Sample, type UploadItem } from "./UploadStep";
import { textLink } from "./ui";

type Step = "start" | "reading" | "review" | "results";
type Problem = { title: string; message: string; retry: () => void };

/** Gemma's free tier is shared and rate limited: three trials at a time keeps it steady. */
const EVALUATE_CONCURRENCY = 3;
/** Automatic retries after a rate-limit answer, before falling back to a manual Retry button. */
const MAX_AUTO_RETRIES = 3;
const STEP_NUMBER = { start: 0, reading: 0, review: 1, results: 2 } as const;
/** Order of the screens, so a step change knows whether it moves forward or back. */
const STEP_ORDER = { start: 0, reading: 1, review: 2, results: 3 } as const;
const STEP_TITLE = {
  start: null,
  reading: "Reading the reports",
  review: "Check the details",
  results: "Trial results",
} as const;
/** Step content slides a little in the direction of travel; nothing else (filters, results arriving) does. */
const STEP_MOTION = { "step-forward": "step-forward", "step-back": "step-back", default: "none" };

/** Resolves after `ms`, or early when the run is cancelled. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done);
  });
}

export function TrialBridgeApp() {
  const [step, setStep] = useState<Step>("start");
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadingSample, setLoadingSample] = useState<Sample["id"] | null>(null);
  const [reading, setReading] = useState({ count: 0, phase: "preparing" as "preparing" | "reading", previews: [] as string[] });
  const [profile, setProfile] = useState<PatientProfile>(emptyProfile);
  const [fromReports, setFromReports] = useState(false);
  const [search, setSearch] = useState<SearchState>({ phase: "searching" });
  const [trials, setTrials] = useState<Trial[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [printedAt, setPrintedAt] = useState<string | null>(null);

  const nextId = useRef(1);
  const readAbort = useRef<AbortController | null>(null);
  const runAbort = useRef<AbortController | null>(null);
  const matchedProfile = useRef<PatientProfile | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Move focus to the top of each new step (not on first load) so keyboard and screen-reader users start there.
  // A layout effect, so the scroll happens inside the step's view transition rather than after it.
  const shownStep = useRef<Step>("start");
  useLayoutEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    topRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

  // Name each step in the browser tab, so a family member with many tabs open can find it again.
  useEffect(() => {
    const title = STEP_TITLE[step];
    document.title = title ? `${title} · TrialBridge` : "TrialBridge: cancer trials in India, explained";
  }, [step]);

  /** Changes screen inside a transition, tagged forward or back so the content slides the right way. */
  const currentStep = useRef<Step>("start");
  function go(next: Step) {
    const forward = STEP_ORDER[next] >= STEP_ORDER[currentStep.current];
    currentStep.current = next;
    startTransition(() => {
      addTransitionType(forward ? "step-forward" : "step-back");
      setStep(next);
    });
  }

  // Stamp the printout with the time it was printed (button or Ctrl+P).
  useEffect(() => {
    const stamp = () =>
      flushSync(() => setPrintedAt(new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })));
    window.addEventListener("beforeprint", stamp);
    return () => window.removeEventListener("beforeprint", stamp);
  }, []);

  function addFiles(files: File[]) {
    const accepted = files.filter(isAcceptedImage);
    const room = Math.max(0, UPLOAD_LIMITS.maxImages - uploads.length);
    const taken = accepted.slice(0, room);
    const messages: string[] = [];
    if (accepted.length < files.length) {
      messages.push("Only JPG, PNG or WebP photos can be read. For a PDF, take a screenshot of each page.");
    }
    if (taken.length < accepted.length) messages.push(`You can add up to ${UPLOAD_LIMITS.maxImages} photos at a time.`);
    setNotice(messages.join(" ") || null);
    const items = taken.map((file) => ({
      id: nextId.current++,
      blob: file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));
    setUploads((prev) => [...prev, ...items]);
  }

  function removeUpload(id: number) {
    const item = uploads.find((u) => u.id === id);
    if (item) URL.revokeObjectURL(item.previewUrl);
    setUploads((prev) => prev.filter((u) => u.id !== id));
    setNotice(null);
  }

  async function readReports(blobs: Blob[], previews: string[]) {
    readAbort.current?.abort();
    const controller = new AbortController();
    readAbort.current = controller;
    setProblem(null);
    setNotice(null);
    setReading({ count: blobs.length, phase: "preparing", previews });
    go("reading");
    try {
      const images = await prepareImages(blobs);
      if (controller.signal.aborted) return;
      setReading((r) => ({ ...r, phase: "reading" }));
      const res = await extractProfile(images, controller.signal);
      if (controller.signal.aborted) return;
      setProfile(normalizeProfile(res.profile));
      setFromReports(true);
      go("review");
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      setProblem({
        title: "We couldn't read the reports",
        message: errorMessage(error),
        retry: () => void readReports(blobs, previews),
      });
      go("start");
    }
  }

  function cancelReading() {
    readAbort.current?.abort();
    go("start");
  }

  /** Loads whichever of the sample's pages exist (report, prescription); a missing page is skipped. */
  async function loadSample(sample: Sample) {
    setProblem(null);
    setLoadingSample(sample.id);
    try {
      const pages = await Promise.all(
        sample.paths.map(async (path) => {
          try {
            const res = await fetch(path);
            return res.ok ? await res.blob() : null;
          } catch {
            return null;
          }
        }),
      );
      const blobs = pages.filter((b): b is Blob => b !== null && b.type.startsWith("image/"));
      if (blobs.length === 0) {
        setProblem({
          title: "This sample patient isn't available",
          message: "The sample reports couldn't be loaded. Add your own photos, or enter the details by hand.",
          retry: () => void loadSample(sample),
        });
        return;
      }
      void readReports(blobs, blobs.map((b) => URL.createObjectURL(b)));
    } finally {
      setLoadingSample(null);
    }
  }

  function enterManually() {
    setProblem(null);
    setProfile(emptyProfile());
    setFromReports(false);
    go("review");
  }

  function setEvaluation(nctId: string, evaluation: Evaluation) {
    setEvaluations((prev) => ({ ...prev, [nctId]: evaluation }));
  }

  /** Checks one trial; on a rate limit waits as long as Gemma asks and tries again, up to MAX_AUTO_RETRIES times. */
  async function evaluate(p: PatientProfile, trial: Trial, signal: AbortSignal) {
    for (let attempt = 0; ; attempt++) {
      setEvaluation(trial.nctId, { state: "checking" });
      try {
        const { match } = await evaluateTrial(p, trial, signal);
        if (signal.aborted) return;
        setEvaluation(trial.nctId, { state: "done", match });
        return;
      } catch (error) {
        if (signal.aborted) return;
        // A server-side failure (usually Gemma answering too slowly) gets one quiet retry; rate limits get up to three.
        const transient = attempt === 0 && error instanceof RequestError && (error.status === 502 || error.status === 504);
        const seconds = retryAfter(error) ?? (transient ? 5 : null);
        if (seconds !== null && attempt < MAX_AUTO_RETRIES) {
          const waitSeconds = Math.max(3, Math.ceil(seconds));
          setEvaluation(trial.nctId, {
            state: "waiting",
            retryAt: Date.now() + waitSeconds * 1000,
            seconds: waitSeconds,
            attempt: attempt + 1,
            maxAttempts: MAX_AUTO_RETRIES,
          });
          await wait(waitSeconds * 1000, signal);
          if (signal.aborted) return;
          continue;
        }
        setEvaluation(trial.nctId, { state: "error", message: errorMessage(error), rateLimited: seconds !== null });
        return;
      }
    }
  }

  async function startMatching(input: PatientProfile) {
    runAbort.current?.abort();
    const controller = new AbortController();
    runAbort.current = controller;
    const p = cleanProfile(input);
    matchedProfile.current = p;
    setProfile(p);
    setSearch({ phase: "searching" });
    setTrials([]);
    setEvaluations({});
    go("results");
    try {
      const response = await findTrials(p, controller.signal);
      if (controller.signal.aborted) return;
      setTrials(response.trials);
      setEvaluations(Object.fromEntries(response.trials.map((t) => [t.nctId, { state: "queued" } as Evaluation])));
      setSearch({ phase: "ready", response });
      await runWithConcurrency(
        response.trials,
        EVALUATE_CONCURRENCY,
        (trial) => evaluate(p, trial, controller.signal),
        controller.signal,
      );
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      setSearch({ phase: "error", message: errorMessage(error) });
    }
  }

  function retryTrial(trial: Trial) {
    const signal = runAbort.current?.signal;
    if (matchedProfile.current && signal && !signal.aborted) void evaluate(matchedProfile.current, trial, signal);
  }

  function editProfile() {
    runAbort.current?.abort();
    go("review");
  }

  const rows: TrialRow[] = trials.map((trial, index) => ({
    trial,
    index,
    evaluation: evaluations[trial.nctId] ?? { state: "queued" },
  }));
  const printable = step === "results" && search.phase === "ready" && trials.length > 0;

  return (
    <>
      <div ref={topRef} tabIndex={-1} className={`space-y-10 outline-none ${printable ? "print:hidden" : ""}`}>
        <StepIndicator current={STEP_NUMBER[step]} />

        <ViewTransition key={step} enter={STEP_MOTION} exit={STEP_MOTION} default="none">
          <div className="space-y-10">
        {step === "start" && (
          <>
            {problem && (
              <ErrorNotice title={problem.title} message={problem.message} onRetry={problem.retry}>
                <button type="button" onClick={enterManually} className={`${textLink} min-h-11`}>
                  Enter details by hand
                </button>
              </ErrorNotice>
            )}
            <UploadStep
              items={uploads}
              notice={notice}
              loadingSample={loadingSample}
              onAddFiles={addFiles}
              onRemove={removeUpload}
              onRead={() => void readReports(uploads.map((u) => u.blob), uploads.map((u) => u.previewUrl))}
              onSample={(s) => void loadSample(s)}
              onManual={enterManually}
            />
          </>
        )}

        {step === "reading" && (
          <ReadingStep count={reading.count} phase={reading.phase} previews={reading.previews} onCancel={cancelReading} />
        )}

        {step === "review" && (
          <ProfileEditor
            profile={profile}
            fromReports={fromReports}
            onChange={setProfile}
            onSubmit={() => void startMatching(profile)}
            onBack={() => go("start")}
          />
        )}

        {step === "results" && (
          <ResultsView
            profile={profile}
            search={search}
            rows={rows}
            onRetrySearch={() => void startMatching(profile)}
            onRetryTrial={retryTrial}
            onEditProfile={editProfile}
          />
        )}
          </div>
        </ViewTransition>
      </div>

      {printable && search.phase === "ready" && (
        <DoctorSummary profile={profile} response={search.response} rows={rows} printedAt={printedAt} />
      )}
    </>
  );
}
