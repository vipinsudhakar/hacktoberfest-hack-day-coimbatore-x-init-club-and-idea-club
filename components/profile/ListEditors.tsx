"use client";

import { useId } from "react";
import { TREATMENT_TYPES } from "@/lib/client/profile";
import type { Biomarker, LabResult, Medication, Treatment } from "@/lib/types";
import { Close, Plus } from "../Icons";
import { buttonQuiet, fieldInput } from "../ui";

const smallLabel = "mb-1.5 block text-sm font-semibold text-ink-2";

function update<T>(list: T[], index: number, patch: Partial<T>): T[] {
  return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

const nullable = (value: string) => (value === "" ? null : value);

function Row({
  title,
  children,
  onRemove,
  removeLabel,
}: {
  title: string;
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <li className="py-5 first:pt-0 last:pb-4">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-semibold text-ink first-letter:uppercase">{title}</p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-ink-3 hover:bg-fail-soft hover:text-fail"
        >
          <Close size={16} /> Remove
        </button>
      </div>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">{children}</div>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-stone px-4 py-3 text-sm text-ink-2">{children}</p>;
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-line border-b border-line">{children}</ul>;
}

export function MedicationsEditor({ value, onChange }: { value: Medication[]; onChange: (v: Medication[]) => void }) {
  const id = useId();
  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <Empty>
          No medicines listed. Add any the patient takes now, including short courses such as antibiotics, and
          supplements.
        </Empty>
      ) : (
        <List>
          {value.map((m, i) => (
            <Row
              key={i}
              title={m.genericName || m.name || "New medicine"}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
              removeLabel={`Remove medicine ${m.name || i + 1}`}
            >
              <div>
                <label htmlFor={`${id}-n${i}`} className={smallLabel}>
                  Medicine, as written
                </label>
                <input
                  id={`${id}-n${i}`}
                  value={m.name}
                  placeholder="e.g. Tab. Clarithromycin 500 mg"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { name: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor={`${id}-g${i}`} className={smallLabel}>
                  Generic name
                </label>
                <input
                  id={`${id}-g${i}`}
                  value={m.genericName ?? ""}
                  placeholder="e.g. clarithromycin"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { genericName: nullable(e.target.value) }))}
                />
              </div>
              <div>
                <label htmlFor={`${id}-d${i}`} className={smallLabel}>
                  Dose
                </label>
                <input
                  id={`${id}-d${i}`}
                  value={m.dose ?? ""}
                  placeholder="e.g. 500 mg twice a day"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { dose: nullable(e.target.value) }))}
                />
              </div>
              <div>
                <label htmlFor={`${id}-u${i}`} className={smallLabel}>
                  Taking until
                </label>
                <input
                  id={`${id}-u${i}`}
                  value={m.until ?? ""}
                  placeholder="e.g. 12 Oct 2026, or ongoing"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { until: nullable(e.target.value) }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${id}-r${i}`} className={smallLabel}>
                  What it&apos;s for
                </label>
                <input
                  id={`${id}-r${i}`}
                  value={m.reason ?? ""}
                  placeholder="e.g. chest infection"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { reason: nullable(e.target.value) }))}
                />
              </div>
            </Row>
          ))}
        </List>
      )}
      <button
        type="button"
        className={buttonQuiet}
        onClick={() => onChange([...value, { name: "", genericName: null, dose: null, until: null, reason: null }])}
      >
        <Plus size={18} /> Add a medicine
      </button>
    </div>
  );
}

export function BiomarkersEditor({ value, onChange }: { value: Biomarker[]; onChange: (v: Biomarker[]) => void }) {
  const id = useId();
  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <Empty>No tumour tests yet. Examples: HER2, ER, PR, EGFR, ALK, PD-L1, BRCA.</Empty>
      ) : (
        <List>
          {value.map((b, i) => (
            <Row
              key={i}
              title={b.name || "New test"}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
              removeLabel={`Remove tumour test ${b.name || i + 1}`}
            >
              <div>
                <label htmlFor={`${id}-n${i}`} className={smallLabel}>
                  Test
                </label>
                <input
                  id={`${id}-n${i}`}
                  value={b.name}
                  placeholder="e.g. HER2"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { name: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor={`${id}-r${i}`} className={smallLabel}>
                  Result
                </label>
                <input
                  id={`${id}-r${i}`}
                  value={b.result}
                  placeholder="e.g. negative (IHC 1+)"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { result: e.target.value }))}
                />
              </div>
            </Row>
          ))}
        </List>
      )}
      <button type="button" className={buttonQuiet} onClick={() => onChange([...value, { name: "", result: "" }])}>
        <Plus size={18} /> Add a tumour test
      </button>
    </div>
  );
}

export function TreatmentsEditor({ value, onChange }: { value: Treatment[]; onChange: (v: Treatment[]) => void }) {
  const id = useId();
  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <Empty>No treatments yet. Add surgery, chemotherapy, radiation and cancer medicines the patient has had.</Empty>
      ) : (
        <List>
          {value.map((t, i) => (
            <Row
              key={i}
              title={t.name || "New treatment"}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
              removeLabel={`Remove treatment ${t.name || i + 1}`}
            >
              <div>
                <label htmlFor={`${id}-n${i}`} className={smallLabel}>
                  Treatment
                </label>
                <input
                  id={`${id}-n${i}`}
                  value={t.name}
                  placeholder="e.g. Paclitaxel"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { name: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor={`${id}-t${i}`} className={smallLabel}>
                  Kind
                </label>
                <select
                  id={`${id}-t${i}`}
                  value={t.type}
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { type: e.target.value as Treatment["type"] }))}
                >
                  {TREATMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-d${i}`} className={smallLabel}>
                  When and how much
                </label>
                <input
                  id={`${id}-d${i}`}
                  value={t.details ?? ""}
                  placeholder="Dates, cycles, line of treatment"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { details: nullable(e.target.value) }))}
                />
              </div>
              <div>
                <label htmlFor={`${id}-o${i}`} className={smallLabel}>
                  How it went
                </label>
                <input
                  id={`${id}-o${i}`}
                  value={t.outcome ?? ""}
                  placeholder="e.g. cancer grew after 14 months"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { outcome: nullable(e.target.value) }))}
                />
              </div>
            </Row>
          ))}
        </List>
      )}
      <button
        type="button"
        className={buttonQuiet}
        onClick={() => onChange([...value, { name: "", type: "other", details: null, outcome: null }])}
      >
        <Plus size={18} /> Add a treatment
      </button>
    </div>
  );
}

