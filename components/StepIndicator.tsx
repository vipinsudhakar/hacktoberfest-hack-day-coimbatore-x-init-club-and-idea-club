const STEPS = ["Add reports", "Check details", "See trials"] as const;

export function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Progress" className="print:hidden">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {STEPS.map((label, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={label} className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                  state === "current"
                    ? "bg-brand-700 text-white"
                    : state === "done"
                      ? "bg-brand-100 text-brand-800"
                      : "border border-line-strong text-ink-subtle"
                }`}
              >
                {i + 1}
              </span>
              <span className={state === "current" ? "font-semibold text-ink" : "text-ink-subtle"}>
                {label}
                {state === "done" && <span className="sr-only"> (done)</span>}
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className="mx-1 h-px w-6 bg-line-strong sm:w-10" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
