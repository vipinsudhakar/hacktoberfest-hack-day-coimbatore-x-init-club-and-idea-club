import { Spinner } from "./Icons";
import { buttonSecondary, card } from "./ui";

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
  const reports = `${count} ${count === 1 ? "report" : "reports"}`;
  return (
    <section aria-labelledby="reading-heading" aria-busy="true" className={`${card} mx-auto max-w-2xl p-6 sm:p-8`}>
      <div className="flex items-start gap-4">
        <Spinner size={28} className="mt-1 shrink-0 text-brand-600" />
        <div aria-live="polite">
          <h1 id="reading-heading" className="font-serif text-2xl font-semibold">
            {phase === "preparing" ? `Preparing ${reports}…` : `Gemma 4 is reading ${reports}…`}
          </h1>
          <p className="mt-2 text-ink-muted">
            It looks for the diagnosis, stage, biomarkers, past treatments and lab values, and notes the exact
            words it read so you can check them. This can take a minute.
          </p>
        </div>
      </div>
      {previews.length > 0 && (
        <ul aria-hidden="true" className="mt-6 flex flex-wrap gap-3">
          {previews.map((src) => (
            <li key={src} className="w-16 overflow-hidden rounded-md border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={src} alt="" className="aspect-[3/4] w-full animate-pulse object-cover opacity-80" />
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onCancel} className={`${buttonSecondary} mt-6`}>
        Cancel
      </button>
    </section>
  );
}
