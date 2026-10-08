"use client";

import { useMemo, useState } from "react";
import { buildTrialMessage } from "@/lib/client/message";
import type { PatientProfile, Trial, TrialMatch } from "@/lib/types";
import { Mail } from "../Icons";
import { buttonSecondary, fieldHint } from "../ui";

/** A ready-to-send, de-identified note to the trial team, for trials worth asking about. */
export function ContactMessage({ trial, match, profile }: { trial: Trial; match: TrialMatch; profile: PatientProfile }) {
  const text = useMemo(() => buildTrialMessage(trial, match, profile), [trial, match, profile]);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const email = trial.contacts.find((c) => c.email)?.email ?? "";
  const subject = `Screening enquiry: ${trial.nctId}`;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(text);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
    setTimeout(() => setCopy("idle"), 2500);
  }

  return (
    <details className="group mt-6 border-t border-line pt-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-accent">
        <Mail size={18} /> Message the trial team
        <span className="font-normal text-ink-3 group-open:hidden">· a ready-to-send note, no name included</span>
      </summary>
      <p className={`${fieldHint} mt-2`}>
        Check it with the patient&apos;s oncologist first. It only includes medical facts from the reports, never the patient&apos;s
        name or ID numbers.
      </p>
      <textarea
        readOnly
        value={text}
        aria-label={`Message to the ${trial.nctId} trial team`}
        rows={Math.min(16, text.split("\n").length + 1)}
        className="mt-3 w-full resize-y rounded-md border border-line bg-paper p-3 font-mono text-[0.8125rem] leading-relaxed text-ink"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copyMessage} className={buttonSecondary}>
          {copy === "copied" ? "Copied" : copy === "failed" ? "Couldn't copy" : "Copy message"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonSecondary}
        >
          Share on WhatsApp
        </a>
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`}
          className={buttonSecondary}
        >
          {email ? "Email the trial contact" : "Open in email"}
        </a>
      </div>
      <p role="status" className="sr-only">
        {copy === "copied" ? "Message copied" : copy === "failed" ? "Couldn't copy the message" : ""}
      </p>
    </details>
  );
}
