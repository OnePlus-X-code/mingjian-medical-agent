import { AlertCircle, CheckCircle2, ClipboardList, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsRowProps {
  pending: number;
  green: number;
  yellow: number;
  red: number;
}

interface CardSpec {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconFg: string;
  accent: string;
}

export function StatsRow({ pending, green, yellow, red }: StatsRowProps) {
  const cards: CardSpec[] = [
    {
      label: "待处理总数",
      value: pending,
      hint: "Agent 已复核，待审核员处置",
      icon: ClipboardList,
      iconBg: "bg-sky-50",
      iconFg: "text-sky-600",
      accent: "from-sky-500/10",
    },
    {
      label: "建议放行",
      value: green,
      hint: "🟢 与历史成功申诉相似",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconFg: "text-emerald-600",
      accent: "from-emerald-500/10",
    },
    {
      label: "建议人工审核",
      value: yellow,
      hint: "🟡 证据不足 / 结论分化",
      icon: HelpCircle,
      iconBg: "bg-amber-50",
      iconFg: "text-amber-600",
      accent: "from-amber-500/10",
    },
    {
      label: "建议打回",
      value: red,
      hint: "🔴 与历史打回案例相似 / 高风险",
      icon: AlertCircle,
      iconBg: "bg-rose-50",
      iconFg: "text-rose-600",
      accent: "from-rose-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 -top-12 h-24 bg-gradient-to-b to-transparent",
              c.accent
            )}
          />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-500">{c.label}</div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight text-slate-900">
                  {c.value}
                </span>
                <span className="text-sm text-slate-400">条</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{c.hint}</div>
            </div>
            <div
              className={cn(
                "grid size-10 place-items-center rounded-lg",
                c.iconBg
              )}
            >
              <c.icon className={cn("size-5", c.iconFg)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
