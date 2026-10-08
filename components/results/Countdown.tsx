"use client";

import { useEffect, useState } from "react";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Seconds left until `retryAt`. Give it `key={retryAt}` so a new wait starts from the top. */
export function Countdown({ retryAt, seconds }: { retryAt: number; seconds: number }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))), 500);
    return () => clearInterval(timer);
  }, [retryAt]);
  return <span className="font-mono tabular-nums">{clock(left)}</span>;
}
