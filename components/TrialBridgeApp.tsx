"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { UPLOAD_LIMITS } from "@/lib/api";
import { errorMessage, evaluateTrial, extractProfile, findTrials, isAbortError } from "@/lib/client/api";
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

type Step = "start" | "reading" | "review" | "results";
type Problem = { title: string; message: string; retry: () => void };

const EVALUATE_CONCURRENCY = 6;
const STEP_NUMBER = { start: 0, reading: 0, review: 1, results: 2 } as const;

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
  const shownStep = useRef<Step>("start");
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    topRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [step]);

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
    if (taken.length < accepted.length) messages.push(`You can add up to ${UPLOAD_LIMITS.maxImages} pages at a time.`);
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
    setStep("reading");
    try {
      const images = await prepareImages(blobs);
      if (controller.signal.aborted) return;
      setReading((r) => ({ ...r, phase: "reading" }));
      const res = await extractProfile(images, controller.signal);
      if (controller.signal.aborted) return;
      setProfile(normalizeProfile(res.profile));
      setFromReports(true);
      setStep("review");
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return;
      setProblem({
        title: "We couldn't read the reports",
        message: errorMessage(error),
        retry: () => void readReports(blobs, previews),
      });
      setStep("start");
    }
  }

  function cancelReading() {
    readAbort.current?.abort();
    setStep("start");
  }

  async function loadSample(sample: Sample) {
    setProblem(null);
    setLoadingSample(sample.id);
    try {
      const res = await fetch(sample.path);
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "This sample patient isn't available yet. Upload a report or enter the details manually instead."
            : `The sample couldn't be loaded (error ${res.status}).`,
        );
      }
      const blob = await res.blob();
      void readReports([blob], [URL.createObjectURL(blob)]);
    } catch (error) {
      setProblem({
        title: "Sample patient not available",
        message: error instanceof TypeError ? "We couldn't load the sample. Check your connection." : errorMessage(error),
        retry: () => void loadSample(sample),
      });
    } finally {
      setLoadingSample(null);
    }
  }

  function enterManually() {
    setProblem(null);
    setProfile(emptyProfile());
    setFromReports(false);
    setStep("review");
  }

  async function evaluate(p: PatientProfile, trial: Trial, signal: AbortSignal) {
    setEvaluations((prev) => ({ ...prev, [trial.nctId]: { state: "checking" } }));
    try {
      const { match } = await evaluateTrial(p, trial, signal);
      if (signal.aborted) return;
      setEvaluations((prev) => ({ ...prev, [trial.nctId]: { state: "done", match } }));
    } catch (error) {
      if (signal.aborted) return;
      setEvaluations((prev) => ({ ...prev, [trial.nctId]: { state: "error", message: errorMessage(error) } }));
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
    setStep("results");
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
    setStep("review");
  }

  const rows: TrialRow[] = trials.map((trial, index) => ({
    trial,
    index,
    evaluation: evaluations[trial.nctId] ?? { state: "queued" },
  }));
  const printable = step === "results" && search.phase === "ready" && trials.length > 0;

  return (
    <>
      <div ref={topRef} tabIndex={-1} className={`space-y-8 outline-none ${printable ? "print:hidden" : ""}`}>
        <StepIndicator current={STEP_NUMBER[step]} />

        {step === "start" && (
          <>
            {problem && (
              <ErrorNotice title={problem.title} message={problem.message} onRetry={problem.retry}>
                <button type="button" onClick={enterManually} className="min-h-11 px-2 font-semibold text-brand-700 underline underline-offset-4">
                  Enter details manually
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
            onBack={() => setStep("start")}
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

      {printable && search.phase === "ready" && (
        <DoctorSummary profile={profile} response={search.response} rows={rows} printedAt={printedAt} />
      )}
    </>
  );
}
