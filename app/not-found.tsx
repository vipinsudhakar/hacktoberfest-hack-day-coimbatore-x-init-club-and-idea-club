import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@/components/Icons";
import { buttonPrimary, pageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section aria-labelledby="not-found-heading" className="max-w-[42rem] py-6 sm:py-12">
      <p className="font-mono text-sm tabular-nums text-ink-3">Error 404</p>
      <h1 id="not-found-heading" className={`${pageTitle} mt-3`}>
        This page isn&apos;t here
      </h1>
      <p className="mt-5 text-lg text-ink-2">
        The link may be old or have a typing mistake in it. Nothing you added has been lost: TrialBridge doesn&apos;t
        keep reports or results between visits.
      </p>
      <Link href="/" className={`${buttonPrimary} mt-8 no-underline`}>
        <ArrowLeft size={18} /> Start a trial search
      </Link>
    </section>
  );
}
