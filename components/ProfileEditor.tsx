"use client";

import { useId, useRef, useState } from "react";
import { ECOG_LABELS } from "@/lib/client/profile";
import type { PatientProfile } from "@/lib/types";
import { ArrowLeft, Info } from "./Icons";
import { ChipListInput } from "./profile/ChipListInput";
import { EvidencePanel } from "./profile/EvidencePanel";
import { BiomarkersEditor, LabsEditor, TreatmentsEditor } from "./profile/ListEditors";
import { buttonPrimary, buttonSecondary, card, fieldHint, fieldInput, fieldLabel } from "./ui";

const nullable = (value: string) => (value === "" ? null : value);

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={`${card} p-5 sm:p-6`}>
      <h2 id={id} className="font-serif text-xl font-semibold">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-ink-subtle">{description}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

export function ProfileEditor({
  profile,
  fromReports,
  onChange,
  onSubmit,
  onBack,
}: {
  profile: PatientProfile;
  fromReports: boolean;
  onChange: (profile: PatientProfile) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const id = useId();
  const cancerRef = useRef<HTMLInputElement>(null);
  const [cancerError, setCancerError] = useState(false);
  const set = <K extends keyof PatientProfile>(key: K, value: PatientProfile[K]) => onChange({ ...profile, [key]: value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.cancerType?.trim()) {
      setCancerError(true);
      cancerRef.current?.focus();
      return;
    }
    onSubmit();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="font-serif text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">
          Check the patient&apos;s details
        </h1>
        <p className="mt-2 text-ink-muted">
          {fromReports
            ? "Gemma 4 filled this in from the reports. AI can misread things, so check each field against the reports and fix anything wrong or missing."
            : "Fill in what you know from the reports. Anything left blank becomes a question to ask the doctor."}
        </p>
      </header>

      {fromReports && <EvidencePanel evidence={profile.evidence} />}

      <Section title="About the patient">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${id}-age`} className={fieldLabel}>Age (years)</label>
            <input id={`${id}-age`} type="number" inputMode="numeric" min={0} max={120} className={`${fieldInput} mt-1`}
              value={profile.age ?? ""}
              onChange={(e) => set("age", e.target.value === "" ? null : Math.round(Number(e.target.value)))} />
          </div>
          <div>
            <label htmlFor={`${id}-sex`} className={fieldLabel}>Sex</label>
            <select id={`${id}-sex`} className={`${fieldInput} mt-1`} value={profile.sex ?? ""}
              onChange={(e) => set("sex", (nullable(e.target.value) as PatientProfile["sex"]) ?? null)}>
              <option value="">Not stated</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-city`} className={fieldLabel}>City</label>
            <input id={`${id}-city`} className={`${fieldInput} mt-1`} placeholder="e.g. Coimbatore" value={profile.city ?? ""}
              onChange={(e) => set("city", nullable(e.target.value))} />
          </div>
        </div>
      </Section>

      <Section title="Diagnosis">
        <div>
          <label htmlFor={`${id}-cancer`} className={fieldLabel}>
            Cancer type <span className="font-normal text-ink-subtle">(required)</span>
          </label>
          <p id={`${id}-cancer-hint`} className={`${fieldHint} flex gap-1.5`}>
            <Info size={16} className="mt-0.5 shrink-0 text-brand-600" />
            <span>
              This is what we search the trial registry for. Use the common name, for example
              &ldquo;breast cancer&rdquo; or &ldquo;non-small cell lung cancer&rdquo;.
            </span>
          </p>
          <input ref={cancerRef} id={`${id}-cancer`} required aria-required="true"
            aria-invalid={cancerError || undefined}
            aria-describedby={`${id}-cancer-hint${cancerError ? ` ${id}-cancer-error` : ""}`}
            className={`${fieldInput} mt-2 ${cancerError ? "border-rose-700" : ""}`}
            value={profile.cancerType ?? ""}
            onChange={(e) => {
              set("cancerType", nullable(e.target.value));
              if (e.target.value.trim()) setCancerError(false);
            }} />
          {cancerError && (
            <p id={`${id}-cancer-error`} className="mt-1 text-sm font-semibold text-rose-800">
              Enter the cancer type so we know which trials to look for.
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-hist`} className={fieldLabel}>Histology (cell type)</label>
            <input id={`${id}-hist`} className={`${fieldInput} mt-1`} placeholder="e.g. Invasive ductal carcinoma"
              value={profile.histology ?? ""} onChange={(e) => set("histology", nullable(e.target.value))} />
          </div>
          <div>
            <label htmlFor={`${id}-stage`} className={fieldLabel}>Stage</label>
            <input id={`${id}-stage`} className={`${fieldInput} mt-1`} placeholder="e.g. Stage IV (pT2 N1 M1)"
              value={profile.stage ?? ""} onChange={(e) => set("stage", nullable(e.target.value))} />
          </div>
        </div>
        <fieldset>
          <legend className={fieldLabel}>Has the cancer spread to other organs (metastatic)?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {([["Yes", true], ["No", false], ["Not sure", null]] as const).map(([label, value]) => (
              <label key={label}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-600">
                <input type="radio" name={`${id}-met`} checked={profile.metastatic === value}
                  onChange={() => set("metastatic", value)} className="size-4 accent-brand-700 focus-visible:outline-none" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <ChipListInput label="Where has it spread?" placeholder="e.g. bone, liver" values={profile.metastasisSites}
          onChange={(v) => set("metastasisSites", v)} />
      </Section>

      <Section title="Biomarkers" description="Test results on the tumour, such as hormone receptors or gene changes.">
        <BiomarkersEditor value={profile.biomarkers} onChange={(v) => set("biomarkers", v)} />
      </Section>

      <Section title="Treatments so far" description="Many trials depend on what the patient has already received.">
        <TreatmentsEditor value={profile.treatments} onChange={(v) => set("treatments", v)} />
      </Section>

      <Section title="Overall health">
        <div>
          <label htmlFor={`${id}-ecog`} className={fieldLabel}>ECOG performance status</label>
          <p id={`${id}-ecog-hint`} className={fieldHint}>
            How well the patient manages daily activities. Many trials need 0 or 1.
          </p>
          <select id={`${id}-ecog`} aria-describedby={`${id}-ecog-hint`} className={`${fieldInput} mt-2 sm:max-w-md`}
            value={profile.ecog ?? ""}
            onChange={(e) => set("ecog", e.target.value === "" ? null : Number(e.target.value))}>
            <option value="">Not stated</option>
            {[0, 1, 2, 3, 4, 5].map((score) => (
              <option key={score} value={score}>{ECOG_LABELS[score]}</option>
            ))}
          </select>
        </div>
        <div>
          <h3 className={fieldLabel}>Lab results</h3>
          <div className="mt-2">
            <LabsEditor value={profile.labs} onChange={(v) => set("labs", v)} />
          </div>
        </div>
        <ChipListInput label="Other medical conditions" placeholder="e.g. type 2 diabetes"
          hint="Long-term conditions such as diabetes, heart or kidney disease, hepatitis."
          values={profile.comorbidities} onChange={(v) => set("comorbidities", v)} />
        <ChipListInput label="Other findings" placeholder="e.g. brain MRI clear"
          values={profile.otherFindings} onChange={(v) => set("otherFindings", v)} />
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={onBack} className={buttonSecondary}>
            <ArrowLeft size={18} /> Back to reports
          </button>
          <button type="submit" className={buttonPrimary}>
            Find matching trials
          </button>
        </div>
      </div>
    </form>
  );
}
