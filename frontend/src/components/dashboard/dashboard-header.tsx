import { ShieldCheck, Sparkles } from "lucide-react";

export function DashboardHeader({ operator }: { operator: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur supports-backdrop-filter:bg-white/65">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-[0_4px_12px_-2px_rgba(2,132,199,0.5)]">
            <ShieldCheck className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-slate-900">
                明鉴 · 医保监管智能体
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                <Sparkles className="size-3" />
                Demo · 模拟脱敏数据
              </span>
            </div>
            <div className="text-xs text-slate-500">
              DRG 智能复核控制台 · 接在审核系统之后的精准治理辅助层
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-xs text-slate-400">当前审核员</div>
            <div className="font-medium text-slate-800">{operator}</div>
          </div>
          <div className="grid size-9 place-items-center rounded-full bg-sky-50 text-sm font-medium text-sky-700 ring-1 ring-inset ring-sky-100">
            {operator.slice(-2)}
          </div>
        </div>
      </div>
    </header>
  );
}
