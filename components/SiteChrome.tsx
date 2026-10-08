import Link from "next/link";
import { LogoMark } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";
import { column } from "./ui";

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-ink focus:shadow"
    >
      Skip to content
    </a>
  );
}

export function SiteHeader() {
  return (
    <header className="print:hidden">
      <div className={`${column} flex items-center justify-between gap-3 border-b border-line py-3.5`}>
        <Link href="/" className="-m-1 flex items-center gap-2.5 rounded-md p-1 text-ink no-underline">
          <LogoMark size={28} />
          <span className="font-serif text-[1.375rem] font-semibold tracking-[-0.015em]">TrialBridge</span>
        </Link>
        <div className="flex items-center gap-5">
          <p className="hidden text-sm text-ink-3 md:block">Cancer clinical trials in India, explained</p>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="print:hidden">
      <div className={`${column} space-y-2 border-t border-line py-8 text-sm text-ink-3`}>
        <p className="max-w-[42rem]">
          Not medical advice. TrialBridge helps patients and families prepare questions for their oncologist. Only the
          trial team can confirm who can join a trial.
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
  );
}
