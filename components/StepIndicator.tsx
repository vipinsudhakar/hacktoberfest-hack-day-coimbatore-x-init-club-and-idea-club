const STEPS = ["Add reports", "Check details", "See trials"] as const;

/** "Step 2 of 3" with a thin three-part bar: tells a worried reader exactly where they are. */
export function StepIndicator({ current }: { current: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Progress" className="print:hidden">
      <p className="text-sm text-ink-3">
        <span className="tabular-nums">Step {current + 1} of 3</span>
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
              {/* Each segment fills from the left as the reader reaches it, and empties back on the way back. */}
              <span aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-stone-2">
                <span
                  className={`block h-full origin-left rounded-full bg-accent transition-transform duration-500 ease-[var(--ease-out-expo)] ${
                    state === "todo" ? "scale-x-0" : "scale-x-100"
                  }`}
                />
              </span>
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
