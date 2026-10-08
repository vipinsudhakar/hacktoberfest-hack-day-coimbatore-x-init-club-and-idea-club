import type { PatientProfile } from "@/lib/types";
import { ChevronDown, FileText } from "../Icons";

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
    <details className="group rounded-2xl border border-line bg-surface">
      <summary className="flex min-h-14 items-center gap-3 rounded-2xl px-5 py-3 hover:bg-brand-50">
        <FileText className="shrink-0 text-brand-600" />
        <span className="flex-1">
          <span className="font-semibold">What Gemma read from the reports</span>
          <span className="block text-sm text-ink-subtle">
            {evidence.length} {evidence.length === 1 ? "quote" : "quotes"} behind the details above. Compare them
            with the reports if anything looks off.
          </span>
        </span>
        <ChevronDown className="chevron shrink-0 text-ink-subtle transition-transform" />
      </summary>
      <dl className="space-y-3 border-t border-line px-5 py-4">
        {evidence.map((item, i) => (
          <div key={i}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{fieldName(item.field)}</dt>
            <dd className="mt-1 border-l-4 border-brand-100 pl-3 text-[0.95rem] italic text-ink-muted">
              &ldquo;{item.quote}&rdquo;
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
