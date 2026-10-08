"use client";

import { createContext, useContext } from "react";

/** Looks up the translation of a patient-facing explanation; English (the original) when there is none. */
export const TranslateContext = createContext<(text: string) => string>((text) => text);

export function useT(): (text: string) => string {
  return useContext(TranslateContext);
}
