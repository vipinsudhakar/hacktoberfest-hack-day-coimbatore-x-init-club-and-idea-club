"use client";

import { useId } from "react";
import { TREATMENT_TYPES } from "@/lib/client/profile";
import type { Biomarker, LabResult, Treatment } from "@/lib/types";
import { Close, Plus } from "../Icons";
import { buttonQuiet, fieldInput } from "../ui";

const smallLabel = "mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-subtle";

function update<T>(list: T[], index: number, patch: Partial<T>): T[] {
  return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

const nullable = (value: string) => (value === "" ? null : value);

function Row({ children, onRemove, removeLabel }: { children: React.ReactNode; onRemove: () => void; removeLabel: string }) {
  return (
    <li className="flex items-start gap-2 rounded-xl border border-line bg-canvas/50 p-3">
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="mt-6 flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-subtle hover:bg-rose-50 hover:text-rose-800"
      >
        <Close size={18} />
      </button>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line-strong px-3 py-3 text-sm text-ink-subtle">{children}</p>;
}

export function BiomarkersEditor({ value, onChange }: { value: Biomarker[]; onChange: (v: Biomarker[]) => void }) {
  const id = useId();
  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <Empty>No biomarkers yet. Examples: HER2, ER, PR, EGFR, ALK, PD-L1, BRCA.</Empty>
      ) : (
        <ul className="space-y-3">
          {value.map((b, i) => (
            <Row key={i} onRemove={() => onChange(value.filter((_, j) => j !== i))} removeLabel={`Remove biomarker ${b.name || i + 1}`}>
              <div>
                <label htmlFor={`${id}-n${i}`} className={smallLabel}>Biomarker</label>
                <input id={`${id}-n${i}`} value={b.name} placeholder="e.g. HER2" className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { name: e.target.value }))} />
              </div>
              <div>
                <label htmlFor={`${id}-r${i}`} className={smallLabel}>Result</label>
                <input id={`${id}-r${i}`} value={b.result} placeholder="e.g. negative (IHC 1+)" className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { result: e.target.value }))} />
              </div>
            </Row>
          ))}
        </ul>
      )}
      <button type="button" className={buttonQuiet} onClick={() => onChange([...value, { name: "", result: "" }])}>
        <Plus size={18} /> Add biomarker
      </button>
    </div>
  );
}

export function TreatmentsEditor({ value, onChange }: { value: Treatment[]; onChange: (v: Treatment[]) => void }) {
  const id = useId();
  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <Empty>No treatments yet. Add surgery, chemotherapy, radiation and medicines the patient has had.</Empty>
      ) : (
        <ul className="space-y-3">
          {value.map((t, i) => (
            <Row key={i} onRemove={() => onChange(value.filter((_, j) => j !== i))} removeLabel={`Remove treatment ${t.name || i + 1}`}>
              <div>
                <label htmlFor={`${id}-n${i}`} className={smallLabel}>Treatment</label>
                <input id={`${id}-n${i}`} value={t.name} placeholder="e.g. Paclitaxel" className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { name: e.target.value }))} />
              </div>
              <div>
                <label htmlFor={`${id}-t${i}`} className={smallLabel}>Type</label>
                <select id={`${id}-t${i}`} value={t.type} className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { type: e.target.value as Treatment["type"] }))}>
                  {TREATMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-d${i}`} className={smallLabel}>Details</label>
                <input id={`${id}-d${i}`} value={t.details ?? ""} placeholder="Dates, cycles, line of therapy" className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { details: nullable(e.target.value) }))} />
              </div>
              <div>
                <label htmlFor={`${id}-o${i}`} className={smallLabel}>Outcome</label>
                <input id={`${id}-o${i}`} value={t.outcome ?? ""} placeholder="e.g. progressed after 14 months" className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { outcome: nullable(e.target.value) }))} />
              </div>
            </Row>
          ))}
        </ul>
      )}
      <button type="button" className={buttonQuiet}
        onClick={() => onChange([...value, { name: "", type: "other", details: null, outcome: null }])}>
        <Plus size={18} /> Add treatment
      </button>
    </div>
  );
}

export function LabsEditor({ value, onChange }: { value: LabResult[]; onChange: (v: LabResult[]) => void }) {
  const id = useId();
  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <Empty>No lab results yet. Examples: haemoglobin, creatinine, bilirubin, platelets.</Empty>
      ) : (
        <ul className="space-y-3">
          {value.map((lab, i) => (
            <Row key={i} onRemove={() => onChange(value.filter((_, j) => j !== i))} removeLabel={`Remove lab result ${lab.name || i + 1}`}>
              <div className="sm:col-span-2">
                <label htmlFor={`${id}-n${i}`} className={smallLabel}>Test</label>
                <input id={`${id}-n${i}`} value={lab.name} placeholder="e.g. Haemoglobin" className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { name: e.target.value }))} />
              </div>
              <div>
                <label htmlFor={`${id}-v${i}`} className={smallLabel}>Value</label>
                <input id={`${id}-v${i}`} value={lab.value} placeholder="e.g. 11.2" className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { value: e.target.value }))} />
              </div>
              <div>
                <label htmlFor={`${id}-u${i}`} className={smallLabel}>Unit</label>
                <input id={`${id}-u${i}`} value={lab.unit ?? ""} placeholder="e.g. g/dL" className={fieldInput}
                  onChange={(e) => onChange(update(value, i, { unit: nullable(e.target.value) }))} />
              </div>
            </Row>
          ))}
        </ul>
      )}
      <button type="button" className={buttonQuiet} onClick={() => onChange([...value, { name: "", value: "", unit: null }])}>
        <Plus size={18} /> Add lab result
      </button>
    </div>
  );
}
