"use client";

import { useRef, useState } from "react";
import { UPLOAD_LIMITS } from "@/lib/api";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/client/images";
import { Close, FileText, Upload } from "./Icons";
import { buttonPrimary, buttonQuiet, buttonSecondary, card } from "./ui";

export type UploadItem = { id: number; blob: Blob; name: string; previewUrl: string };

export const SAMPLES = [
  { id: "breast", label: "Breast cancer, metastatic", path: "/samples/breast-metastatic.png" },
  { id: "lung", label: "Lung cancer, EGFR-positive", path: "/samples/lung-egfr.png" },
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

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
          Cancer clinical trials in India
        </p>
        <h1 className="mt-2 font-serif text-[2rem] font-semibold leading-tight text-ink sm:text-[2.5rem]">
          Find clinical trials the patient may qualify for
        </h1>
        <p className="mt-3 text-lg text-ink-muted">
          Trials offer new cancer treatment at no cost, but each one has pages of medical rules. Add photos
          of the patient&apos;s reports: Gemma 4 reads them, then checks every rule of every trial recruiting
          in India.
        </p>
      </header>

      <section aria-labelledby="upload-heading" className={`${card} p-5 sm:p-6`}>
        <h2 id="upload-heading" className="font-serif text-xl font-semibold">
          Add the patient&apos;s reports
        </h2>
        <p className="mt-1 text-ink-muted">
          Biopsy, pathology, scan and blood reports work best. One photo or scan per page.
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
          className={`mt-4 flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
            dragging ? "border-brand-600 bg-brand-50" : "border-line-strong bg-canvas/60"
          }`}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Upload size={24} />
          </span>
          <p className="mt-3 font-semibold">Drag photos of the reports here</p>
          <p className="mt-1 text-sm text-ink-subtle">
            JPG, PNG or WebP, up to {UPLOAD_LIMITS.maxImages} pages. PDFs aren&apos;t supported yet: take a
            photo or screenshot of each page.
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
            className={`${buttonSecondary} mt-4`}
            onClick={() => inputRef.current?.click()}
            disabled={full}
          >
            Choose photos
          </button>
        </div>

        {notice && (
          <div role="status" className="mt-3 text-sm text-amber-900">
            {notice}
          </div>
        )}

        {items.length > 0 && (
          <ul aria-label="Reports added" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {items.map((item, i) => (
              <li key={item.id} className="relative overflow-hidden rounded-lg border border-line bg-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={item.previewUrl} alt={`Report page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                <p className="truncate px-2 py-1 text-xs text-ink-subtle" title={item.name}>
                  {item.name}
                </p>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove report page ${i + 1} (${item.name})`}
                  className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm hover:bg-rose-50 hover:text-rose-800"
                >
                  <Close size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={onRead} disabled={items.length === 0} className={buttonPrimary}>
            <FileText size={20} />
            {items.length === 0
              ? "Read reports with Gemma 4"
              : `Read ${items.length} ${items.length === 1 ? "report" : "reports"} with Gemma 4`}
          </button>
          <p className="text-sm text-ink-subtle">
            Photos are shrunk in your browser, then sent to Gemma 4 to read. Names and ID numbers aren&apos;t
            needed, so feel free to cover them.
          </p>
        </div>
      </section>

      <section aria-labelledby="sample-heading" className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="sample-heading" className="font-semibold">
            No reports at hand?
          </h2>
          <p className="text-sm text-ink-subtle">Try a sample patient. These are made-up reports, not real people.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SAMPLES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => onSample(sample)}
                disabled={loadingSample !== null}
                className={buttonSecondary}
              >
                {loadingSample === sample.id ? "Loading sample…" : sample.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={onManual} className={`${buttonQuiet} self-start underline underline-offset-4`}>
          Enter details manually
        </button>
      </section>
    </div>
  );
}
