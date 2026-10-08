import { LogoMark } from "@/components/Icons";
import { TrialBridgeApp } from "@/components/TrialBridgeApp";
import { column } from "@/components/ui";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <header className="print:hidden">
        <div className={`${column} flex items-center justify-between gap-4 border-b border-line py-4`}>
          <p className="flex items-center gap-2.5 text-ink">
            <LogoMark size={26} className="text-accent" />
            <span className="font-serif text-[1.375rem] font-semibold tracking-[-0.015em]">TrialBridge</span>
          </p>
          <p className="hidden text-sm text-ink-3 sm:block">Cancer clinical trials in India, explained</p>
        </div>
      </header>

      <main id="main" className={`${column} flex-1 pb-16 pt-8 sm:pt-12 print:max-w-none print:p-0`}>
        <TrialBridgeApp />
      </main>

      <footer className="print:hidden">
        <div className={`${column} space-y-2 border-t border-line py-8 text-sm text-ink-3`}>
          <p className="max-w-[42rem]">
            Not medical advice. TrialBridge helps patients and families prepare questions for their oncologist. Only
            the trial team can confirm who can join a trial.
          </p>
          <p className="max-w-[42rem]">
            Trial data from{" "}
            <a href="https://clinicaltrials.gov" className="text-ink-2 underline decoration-line-2 hover:decoration-ink-2">
              ClinicalTrials.gov
            </a>{" "}
            (U.S. National Library of Medicine). Reports and rules are read by Gemma 4, Google&apos;s open-weight model.
          </p>
        </div>
      </footer>
    </>
  );
}
