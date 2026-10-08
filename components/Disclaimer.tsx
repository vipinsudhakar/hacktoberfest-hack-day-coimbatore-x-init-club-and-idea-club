import { Info } from "./Icons";

export const DISCLAIMER_LEAD = "Not medical advice.";
export const DISCLAIMER_BODY =
  "TrialBridge is an AI screening aid. The AI can misread reports or rules, so every result means the patient may qualify, never that they do. Only the patient's oncologist and the trial team can confirm eligibility. Uploaded reports are sent to Google's Gemini API, where Gemma 4 reads them.";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted ${className}`}
    >
      <Info size={18} className="mt-0.5 shrink-0 text-brand-600" />
      <span>
        <strong className="font-semibold text-ink">{DISCLAIMER_LEAD}</strong> {DISCLAIMER_BODY}
      </span>
    </p>
  );
}
