"use client";

import { useRef, useState } from "react";
import { UPLOAD_LIMITS } from "@/lib/api";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/client/images";
import { ArrowRight, Camera, Close, Spinner } from "./Icons";
import { buttonPrimary, buttonSecondary, pageTitle, sectionTitle, textLink } from "./ui";

export type UploadItem = { id: number; blob: Blob; name: string; previewUrl: string };

/** Made-up patients. Each loads its clinic report and prescription; a page that isn't there yet is skipped. */
export const SAMPLES = [
  {
    id: "breast",
    title: "Breast cancer that has spread",
    detail: "Woman, 52 · Coimbatore",
    paths: ["/samples/breast-metastatic.png", "/samples/breast-metastatic-rx.png"],
  },
  {
    id: "lung",
    title: "Lung cancer with an EGFR change",
    detail: "Man, 61 · Tiruppur",
    paths: ["/samples/lung-egfr.png", "/samples/lung-egfr-rx.png"],
  },
] as const;
export type Sample = (typeof SAMPLES)[number];

export function UploadStep({
  items,
  notice,
  loadingSample,
  onAddFiles,
  onRemove,
  onRead,
  onSample,
  onManual,
}: {
  items: UploadItem[];
  notice: React.ReactNode;
  loadingSample: Sample["id"] | null;
  onAddFiles: (files: File[]) => void;
  onRemove: (id: number) => void;
  onRead: () => void;
  onSample: (sample: Sample) => void;
  onManual: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const full = items.length >= UPLOAD_LIMITS.maxImages;
  const photos = `${items.length} ${items.length === 1 ? "photo" : "photos"}`;

  return (
    <div className="space-y-14">
      <header className="max-w-[42rem]">
        <h1 className={pageTitle}>Find cancer trials in India the patient may be able to join</h1>
        <p className="mt-5 text-lg text-ink-2">
          Clinical trials give new cancer treatment at no cost, but each one has pages of medical rules. Add photos of
          the patient&apos;s reports and prescriptions. TrialBridge reads them and checks the patient against every rule
          of every trial recruiting in India.
        </p>
      </header>

      <section aria-labelledby="upload-heading">
        <h2 id="upload-heading" className={sectionTitle}>
          Add photos of the reports and prescriptions
        </h2>
        <p className="mt-1.5 max-w-[42rem] text-ink-2">
          The latest clinic summary, biopsy, scan and blood reports, and the current prescription. One photo per page.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onAddFiles(Array.from(e.dataTransfer.files));
          }}
          className={`mt-6 rounded-lg border border-dashed px-5 py-9 text-center transition-colors duration-150 sm:py-11 ${
            dragging ? "border-accent bg-accent-soft" : "border-line-2 bg-stone"
          }`}
        >
          <Camera size={30} className={`mx-auto ${dragging ? "text-accent" : "text-ink-3"}`} />
          <p className="mt-3 font-semibold text-ink">
            {dragging ? "Drop the photos to add them" : "Choose photos, or drag them here"}
          </p>
          <p className="mx-auto mt-1 max-w-[30rem] text-sm text-ink-3">
            JPG, PNG or WebP, up to {UPLOAD_LIMITS.maxImages} photos. PDFs can&apos;t be read yet: take a photo or
            screenshot of each page instead.
          </p>
          <input
            ref={inputRef}
            id="report-files"
            type="file"
            multiple
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              onAddFiles(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={`${items.length === 0 ? buttonPrimary : buttonSecondary} mt-6`}
            onClick={() => inputRef.current?.click()}
            disabled={full}
          >
            {items.length === 0 ? "Choose photos" : full ? `${UPLOAD_LIMITS.maxImages} photos added` : "Add more photos"}
          </button>
        </div>

        <div role="status" className="empty:hidden">
          {notice && <p className="mt-3 rounded-md bg-ask-soft px-3 py-2 text-sm text-ink">{notice}</p>}
        </div>

        {items.length > 0 && (
          <>
            <ul aria-label="Photos added" className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {items.map((item, i) => (
                <li key={item.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img
                    src={item.previewUrl}
                    alt={`Photo ${i + 1}: ${item.name}`}
                    className="aspect-[3/4] w-full rounded-md border border-line bg-stone object-cover object-top"
                  />
                  <p className="mt-1.5 truncate text-xs text-ink-3" title={item.name}>
                    <span className="font-mono tabular-nums text-ink-2">{i + 1}</span> · {item.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove photo ${i + 1} (${item.name})`}
                    className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-md text-ink hover:text-fail"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-white shadow-[0_1px_3px_rgb(18_21_25/0.25)]">
                      <Close size={15} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <button type="button" onClick={onRead} className={`${buttonPrimary} min-h-12 px-6`}>
                Read {photos}
                <ArrowRight size={18} />
              </button>
              <p className="text-sm text-ink-3">Gemma 4 takes about a minute to read them.</p>
            </div>
          </>
        )}

        <p className="mt-6 max-w-[42rem] text-sm text-ink-3">
          Photos are shrunk on this device, then sent to Google&apos;s Gemini API, where Gemma 4 reads them. Names and
          ID numbers aren&apos;t needed, so feel free to cover them.
        </p>
      </section>

      <section aria-labelledby="sample-heading" className="border-t border-line pt-8">
        <h2 id="sample-heading" className="font-semibold text-ink">
          No reports at hand?
        </h2>
        <p className="mt-0.5 text-sm text-ink-3">Try a sample patient. The reports are made up, not real people.</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {SAMPLES.map((sample) => {
            const loading = loadingSample === sample.id;
            return (
              <li key={sample.id}>
                <button
                  type="button"
                  onClick={() => onSample(sample)}
                  disabled={loadingSample !== null}
                  aria-busy={loading || undefined}
                  className="group flex min-h-11 w-full items-center gap-3 rounded-lg border border-line bg-white px-4 py-3.5 text-left transition-colors duration-150 hover:border-ink-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{sample.title}</span>
                    <span className="block text-sm text-ink-3">{loading ? "Loading the sample…" : sample.detail}</span>
                  </span>
                  {loading ? (
                    <Spinner size={18} className="shrink-0 text-accent" />
                  ) : (
                    <ArrowRight size={18} className="shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-accent" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-sm text-ink-2">
          Rather type it in?{" "}
          <button type="button" onClick={onManual} className={`${textLink} inline-flex min-h-11 items-center`}>
            Enter the details by hand
          </button>
        </p>
      </section>
    </div>
  );
}
