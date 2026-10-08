import { useId } from "react";
import { formatPhase, sameCity, type Evaluation } from "@/lib/client/results";
import type { Trial, TrialContact, TrialSite } from "@/lib/types";
import { ExternalLink, HelpCircle, Mail, MapPin, Phone, Refresh, Spinner, XCircle } from "../Icons";
import { buttonSecondary, card } from "../ui";
import { CriteriaChecklist } from "./CriteriaChecklist";
import { StatusBadge } from "./StatusBadge";

const VISIBLE_SITES = 3;

function SiteItem({ site, near }: { site: TrialSite; near: boolean }) {
  return (
    <li className="flex gap-2">
      <MapPin size={18} className="mt-0.5 shrink-0 text-ink-subtle" />
      <span>
        {site.facility} <span className="text-ink-subtle">— {[site.city, site.state].filter(Boolean).join(", ")}</span>
        {near && (
          <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
            In your city
          </span>
        )}
      </span>
    </li>
  );
}

function Sites({ sites, city }: { sites: TrialSite[]; city: string | null }) {
  if (sites.length === 0) return null;
  const sorted = [...sites].sort((a, b) => Number(sameCity(b.city, city)) - Number(sameCity(a.city, city)));
  const shown = sorted.slice(0, VISIBLE_SITES);
  const rest = sorted.slice(VISIBLE_SITES);
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
        Hospitals in India ({sites.length})
      </h4>
      <ul className="mt-2 space-y-1.5">
        {shown.map((s, i) => <SiteItem key={i} site={s} near={sameCity(s.city, city)} />)}
      </ul>
      {rest.length > 0 && (
        <details className="mt-1.5">
          <summary className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline underline-offset-4">
            Show {rest.length} more {rest.length === 1 ? "hospital" : "hospitals"}
          </summary>
          <ul className="mt-1 space-y-1.5">
            {rest.map((s, i) => <SiteItem key={i} site={s} near={sameCity(s.city, city)} />)}
          </ul>
        </details>
      )}
    </div>
  );
}

function Contacts({ contacts }: { contacts: TrialContact[] }) {
  const useful = contacts.filter((c) => c.phone || c.email);
  if (useful.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">Trial contacts</h4>
      <ul className="mt-2 space-y-2">
        {useful.map((c, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {c.name && <span className="font-semibold">{c.name}</span>}
            {c.phone && (
              <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-11 items-center gap-1.5 text-brand-700 underline underline-offset-4">
                <Phone size={16} /> {c.phone}
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className="inline-flex min-h-11 items-center gap-1.5 break-all text-brand-700 underline underline-offset-4">
                <Mail size={16} /> {c.email}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrialCard({
  trial,
  evaluation,
  patientCity,
  onRetry,
}: {
  trial: Trial;
  evaluation: Evaluation;
  patientCity: string | null;
  onRetry: () => void;
}) {
  const titleId = useId();
  const match = evaluation.state === "done" ? evaluation.match : null;
  const phases = trial.phases.map(formatPhase).filter((p): p is string => Boolean(p));

  return (
    <article aria-labelledby={titleId} className={`${card} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center gap-2">
        {match && <StatusBadge status={match.status} />}
        {evaluation.state === "error" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-950 ring-1 ring-amber-300">
            <HelpCircle size={16} className="text-amber-700" /> Couldn&apos;t check
          </span>
        )}
        {phases.map((p) => (
          <span key={p} className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
            {p}
          </span>
        ))}
      </div>

      <h3 id={titleId} className="mt-3 font-serif text-lg font-semibold leading-snug sm:text-xl">
        {trial.title}
      </h3>
      <a href={trial.url} target="_blank" rel="noopener noreferrer"
        className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-mono text-sm text-brand-700 underline underline-offset-4">
        {trial.nctId} on ClinicalTrials.gov <ExternalLink size={14} />
        <span className="sr-only">(opens in a new tab)</span>
      </a>

      {match?.status === "likely" && (
        <p className="mt-2 font-semibold text-emerald-900">May qualify. Confirm with your oncologist.</p>
      )}
      {match?.status === "possible" && (
        <p className="mt-2 font-semibold text-amber-950">
          May qualify if the open questions check out. Confirm with your oncologist.
        </p>
      )}

      <p className="mt-2 text-ink-muted">{match?.plainSummary || trial.summary}</p>
      {trial.interventions.length > 0 && (
        <p className="mt-2 text-[0.95rem]">
          <span className="font-semibold">Treatment tested:</span> {trial.interventions.join(", ")}
        </p>
      )}

      {match?.status === "not_eligible" && match.blockers.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
          <h4 className="font-semibold text-rose-950">Why it likely doesn&apos;t fit</h4>
          <ul className="mt-2 space-y-2">
            {match.blockers.map((b) => (
              <li key={b.id} className="flex gap-2">
                <XCircle size={18} className="mt-0.5 shrink-0 text-rose-700" />
                <span>
                  {b.text}
                  {b.reason && <span className="block text-sm text-ink-muted">{b.reason}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {match?.status === "possible" && match.questions.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <h4 className="font-semibold text-amber-950">Questions to ask your doctor</h4>
          <ul className="mt-2 space-y-2">
            {match.questions.map((q, i) => (
              <li key={i} className="flex gap-2">
                <HelpCircle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.state === "error" && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-amber-950">
            We couldn&apos;t check this trial&apos;s rules. <span className="text-sm">{evaluation.message}</span>
          </p>
          <button type="button" onClick={onRetry} className={`${buttonSecondary} shrink-0`}>
            <Refresh size={18} /> Retry
          </button>
        </div>
      )}
      {evaluation.state === "checking" && (
        <p className="mt-4 flex items-center gap-2 text-ink-subtle">
          <Spinner size={18} className="text-brand-600" /> Checking every rule…
        </p>
      )}

      <div className="mt-5 grid gap-5 border-t border-line pt-4 md:grid-cols-2">
        <Sites sites={trial.indiaSites} city={patientCity} />
        <Contacts contacts={trial.contacts} />
      </div>

      {match && <CriteriaChecklist results={match.results} />}
    </article>
  );
}
