export const DISCLAIMER_LEAD = "Not medical advice.";
export const DISCLAIMER_BODY =
  "TrialBridge is an AI screening aid. The AI can misread reports or rules, so every result means the patient may qualify, never that they do. Only the patient's oncologist and the trial team can confirm eligibility. Uploaded reports are sent to Google's Gemini API, where Gemma 4 reads them.";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <aside aria-label="About these results" className={`border-t border-line pt-5 text-sm text-ink-2 ${className}`}>
      <p className="max-w-[42rem]">
        <strong className="font-semibold text-ink">{DISCLAIMER_LEAD}</strong> {DISCLAIMER_BODY}
      </p>
    </aside>
  );
}