export function LabsEditor({ value, onChange }: { value: LabResult[]; onChange: (v: LabResult[]) => void }) {
  const id = useId();
  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <Empty>No test results yet. Examples: haemoglobin, creatinine, bilirubin, platelets.</Empty>
      ) : (
        <List>
          {value.map((lab, i) => (
            <Row
              key={i}
              title={lab.name || "New result"}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
              removeLabel={`Remove test result ${lab.name || i + 1}`}
            >
              <div className="sm:col-span-2">
                <label htmlFor={`${id}-n${i}`} className={smallLabel}>
                  Test
                </label>
                <input
                  id={`${id}-n${i}`}
                  value={lab.name}
                  placeholder="e.g. Haemoglobin"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { name: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor={`${id}-v${i}`} className={smallLabel}>
                  Value
                </label>
                <input
                  id={`${id}-v${i}`}
                  value={lab.value}
                  placeholder="e.g. 11.2"
                  className={`${fieldInput} tabular-nums`}
                  onChange={(e) => onChange(update(value, i, { value: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor={`${id}-u${i}`} className={smallLabel}>
                  Unit
                </label>
                <input
                  id={`${id}-u${i}`}
                  value={lab.unit ?? ""}
                  placeholder="e.g. g/dL"
                  className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { unit: nullable(e.target.value) }))}
                />
              </div>
            </Row>
          ))}
        </List>
      )}
      <button
        type="button"
        className={buttonQuiet}
        onClick={() => onChange([...value, { name: "", value: "", unit: null }])}
      >
        <Plus size={18} /> Add a test result
      </button>
    </div>
  );
}
