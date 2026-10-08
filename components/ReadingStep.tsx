"use client";

import { useEffect, useState } from "react";
import { buttonSecondary, pageTitle } from "./ui";

const LOOKS_FOR = [
  "Diagnosis, stage and where the cancer has spread",
  "Tumour test results, such as HER2 or EGFR",
  "Treatments so far and how they worked",
  "Current medicines from the prescriptions",
  "Recent blood test values",
];

function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return seconds;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function ReadingStep({
  count,
  phase,
  previews,
  onCancel,
}: {
  count: number;
  phase: "preparing" | "reading";
  previews: string[];
  onCancel: () => void;
}) {
  const elapsed = useElapsedSeconds();
  const photos = `${count} ${count === 1 ? "photo" : "photos"}`;
  const slow = elapsed >= 75;

  return (
    <section aria-labelledby="reading-heading" aria-busy="true" className="max-w-[42rem]">
      {previews.length > 0 && (
        <ul aria-hidden="true" className="mb-10 flex flex-wrap gap-3">
          {previews.map((src) => (
            <li key={src} className="read-scan relative w-20 overflow-hidden rounded-md border border-line bg-stone sm:w-24">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={src} alt="" className="aspect-[3/4] w-full object-cover object-top" />
            </li>
          ))}
        </ul>
      )}

      <div aria-live="polite">
        <h1 id="reading-heading" className={pageTitle}>
          {phase === "preparing" ? `Preparing ${photos}` : `Reading ${photos}`}
        </h1>
        <p className="mt-4 text-lg text-ink-2">
          {slow
            ? "This is taking longer than usual. Gemma's free service may be busy. You can keep waiting, or cancel and try again in a minute."
            : "Gemma 4 is reading the reports. This usually takes 30 to 60 seconds, so please keep this page open."}
        </p>
      </div>

      <p className="mt-6 font-mono text-sm tabular-nums text-ink-3" aria-hidden="true">
        {clock(elapsed)} elapsed
      </p>

      <div className="mt-10 border-t border-line pt-6">
        <h2 className="text-sm font-semibold text-ink">What it looks for</h2>
        <ul className="mt-3 space-y-2 text-ink-2">
          {LOOKS_FOR.map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="mt-[0.7em] h-px w-3 shrink-0 bg-line-2" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-3">
          It also notes the exact words it read, so you can check every detail on the next page.
        </p>
      </div>

      <button type="button" onClick={onCancel} className={`${buttonSecondary} mt-10`}>
        Cancel
      </button>
    </section>
  );
}
