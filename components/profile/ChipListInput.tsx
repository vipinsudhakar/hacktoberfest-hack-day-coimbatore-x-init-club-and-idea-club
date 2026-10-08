"use client";

import { useId, useState } from "react";
import { Close } from "../Icons";
import { buttonSecondary, fieldHint, fieldInput, fieldLabel } from "../ui";

/** Free-text list (metastasis sites, conditions…) edited as removable chips. */
export function ChipListInput({
  label,
  hint,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  hint?: string;
  placeholder?: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (value && !values.some((v) => v.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
    setDraft("");
  }

  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className={fieldHint}>
          {hint}
        </p>
      )}
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label={`${label} added`}>
          {values.map((value, i) => (
            <li
              key={`${value}-${i}`}
              className="flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 py-1 pl-3 pr-1 text-sm text-brand-800"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                aria-label={`Remove ${value}`}
                className="flex size-7 items-center justify-center rounded-full hover:bg-brand-100"
              >
                <Close size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          value={draft}
          placeholder={placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={fieldInput}
        />
        <button type="button" onClick={add} className={buttonSecondary}>
          Add
        </button>
      </div>
    </div>
  );
}
