const STEPS = ["Add reports", "Check details", "See trials"] as const;

/** "Step 2 of 3" with a thin three-part bar: tells a worried reader exactly where they are. */
export function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Progress" className="print:hidden">
      <p className="text-sm text-ink-3">
        <span className="font-mono tabular-nums">Step {current + 1} of 3</span>
        <span aria-hidden="true" className="px-2 text-line-2">
          /
        </span>
        <span className="font-semibold text-ink">{STEPS[current]}</span>
      </p>
      <ol className="mt-2.5 grid grid-cols-3 gap-1.5">
        {STEPS.map((label, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={label} aria-current={state === "current" ? "step" : undefined}>
              <span
                aria-hidden="true"
                className={`block h-1 rounded-full ${state === "todo" ? "bg-stone-2" : "bg-accent"}`}
              />
              <span className={`mt-1.5 hidden text-xs sm:block ${state === "current" ? "text-ink" : "text-ink-3"}`}>
                {label}
              </span>
              <span className="sr-only sm:hidden">{label}</span>
              {state === "done" && <span className="sr-only"> (done)</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
