"use client";

import { useId, useRef, useState } from "react";
import { ECOG_LABELS } from "@/lib/client/profile";
import type { PatientProfile } from "@/lib/types";
import { ArrowLeft, ArrowRight, ChevronDown } from "./Icons";
import { ChipListInput } from "./profile/ChipListInput";
import { EvidencePanel } from "./profile/EvidencePanel";
import { BiomarkersEditor, LabsEditor, MedicationsEditor, TreatmentsEditor } from "./profile/ListEditors";
import { buttonPrimary, buttonSecondary, fieldHint, fieldInput, fieldLabel, pageTitle, sectionTitle } from "./ui";

const nullable = (value: string) => (value === "" ? null : value);

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="grid gap-x-10 gap-y-5 border-t border-line pt-8 md:grid-cols-[13rem_minmax(0,1fr)]"
    >
      <div>
        <h2 id={id} className={sectionTitle}>
          {title}
        </h2>
        {description && <p className="mt-1.5 text-sm text-ink-3">{description}</p>}
      </div>
      <div className="min-w-0 space-y-6">{children}</div>
    </section>
  );
}

/** The form uses noValidate, so the browser won't stop an age like 400: keep it within 0–120 here. */
function parseAge(value: string): number | null {
  if (value === "") return null;
  const age = Math.round(Number(value));
  return Number.isFinite(age) ? Math.min(120, Math.max(0, age)) : null;
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
  const extraCount =
    (profile.ecog !== null ? 1 : 0) + profile.labs.length + profile.comorbidities.length + profile.otherFindings.length;

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
    <form onSubmit={submit} noValidate className="space-y-10">
      <header className="max-w-[42rem]">
        <h1 className={pageTitle}>Check the details</h1>
        <p className="mt-4 text-lg text-ink-2">
          {fromReports
            ? "Gemma 4 filled this in from the photos. AI can misread things, so compare each part with the reports and fix anything wrong or missing. Blank fields are fine: they become questions for the doctor."
            : "Fill in what you know from the reports. Only the cancer type is needed. Anything left blank becomes a question for the doctor."}
        </p>
      </header>

      {fromReports && <EvidencePanel evidence={profile.evidence} />}

      <Section title="Diagnosis" description="What the cancer is and how far it has spread.">
        <div>
          <label htmlFor={`${id}-cancer`} className={fieldLabel}>
            Cancer type <span className="font-normal text-ink-3">(needed)</span>
          </label>
          <p id={`${id}-cancer-hint`} className={fieldHint}>
            We search the trial registry for this. Use the common name, for example &ldquo;breast cancer&rdquo; or
            &ldquo;non-small cell lung cancer&rdquo;.
          </p>
          <input
            ref={cancerRef}
            id={`${id}-cancer`}
            required
            aria-required="true"
            aria-invalid={cancerError || undefined}
            aria-describedby={`${id}-cancer-hint${cancerError ? ` ${id}-cancer-error` : ""}`}
            className={`${fieldInput} mt-2`}
            value={profile.cancerType ?? ""}
            onChange={(e) => {
              set("cancerType", nullable(e.target.value));
              if (e.target.value.trim()) setCancerError(false);
            }}
          />
          {cancerError && (
            <p id={`${id}-cancer-error`} className="mt-1.5 text-sm font-semibold text-fail">
              Enter the cancer type so we know which trials to look for.
            </p>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-hist`} className={fieldLabel}>
              Cell type (histology)
            </label>
            <input
              id={`${id}-hist`}
              className={`${fieldInput} mt-1.5`}
              placeholder="e.g. Invasive ductal carcinoma"
              value={profile.histology ?? ""}
              onChange={(e) => set("histology", nullable(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor={`${id}-stage`} className={fieldLabel}>
              Stage
            </label>
            <input
              id={`${id}-stage`}
              className={`${fieldInput} mt-1.5`}
              placeholder="e.g. Stage IV"
              value={profile.stage ?? ""}
              onChange={(e) => set("stage", nullable(e.target.value))}
            />
          </div>
        </div>
        <fieldset>
          <legend className={fieldLabel}>Has the cancer spread to other organs?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["Yes", true],
                ["No", false],
                ["Not sure", null],
              ] as const
            ).map(([label, value]) => (
              <label
                key={label}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-line-2 bg-surface px-4 hover:border-ink-2 has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
              >
                <input
                  type="radio"
                  name={`${id}-met`}
                  checked={profile.metastatic === value}
                  onChange={() => set("metastatic", value)}
                  className="size-4 accent-accent focus-visible:outline-none"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <ChipListInput
          label="Where has it spread?"
          placeholder="e.g. bone, liver"
          values={profile.metastasisSites}
          onChange={(v) => set("metastasisSites", v)}
        />
      </Section>

      <Section title="The patient">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor={`${id}-age`} className={fieldLabel}>
              Age (years)
            </label>
            <input
              id={`${id}-age`}
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              className={`${fieldInput} mt-1.5`}
              value={profile.age ?? ""}
              onChange={(e) => set("age", parseAge(e.target.value))}
            />
          </div>
          <div>
            <label htmlFor={`${id}-sex`} className={fieldLabel}>
              Sex
            </label>
            <select
              id={`${id}-sex`}
              className={`${fieldInput} mt-1.5`}
              value={profile.sex ?? ""}
              onChange={(e) => set("sex", (nullable(e.target.value) as PatientProfile["sex"]) ?? null)}
            >
              <option value="">Not stated</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-city`} className={fieldLabel}>
              Home city
            </label>
            <input
              id={`${id}-city`}
              className={`${fieldInput} mt-1.5`}
              placeholder="e.g. Coimbatore"
              aria-describedby={`${id}-city-hint`}
              value={profile.city ?? ""}
              onChange={(e) => set("city", nullable(e.target.value))}
            />
          </div>
        </div>
        <p id={`${id}-city-hint`} className="-mt-3 text-sm text-ink-3">
          Age and sex decide which trials are open to the patient. Hospitals in the home city are shown first.
        </p>
      </Section>

      <Section
        title="Current medicines"
        description="Some trials don't allow certain other medicines, such as some antibiotics or steroids. We check the matching trials' rules against this list."
      >
        <MedicationsEditor value={profile.medications} onChange={(v) => set("medications", v)} />
      </Section>

      <Section title="Tumour tests" description="Biomarkers: results such as hormone receptors or gene changes.">
        <BiomarkersEditor value={profile.biomarkers} onChange={(v) => set("biomarkers", v)} />
      </Section>

      <Section title="Treatments so far" description="Many trials depend on what the patient has already had.">
        <TreatmentsEditor value={profile.treatments} onChange={(v) => set("treatments", v)} />
      </Section>

      <details className="group border-t border-line pt-2">
        <summary className="-mx-2 flex min-h-14 items-center gap-4 rounded-md px-2 py-3 hover:bg-stone">
          <span className="min-w-0 flex-1">
            <span className={`${sectionTitle} block`}>More health details</span>
            <span className="mt-0.5 block text-sm text-ink-3">
              Daily activity, blood tests and other conditions. Optional
              {extraCount > 0 ? ` · ${extraCount} filled in` : ""}.
            </span>
          </span>
          <ChevronDown className="chevron shrink-0 text-ink-3 transition-transform duration-200" />
        </summary>
        <div className="space-y-7 pb-2 pt-6 md:pl-[15.5rem]">
          <div>
            <label htmlFor={`${id}-ecog`} className={fieldLabel}>
              Daily activity level (ECOG score)
            </label>
            <p id={`${id}-ecog-hint`} className={fieldHint}>
              How well the patient manages day to day. Many trials need 0 or 1.
            </p>
            <select
              id={`${id}-ecog`}
              aria-describedby={`${id}-ecog-hint`}
              className={`${fieldInput} mt-2`}
              value={profile.ecog ?? ""}
              onChange={(e) => set("ecog", e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">Not stated</option>
              {[0, 1, 2, 3, 4, 5].map((score) => (
                <option key={score} value={score}>
                  {ECOG_LABELS[score]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <h3 className={fieldLabel}>Blood and other test results</h3>
            <div className="mt-2">
              <LabsEditor value={profile.labs} onChange={(v) => set("labs", v)} />
            </div>
          </div>
          <ChipListInput
            label="Other medical conditions"
            placeholder="e.g. type 2 diabetes"
            hint="Long-term conditions such as diabetes, heart or kidney disease, hepatitis."
            values={profile.comorbidities}
            onChange={(v) => set("comorbidities", v)}
          />
          <ChipListInput
            label="Other findings"
            placeholder="e.g. brain MRI clear"
            values={profile.otherFindings}
            onChange={(v) => set("otherFindings", v)}
          />
        </div>
      </details>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-paper px-4 py-3 shadow-[0_-6px_16px_-8px_rgb(18_21_25/0.12)] sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onBack} className={buttonSecondary}>
            <ArrowLeft size={18} /> Back
          </button>
          <button type="submit" className={`${buttonPrimary} min-h-12 flex-1 px-6 sm:flex-none`}>
            Find matching trials
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </form>
  );
}
