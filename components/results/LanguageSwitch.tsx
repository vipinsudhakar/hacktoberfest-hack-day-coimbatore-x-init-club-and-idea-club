"use client";

import type { Language } from "@/lib/api";

export type ResultLanguage = "en" | Language;

const OPTIONS: { value: ResultLanguage; label: string; lang: string }[] = [
  { value: "en", label: "English", lang: "en" },
  { value: "ta", label: "தமிழ்", lang: "ta" },
  { value: "hi", label: "हिन्दी", lang: "hi" },
];

/** Shows the explanations in Tamil or Hindi; the trials' own rules stay in English as written. */
export function LanguageSwitch({
  value,
  onChange,
  disabled,
  status,
}: {
  value: ResultLanguage;
  onChange: (value: ResultLanguage) => void;
  disabled: boolean;
  status: string | null;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2" disabled={disabled}>
      <legend className="sr-only">Language for the explanations</legend>
      <span className="text-sm font-semibold text-ink" aria-hidden>
        Read the explanations in
      </span>
      <div className="flex rounded-md border border-line bg-stone p-0.5">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            lang={o.lang}
            className="relative flex min-h-9 cursor-pointer items-center rounded-[5px] px-3 text-sm font-semibold text-ink-3 transition-colors duration-150 hover:text-ink has-[:checked]:bg-surface has-[:checked]:text-ink has-[:checked]:shadow-[0_1px_2px_rgb(0_0_0/0.12)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent"
          >
            <input
              type="radio"
              name="result-language"
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      <span className="text-sm text-ink-3" aria-live="polite">
        {status}
      </span>
    </fieldset>
  );
}
