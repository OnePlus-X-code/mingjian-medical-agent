import { ShieldCheck } from "lucide-react";

export function DashboardHeader({ operator }: { operator: string }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-sky-600 text-white shadow-sm">
            <ShieldCheck className="size-5" />
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-tight text-slate-900">
              明鉴 · 医保监管智能体
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
          <div className="grid size-9 place-items-center rounded-full bg-slate-100 text-sm font-medium text-slate-700">
            {operator.slice(-2)}
          </div>
        </div>
      </div>
    </header>
  );
}
