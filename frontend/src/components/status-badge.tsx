import { cn } from "@/lib/utils";
import type { CurrentStatus } from "@/types/review";

const STYLES: Record<CurrentStatus, { pill: string; label: string }> = {
  pending: {
    pill: "bg-slate-100 text-slate-700 ring-slate-200",
    label: "待处理",
  },
  approved: {
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "已放行",
  },
  rejected: {
    pill: "bg-rose-50 text-rose-700 ring-rose-200",
    label: "已打回",
  },
  manual_review: {
    pill: "bg-sky-50 text-sky-700 ring-sky-200",
    label: "人工复核中",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: CurrentStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        s.pill,
        className
      )}
    >
      {s.label}
    </span>
  );
}
