import type { Criterion, CriterionKind } from "./types";

// ClinicalTrials.gov eligibility text is loose markdown: "Inclusion Criteria:" / "1) Exclusion Criteria"
// headings, "*" or "1." bullets, indented sub-bullets under a lead-in line ending in ":",
// inline "(1) … (2) …" lists, and escaped characters such as "\<6 months".
// This turns it into one Criterion per rule.

const BULLET = /^(\s*)(?:[*\-•]|\(?\d+[.)]|[a-z][.)]|[ivx]+[.)])\s+(.+)$/i;
const LEADING_MARKER = /^\s*(?:[*\-•]|\(?\d+[.)]|[a-z][.)]|[ivx]+[.)])\s+/i;
const PLACEHOLDER = /^(none|n\/?a|not applicable|notes?)$/i;
// "Meets any of the following", "at least one of", "one or more of": children are alternatives.
const ANY_OF = /\b(any|either|at least one|one or more|one) of\b/i;

function headingKind(line: string): CriterionKind | null {
  const t = line.replace(LEADING_MARKER, "").trim().toLowerCase();
  if (t.length > 160) return null;
  const inc = t.includes("inclusion");
  const exc = t.includes("exclusion");
  if (inc === exc) return null;
  const looksLikeHeading =
    /criteri/.test(t) || /^(key |main |major |general )?(inclusion|exclusion)\s*:?$/.test(t);
  if (!looksLikeHeading) return null;
  return inc ? "inclusion" : "exclusion";
}

/** "Other protocol-defined inclusion/exclusion criteria apply", "N/A" and similar aren't rules. */
function isNoise(body: string): boolean {
  if (PLACEHOLDER.test(body.replace(/[:.]$/, ""))) return true;
  return body.length < 160 && /inclusion/i.test(body) && /exclusion/i.test(body);
}

/** "…defined as follows:" or "…if any of the following criteria apply" introduce nested rules. */
function isLeadIn(body: string): boolean {
  return body.endsWith(":") || (body.length < 200 && /\b(any|all|each) of the following\b/i.test(body));
}

function unescapeMarkdown(text: string): string {
  return text.replace(/\\([\\`*_{}[\]()#+\-.!<>=|~])/g, "$1");
}

function clean(text: string): string {
  return text.replace(/\s+/g, " ").replace(/[;:.]\s*$/, "").trim();
}

/** "(1) Women aged … (2) Patients newly diagnosed …" on one line becomes one line per item. */
function splitInlineList(line: string): string[] {
  const markers = line.match(/(?:^|\s)\(\d+\)\s/g);
  if (!markers || markers.length < 2) return [line];
  const indent = line.match(/^\s*/)?.[0] ?? "";
  return line
    .trim()
    .split(/\s(?=\(\d+\)\s)/)
    .map((part) => `${indent}${part.trim()}`);
}

export function splitCriteria(eligibilityText: string): Criterion[] {
  const criteria: Criterion[] = [];
  let kind: CriterionKind = "inclusion"; // text without headings is treated as inclusion rules
  let group: { text: string; kind: CriterionKind; children: string[]; anyOf: boolean } | null = null;
  let lastTopLevel: Criterion | null = null;

  const push = (text: string, ruleKind: CriterionKind, groupText: string | null) => {
    const c: Criterion = { id: criteria.length + 1, kind: ruleKind, text: clean(text), group: groupText };
    if (c.text) criteria.push(c);
    return c;
  };

  // "Any of" groups become a single rule listing the alternatives; other groups were pushed child by child.
  // A lead-in with nothing nested under it is a rule in its own right, unless it only introduces others.
  const closeGroup = () => {
    if (group?.anyOf && group.children.length) {
      push(`${clean(group.text)}: ${group.children.map(clean).join("; or ")}`, group.kind, null);
    } else if (group && group.children.length === 0 && !/\bfollowing\b/i.test(group.text)) {
      push(group.text, group.kind, null);
    }
    group = null;
  };

  const lines = unescapeMarkdown(eligibilityText).split(/\r?\n/).flatMap(splitInlineList);
  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;

    const heading = headingKind(rawLine);
    if (heading) {
      closeGroup();
      kind = heading;
      lastTopLevel = null;
      continue;
    }

    const bullet = rawLine.match(BULLET);
    const indent = bullet ? bullet[1].length : rawLine.length - rawLine.trimStart().length;
    const body = (bullet ? bullet[2] : rawLine).trim();
    if (isNoise(body)) continue;

    if (indent > 0 && (group || lastTopLevel)) {
      if (!bullet && criteria.length && !group?.anyOf) {
        // Wrapped continuation of the previous rule.
        const last = criteria[criteria.length - 1];
        last.text = clean(`${last.text} ${body}`);
        continue;
      }
      // A short label such as "Age" or "Part A" with rules nested under it is a heading, not a rule.
      if (!group && lastTopLevel && lastTopLevel.text.length < 25 && criteria.at(-1) === lastTopLevel) {
        criteria.pop();
        group = { text: lastTopLevel.text, kind: lastTopLevel.kind, children: [], anyOf: false };
        lastTopLevel = null;
      }
      if (group) {
        group.children.push(body);
        if (!group.anyOf) push(body, group.kind, clean(group.text));
      } else if (lastTopLevel) {
        push(body, lastTopLevel.kind, lastTopLevel.text);
      }
      continue;
    }

    closeGroup();
    if (isLeadIn(body)) {
      group = { text: body, kind, children: [], anyOf: ANY_OF.test(body) };
      lastTopLevel = null;
    } else if (!bullet && criteria.length && /^[a-z(]/.test(body) && !/^\(\d+\)/.test(body)) {
      const last = criteria[criteria.length - 1];
      last.text = clean(`${last.text} ${body}`);
    } else {
      lastTopLevel = push(body.replace(/^\(\d+\)\s*/, ""), kind, null);
    }
  }
  closeGroup();
  return criteria;
}
