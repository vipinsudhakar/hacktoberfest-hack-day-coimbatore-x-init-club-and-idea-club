import { useId } from "react";
import { formatPhase, sameCity, type Evaluation } from "@/lib/client/results";
import type { Trial, TrialContact, TrialSite } from "@/lib/types";
import { AlertTriangle, ExternalLink, HelpCircle, Mail, Phone, Refresh, XCircle } from "../Icons";
import { buttonSecondary, panel } from "../ui";
import { CriteriaChecklist, MedicineTag } from "./CriteriaChecklist";
import { StatusBadge } from "./StatusBadge";

const VISIBLE_SITES = 3;
const tag = "inline-block rounded-sm px-1.5 py-px text-xs font-semibold align-[0.1em]";
const subhead = "text-sm font-semibold text-ink";

function SiteItem({ site, near }: { site: TrialSite; near: boolean }) {
  return (
    <li>
      <span className="text-ink">{site.facility}</span>
      <span className="block text-sm text-ink-3">
        {[site.city, site.state].filter(Boolean).join(", ")}
        {near && <span className={`${tag} ml-2 bg-accent-soft text-accent`}>In your city</span>}
        {site.openingSoon && <span className={`${tag} ml-2 bg-ask-soft text-ask`}>Opening soon</span>}
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
      <h4 className={subhead}>
        Hospitals in India <span className="font-mono font-normal tabular-nums text-ink-3">{sites.length}</span>
      </h4>
      <ul className="mt-2 space-y-2.5">
        {shown.map((s, i) => (
          <SiteItem key={i} site={s} near={sameCity(s.city, city)} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="mt-1">
          <summary className="inline-flex min-h-11 items-center text-sm font-semibold text-accent underline decoration-accent-line underline-offset-4 hover:decoration-accent">
            Show {rest.length} more {rest.length === 1 ? "hospital" : "hospitals"}
          </summary>
          <ul className="mt-1 space-y-2.5">
            {rest.map((s, i) => (
              <SiteItem key={i} site={s} near={sameCity(s.city, city)} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Contacts({ contacts }: { contacts: TrialContact[] }) {
  const useful = contacts.filter((c) => c.phone || c.email);
  if (useful.length === 0) return null;
  const link =
    "inline-flex min-h-11 items-center gap-2 break-all text-accent underline decoration-accent-line underline-offset-4 hover:decoration-accent";
  return (
    <div>
      <h4 className={subhead}>Trial contacts</h4>
      <ul className="mt-2 space-y-2">
        {useful.map((c, i) => (
          <li key={i}>
            {c.name && <span className="block text-ink">{c.name}</span>}
            <span className="flex flex-wrap gap-x-5">
              {c.phone && (
                <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className={link}>
                  <Phone size={16} className="shrink-0" /> {c.phone}
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} className={link}>
                  <Mail size={16} className="shrink-0" /> {c.email}
                </a>
              )}
            </span>
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
  const hasPeople = trial.indiaSites.length > 0 || trial.contacts.some((c) => c.phone || c.email);

  return (
    <article aria-labelledby={titleId} className={`${panel} px-5 py-6 sm:px-7`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        {match && <StatusBadge status={match.status} />}
        {evaluation.state === "error" && (
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-ask-soft px-2 py-0.5 font-semibold text-ask">
            <AlertTriangle size={16} /> Couldn&apos;t check
          </span>
        )}
        {phases.length > 0 && <span className="text-ink-3">{phases.join(" · ")}</span>}
        <a
          href={trial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex min-h-8 items-center gap-1.5 font-mono text-ink-2 underline decoration-line-2 underline-offset-4 hover:text-accent hover:decoration-accent"
        >
          {trial.nctId}
          <ExternalLink size={14} />
          <span className="sr-only">on ClinicalTrials.gov (opens in a new tab)</span>
        </a>
      </div>

      <h3
        id={titleId}
        className="mt-3 font-serif text-[1.3125rem] font-medium leading-snug tracking-[-0.01em] text-ink"
      >
        {trial.title}
      </h3>

      {match && match.status !== "not_eligible" && (
        <p className="mt-2 font-semibold text-ink">
          {match.status === "likely"
            ? "May qualify. Confirm with your oncologist."
            : "May qualify if the open questions check out. Confirm with your oncologist."}
        </p>
      )}

      <p className={`mt-3 max-w-[42rem] text-ink-2 ${match?.plainSummary ? "" : "line-clamp-4"}`}>
        {match?.plainSummary || trial.summary}
      </p>
      {trial.interventions.length > 0 && (
        <p className="mt-3 max-w-[42rem] text-sm">
          <span className="font-semibold text-ink">Treatment tested: </span>
          <span className="text-ink-2">{trial.interventions.join(", ")}</span>
        </p>
      )}

      {match?.status === "not_eligible" && match.blockers.length > 0 && (
        <div className="mt-6">
          <h4 className={subhead}>Why it likely doesn&apos;t fit</h4>
          <ul className="mt-2 space-y-3">
            {match.blockers.map((b) => (
              <li key={b.id} className="flex gap-3">
                <XCircle size={20} className="mt-0.5 shrink-0 text-fail" />
                <span className="min-w-0">
                  <span className="text-ink">
                    {b.text}
                    {b.medicine && <MedicineTag medicine={b.medicine} />}
                  </span>
                  {b.reason && <span className="block text-sm text-ink-2">{b.reason}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {match && match.status !== "not_eligible" && match.questions.length > 0 && (
        <div className="mt-6">
          <h4 className={subhead}>Questions to ask your doctor</h4>
          <ul className="mt-2 space-y-3">
            {match.questions.map((q, i) => (
              <li key={i} className="flex gap-3">
                <HelpCircle size={20} className="mt-0.5 shrink-0 text-ask" />
                <span className="text-ink">{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.state === "error" && (
        <div className="mt-6 flex flex-col gap-3 rounded-md bg-ask-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink">
            We couldn&apos;t check this trial&apos;s rules.{" "}
            <span className="text-ink-2">
              {evaluation.rateLimited
                ? "Gemma's free tier is still busy after three tries. Wait a minute, then retry."
                : evaluation.message}
            </span>
          </p>
          <button type="button" onClick={onRetry} className={`${buttonSecondary} shrink-0`}>
            <Refresh size={18} /> Retry
          </button>
        </div>
      )}

      {hasPeople && (
        <div className="mt-6 grid gap-6 border-t border-line pt-5 sm:grid-cols-2">
          <Sites sites={trial.indiaSites} city={patientCity} />
          <Contacts contacts={trial.contacts} />
        </div>
      )}

      {match && <CriteriaChecklist results={match.results} />}
    </article>
  );
}
