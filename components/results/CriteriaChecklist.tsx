import type { CriterionResult } from "@/lib/types";
import { Building, ChevronDown } from "../Icons";
import { VERDICT_META } from "./StatusBadge";

const SITE_META = { label: "Confirmed by the trial team", Icon: Building, color: "text-ink-3" };

function groupRules(rules: CriterionResult[]) {
  const groups: { group: string | null; rules: CriterionResult[] }[] = [];
  for (const rule of rules) {
    const last = groups[groups.length - 1];
    if (last && last.group === rule.group) last.rules.push(rule);
    else groups.push({ group: rule.group, rules: [rule] });
  }
  return groups;
}

export function MedicineTag({ medicine }: { medicine: string }) {
  return (
    <span className="ml-1.5 inline-block rounded-sm bg-accent-soft px-1.5 text-xs font-semibold text-accent">
      About: {medicine}
    </span>
  );
}

function Rule({ rule }: { rule: CriterionResult }) {
  const meta = rule.siteCheck ? SITE_META : VERDICT_META[rule.verdict];
  return (
    <li className="flex gap-3 py-3">
      <meta.Icon size={20} className={`mt-0.5 shrink-0 ${meta.color}`} />
      <div className="min-w-0">
        <p className={rule.siteCheck ? "text-ink-3" : "text-ink"}>
          <span className="sr-only">{meta.label}: </span>
          {rule.text}
          {rule.medicine && <MedicineTag medicine={rule.medicine} />}
        </p>
        {rule.siteCheck ? (
          <p className="mt-0.5 text-sm text-ink-3">The trial team confirms this with you.</p>
        ) : (
          rule.reason && <p className="mt-0.5 text-sm text-ink-2">{rule.reason}</p>
        )}
        {rule.evidence && !rule.siteCheck && (
          <p className="mt-1 font-serif text-[0.9375rem] italic text-ink-3">From the reports: &ldquo;{rule.evidence}&rdquo;</p>
        )}
      </div>
    </li>
  );
}

function RuleSection({ title, note, rules }: { title: string; note: string; rules: CriterionResult[] }) {
  if (rules.length === 0) return null;
  return (
    <section className="mt-6">
      <h4 className="font-semibold text-ink">{title}</h4>
      <p className="text-sm text-ink-3">{note}</p>
      <div className="mt-1">
        {groupRules(rules).map((g, i) =>
          g.group ? (
            <div key={i} className="mt-2">
              <p className="pt-2 text-sm font-semibold text-ink-2">{g.group}</p>
              <ul className="ml-2 divide-y divide-line border-l border-line pl-4">
                {g.rules.map((r) => (
                  <Rule key={r.id} rule={r} />
                ))}
              </ul>
            </div>
          ) : (
            <ul key={i} className="divide-y divide-line">
              {g.rules.map((r) => (
                <Rule key={r.id} rule={r} />
              ))}
            </ul>
          ),
        )}
      </div>
    </section>
  );
}

function Legend() {
  const items = [VERDICT_META.pass, VERDICT_META.fail, VERDICT_META.unknown, SITE_META];
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-2" aria-label="What the symbols mean">
      {items.map(({ label, Icon, color }) => (
        <li key={label} className="flex items-center gap-1.5">
          <Icon size={17} className={color} /> {label.charAt(0).toUpperCase() + label.slice(1)}
        </li>
      ))}
    </ul>
  );
}

export function CriteriaChecklist({ results }: { results: CriterionResult[] }) {
  if (results.length === 0) return null;
  const counted = results.filter((r) => !r.siteCheck);
  const count = (v: CriterionResult["verdict"]) => counted.filter((r) => r.verdict === v).length;
  const site = results.length - counted.length;
  return (
    <details className="mt-6 border-t border-line">
      <summary className="-mx-2 mt-1 flex min-h-12 items-center gap-3 rounded-md px-2 py-2 hover:bg-stone">
        <span className="min-w-0 flex-1">
          <span className="font-semibold text-accent">See all {results.length} rules checked</span>
          <span className="block text-sm text-ink-3">
            {count("pass")} fine · {count("fail")} {count("fail") === 1 ? "rules" : "rule"} you out · {count("unknown")}{" "}
            {count("unknown") === 1 ? "needs" : "need"} checking{site > 0 ? ` · ${site} for the trial team` : ""}
          </span>
        </span>
        <ChevronDown className="chevron shrink-0 text-ink-3 transition-transform duration-200" />
      </summary>
      <div className="pb-1 pt-3">
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
