"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "@/lib/client/theme";

type Theme = "light" | "dark" | "system";
const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const listeners = new Set<() => void>();
/** Used when storage is blocked (private mode, strict settings): the choice still holds for this visit. */
let inMemory: Theme = "system";

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return inMemory;
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

function chooseTheme(theme: Theme) {
  inMemory = theme;
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable: keep the in-memory choice.
  }
  // Cross-fade the whole page between themes where the browser can; otherwise switch at once.
  const swap = () => applyTheme(theme);
  if (typeof document.startViewTransition === "function") document.startViewTransition(swap);
  else swap();
  listeners.forEach((l) => l());
}

/** Light / Dark / System, as three labelled radio buttons (arrow keys move between them). */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);
  return (
    <fieldset className="flex shrink-0 items-center">
      <legend className="sr-only">Colour theme</legend>
      <div className="flex rounded-md border border-line bg-stone p-0.5">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className="relative flex min-h-9 cursor-pointer items-center rounded-[5px] px-2.5 text-xs font-semibold text-ink-3 transition-colors duration-150 hover:text-ink has-[:checked]:bg-surface has-[:checked]:text-ink has-[:checked]:shadow-[0_1px_2px_rgb(0_0_0/0.12)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-accent sm:px-3"
          >
            <input
              type="radio"
              name="theme"
              value={o.value}
              checked={theme === o.value}
              onChange={() => chooseTheme(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
