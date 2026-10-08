import type { MatchStatus } from "@/lib/types";
import { CheckCircle, HelpCircle, XCircle } from "../Icons";

export const STATUS_META: Record<
  MatchStatus,
  { label: string; Icon: typeof CheckCircle; badge: string; icon: string }
> = {
  likely: {
    label: "Likely match",
    Icon: CheckCircle,
    badge: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    icon: "text-emerald-700",
  },
  possible: {
    label: "Possible match",
    Icon: HelpCircle,
    badge: "bg-amber-50 text-amber-950 ring-amber-200",
    icon: "text-amber-700",
  },
  not_eligible: {
    label: "Not eligible",
    Icon: XCircle,
    badge: "bg-slate-100 text-slate-800 ring-slate-300",
    icon: "text-rose-700",
  },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const { label, Icon, badge, icon } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${badge}`}>
      <Icon size={16} className={icon} />
      {label}
    </span>
  );
}
