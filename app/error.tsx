"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { Refresh } from "@/components/Icons";
import { buttonPrimary, buttonSecondary, pageTitle } from "@/components/ui";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section aria-labelledby="error-heading" className="max-w-[42rem] py-6 sm:py-12">
      <h1 id="error-heading" className={pageTitle}>
        Something went wrong on this page
      </h1>
      <p className="mt-5 text-lg text-ink-2">
        It&apos;s a problem in TrialBridge, not with the reports you added. Trying again usually fixes it. If it
        doesn&apos;t, start over: it only takes a minute to add the photos again.
      </p>
      {error.digest && <p className="mt-4 font-mono text-sm text-ink-3">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => retry()} className={buttonPrimary}>
          <Refresh size={18} /> Try again
        </button>
        {/* A full page load, so a broken client state can't follow the reader back. */}
        <button type="button" onClick={() => window.location.assign(window.location.origin)} className={buttonSecondary}>
          Start over
        </button>
      </div>
    </section>
  );
}
