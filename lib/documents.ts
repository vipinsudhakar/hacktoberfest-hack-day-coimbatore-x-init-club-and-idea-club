import type { DocumentCheck } from "./api";

/** Gemma's description of a photo, ready to follow "looks like": "A recipe…" becomes "a recipe…". */
export function describePhoto(note: string): string {
  const n = note.trim();
  return n ? n[0].toLowerCase() + n.slice(1) : "something other than a medical document";
}

export type DocumentVerdict = { ok: true; skipped: DocumentCheck[] } | { ok: false; message: string };

/**
 * Decides whether the uploaded photos can be used. At least one medical document is enough;
 * the rest are reported as skipped. A missing or incomplete classification never blocks.
 */
export function checkDocuments(documents: DocumentCheck[], pageCount: number): DocumentVerdict {
  const classified = documents.filter((d) => d.page >= 1 && d.page <= pageCount);
  const skipped = classified.filter((d) => !d.isMedical);
  const allPagesClassified = new Set(classified.map((d) => d.page)).size === pageCount;
  if (!allPagesClassified || skipped.length < pageCount) return { ok: true, skipped };

  const described = skipped
    .sort((a, b) => a.page - b.page)
    .map((d) => `Photo ${d.page} looks like ${describePhoto(d.note)}, not a medical report.`)
    .join(" ");
  return {
    ok: false,
    message: `${pageCount === 1 ? "This photo doesn't look like a medical document." : "These photos don't look like medical documents."} ${described} Add photos of the patient's reports or prescriptions.`,
  };
}
