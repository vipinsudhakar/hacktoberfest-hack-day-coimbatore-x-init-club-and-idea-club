import { LogoMark } from "@/components/Icons";
import { TrialBridgeApp } from "@/components/TrialBridgeApp";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-700 text-white">
            <LogoMark size={22} />
          </span>
          <div>
            <p className="font-serif text-xl font-semibold leading-none">TrialBridge</p>
            <p className="mt-1 text-sm leading-none text-ink-subtle">Cancer clinical trials in India, explained</p>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10 print:max-w-none print:p-0">
        <TrialBridgeApp />
      </main>

      <footer className="border-t border-line print:hidden">
        <div className="mx-auto max-w-5xl space-y-1 px-4 py-6 text-sm text-ink-subtle sm:px-6">
          <p>
            Not medical advice. TrialBridge helps patients and families prepare questions for their oncologist; only the
            trial team can confirm eligibility.
          </p>
          <p>
            Trial data from{" "}
            <a href="https://clinicaltrials.gov" className="text-brand-700 underline underline-offset-4">
              ClinicalTrials.gov
            </a>{" "}
            (U.S. National Library of Medicine). Reports and rules are read by Gemma 4, Google&apos;s open-weight model.
          </p>
        </div>
      </footer>
    </>
  );
}
