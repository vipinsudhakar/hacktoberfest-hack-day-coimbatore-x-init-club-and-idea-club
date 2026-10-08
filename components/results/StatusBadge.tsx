import type { MatchStatus, Verdict } from "@/lib/types";
import { CheckCircle, HelpCircle, XCircle } from "../Icons";

export const STATUS_META: Record<
  MatchStatus,
  { label: string; Icon: typeof CheckCircle; badge: string; icon: string }
> = {
  likely: { label: "Likely match", Icon: CheckCircle, badge: "bg-pass-soft text-pass", icon: "text-pass" },
  possible: { label: "Possible match", Icon: HelpCircle, badge: "bg-ask-soft text-ask", icon: "text-ask" },
  not_eligible: { label: "Not eligible", Icon: XCircle, badge: "bg-stone text-ink-2", icon: "text-ink-3" },
};

/** One rule's verdict in plain words, with its icon: never colour alone. */
export const VERDICT_META: Record<Verdict, { label: string; Icon: typeof CheckCircle; color: string }> = {
  pass: { label: "Fine for you", Icon: CheckCircle, color: "text-pass" },
  fail: { label: "Rules you out", Icon: XCircle, color: "text-fail" },
  unknown: { label: "Needs checking", Icon: HelpCircle, color: "text-ask" },
};

export function StatusBadge({ status, draw = false }: { status: MatchStatus; draw?: boolean }) {
  const { label, Icon, badge } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-sm font-semibold ${badge}`}>
      {/* pathLength 1 lets the tick "draw itself" with a one-unit dash, whatever its real length. */}
      <Icon size={16} className={draw ? "draw-tick" : undefined} />
      {label}
    </span>
  );
}
