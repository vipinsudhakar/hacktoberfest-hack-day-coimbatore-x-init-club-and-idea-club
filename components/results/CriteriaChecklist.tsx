import type { CriterionResult } from "@/lib/types";
import { Building, CheckCircle, ChevronDown, HelpCircle, XCircle } from "../Icons";

const VERDICT = {
  pass: { Icon: CheckCircle, color: "text-emerald-700", label: "Fine for you" },
  fail: { Icon: XCircle, color: "text-rose-700", label: "Rules you out" },
  unknown: { Icon: HelpCircle, color: "text-amber-700", label: "Need to check" },
} as const;

function groupRules(rules: CriterionResult[]) {
  const groups: { group: string | null; rules: CriterionResult[] }[] = [];
  for (const rule of rules) {
    const last = groups[groups.length - 1];
    if (last && last.group === rule.group) last.rules.push(rule);
    else groups.push({ group: rule.group, rules: [rule] });
  }
  return groups;
}

function Rule({ rule }: { rule: CriterionResult }) {
  const meta = rule.siteCheck
    ? { Icon: Building, color: "text-slate-500", label: "Confirmed by the trial team" }
    : VERDICT[rule.verdict];
  return (
    <li className={`flex gap-3 py-2.5 ${rule.siteCheck ? "text-ink-subtle" : ""}`}>
      <meta.Icon size={20} className={`mt-0.5 shrink-0 ${meta.color}`} />
      <div className="min-w-0">
        <p className="text-[0.95rem]">
          <span className="sr-only">{meta.label}: </span>
          {rule.text}
        </p>
        {rule.siteCheck ? (
          <p className="mt-0.5 text-sm">Confirmed by the trial team</p>
        ) : (
          rule.reason && <p className="mt-0.5 text-sm text-ink-muted">{rule.reason}</p>
        )}
        {rule.evidence && !rule.siteCheck && (
          <p className="mt-1 text-sm italic text-ink-subtle">From the reports: &ldquo;{rule.evidence}&rdquo;</p>
        )}
      </div>
    </li>
  );
}

function RuleSection({ title, note, rules }: { title: string; note: string; rules: CriterionResult[] }) {
  if (rules.length === 0) return null;
  return (
    <section className="mt-4">
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-ink-subtle">{note}</p>
      {groupRules(rules).map((g, i) =>
        g.group ? (
          <div key={i} className="mt-2 rounded-lg border border-line px-3">
            <p className="pt-2.5 text-sm font-semibold text-ink-muted">{g.group}</p>
            <ul className="divide-y divide-line">{g.rules.map((r) => <Rule key={r.id} rule={r} />)}</ul>
          </div>
        ) : (
          <ul key={i} className="divide-y divide-line">{g.rules.map((r) => <Rule key={r.id} rule={r} />)}</ul>
        ),
      )}
    </section>
  );
}

export function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted" aria-label="What the symbols mean">
      <li className="flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-700" /> fine for you</li>
      <li className="flex items-center gap-1.5"><XCircle size={16} className="text-rose-700" /> rules you out</li>
      <li className="flex items-center gap-1.5"><HelpCircle size={16} className="text-amber-700" /> need to check</li>
      <li className="flex items-center gap-1.5"><Building size={16} className="text-slate-500" /> confirmed by the trial team</li>
    </ul>
  );
}

export function CriteriaChecklist({ results }: { results: CriterionResult[] }) {
  if (results.length === 0) return null;
  const counted = results.filter((r) => !r.siteCheck);
  const count = (v: CriterionResult["verdict"]) => counted.filter((r) => r.verdict === v).length;
  return (
    <details className="mt-4 rounded-xl border border-line">
      <summary className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-2 hover:bg-brand-50">
        <span className="flex-1">
          <span className="font-semibold text-brand-700">See all {results.length} rules checked</span>
          <span className="block text-sm text-ink-subtle">
            {count("pass")} fine · {count("fail")} rule you out · {count("unknown")} need checking
          </span>
        </span>
        <ChevronDown className="chevron shrink-0 text-ink-subtle transition-transform" />
      </summary>
      <div className="border-t border-line px-4 pb-4 pt-3">
        <Legend />
        <RuleSection
          title="Who can join"
          note="Inclusion rules: the patient needs to meet these."
          rules={results.filter((r) => r.kind === "inclusion")}
        />
        <RuleSection
          title="Who can't join"
          note="Exclusion rules: a tick means the rule doesn't apply to the patient."
          rules={results.filter((r) => r.kind === "exclusion")}
        />
      </div>
    </details>
  );
}
