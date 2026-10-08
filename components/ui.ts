// Shared class strings so buttons, fields and panels look and behave the same everywhere.

/** One column for every screen, so headings, fields and results share a single left edge. */
export const column = "mx-auto w-full max-w-[54rem] px-4 sm:px-6";

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-base font-semibold press disabled:cursor-not-allowed disabled:opacity-45";

export const buttonPrimary = `${buttonBase} bg-accent text-on-accent shadow-[0_1px_2px_rgb(18_21_25/0.18)] hover:bg-accent-strong hover:shadow-[0_2px_6px_-1px_rgb(18_21_25/0.25)] active:bg-accent-strong`;

export const buttonSecondary = `${buttonBase} border border-line-2 bg-paper text-ink hover:border-ink-2 hover:bg-stone`;

export const buttonQuiet = `${buttonBase} -mx-2 px-2 text-accent hover:bg-accent-soft`;

export const textLink = "font-semibold text-accent underline decoration-accent-line underline-offset-4 hover:decoration-accent";

export const fieldInput =
  "block w-full min-h-11 rounded-md border border-line-2 bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-3 hover:border-ink-2 focus-visible:border-accent focus-visible:outline-offset-0 aria-[invalid=true]:border-fail";

export const fieldLabel = "block text-sm font-semibold text-ink";

export const fieldHint = "mt-0.5 text-sm text-ink-3";

/** A quiet bordered surface for repeated items (trials, list rows). Never nest one inside another. */
export const panel = "rounded-lg border border-line bg-surface";

export const sectionTitle = "font-serif text-xl font-medium tracking-[-0.01em] text-ink";

export const pageTitle =
  "font-serif text-3xl font-medium tracking-[-0.02em] text-ink sm:text-4xl [font-variation-settings:'opsz'_72]";
