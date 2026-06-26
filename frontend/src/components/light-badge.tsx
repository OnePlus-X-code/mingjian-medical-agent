import { cn } from "@/lib/utils";
import type { LightStatus } from "@/types/review";

const STYLES: Record<
  LightStatus,
  { dot: string; pill: string; label: string }
> = {
  green: {
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    label: "建议放行",
  },
  yellow: {
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 ring-amber-200",
    label: "建议人工",
  },
  red: {
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-700 ring-rose-200",
    label: "建议打回",
  },
};

export function LightDot({
  status,
  className,
}: {
  status: LightStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-block size-2.5 rounded-full shadow-[0_0_0_3px_rgba(0,0,0,0.04)]",
        s.dot,
        className
      )}
    />
  );
}

export function LightBadge({
  status,
  className,
}: {
  status: LightStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        s.pill,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}
