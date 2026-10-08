import type { PatientProfile } from "@/lib/types";
import { ChevronDown } from "../Icons";

/** "metastasisSites" / "biomarkers[0].result" -> "Metastasis sites" / "Biomarkers result". */
function fieldName(field: string): string {
  const words = field
    .replace(/\[\d+\]/g, "")
    .replace(/[._]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : "Other";
}

export function EvidencePanel({ evidence }: { evidence: PatientProfile["evidence"] }) {
  if (evidence.length === 0) return null;
  return (
    <details className="rounded-lg border border-line bg-white">
      <summary className="flex min-h-14 items-center gap-4 rounded-lg px-4 py-3 hover:bg-stone sm:px-5">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">What Gemma read from the reports</span>
          <span className="block text-sm text-ink-3">
            {evidence.length} exact {evidence.length === 1 ? "quote" : "quotes"} behind the details below. Open to
            compare them with the reports.
          </span>
        </span>
        <ChevronDown className="chevron shrink-0 text-ink-3 transition-transform duration-200" />
      </summary>
      <dl className="grid gap-x-8 gap-y-4 border-t border-line px-4 py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:px-5">
        {evidence.map((item, i) => (
          <div key={i} className="contents">
            <dt className="text-sm font-semibold text-ink-2">{fieldName(item.field)}</dt>
            <dd className="-mt-3 border-l border-line-2 pl-3 font-serif text-[1.0625rem] italic text-ink sm:mt-0">
              &ldquo;{item.quote}&rdquo;
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
