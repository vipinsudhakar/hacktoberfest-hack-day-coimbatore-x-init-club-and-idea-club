"use client"; // Error boundaries must be Client Components

import { LOGO_PATHS } from "@/components/Icons";
import { THEME_BOOT_SCRIPT } from "@/lib/client/theme";
import "./globals.css";

/**
 * Replaces the whole page when the root layout itself fails, so it carries its own document, styles and theme.
 * Fonts fall back to the system serif and sans: the message matters more than the typeface here.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <title>Something went wrong · TrialBridge</title>
        <main className="mx-auto w-full max-w-[54rem] px-4 py-12 sm:px-6 sm:py-20">
          <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" className="fill-accent" />
            <g fill="none" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="stroke-on-accent">
              {LOGO_PATHS.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          </svg>
          <h1 className="mt-8 max-w-[42rem] font-serif text-3xl font-medium tracking-[-0.02em] text-ink sm:text-4xl">
            TrialBridge couldn&apos;t load
          </h1>
          <p className="mt-5 max-w-[42rem] text-lg text-ink-2">
            Something went wrong on our side. Please try again in a moment. Nothing you added is stored, so starting
            over is safe.
          </p>
          {error.digest && <p className="mt-4 font-mono text-sm text-ink-3">Reference: {error.digest}</p>}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => retry()}
              className="press inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 py-2 font-semibold text-on-accent hover:bg-accent-strong"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.assign(window.location.origin)}
              className="press inline-flex min-h-11 items-center justify-center rounded-md border border-line-2 px-4 py-2 font-semibold text-ink hover:bg-stone"
            >
              Start over
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
