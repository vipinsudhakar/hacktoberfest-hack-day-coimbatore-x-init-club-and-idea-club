// Shared class strings so buttons and fields look and behave the same everywhere.

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const buttonPrimary = `${buttonBase} bg-brand-700 text-white shadow-sm hover:bg-brand-800`;

export const buttonSecondary = `${buttonBase} border border-line-strong bg-surface text-ink hover:border-brand-600 hover:bg-brand-50`;

export const buttonQuiet = `${buttonBase} text-brand-700 hover:bg-brand-50`;

export const fieldInput =
  "block w-full min-h-11 rounded-lg border border-line-strong bg-surface px-3 py-2 text-base text-ink placeholder:text-ink-subtle/80 hover:border-ink-subtle focus-visible:border-brand-600";

export const fieldLabel = "block text-sm font-semibold text-ink";

export const fieldHint = "mt-1 text-sm text-ink-subtle";

export const card = "rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(22_36_44/0.04)]";
