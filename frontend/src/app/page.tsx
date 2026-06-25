import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Database,
  FileSearch,
  FileText,
  LineChart,
  Library,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
        <Hero />
        <BelowFold />
      </main>
      <SiteFooter />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 via-blue-50/60 to-white" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-50 [background-image:radial-gradient(circle_at_1px_1px,rgba(2,132,199,0.08)_1px,transparent_0)] [background-size:24px_24px]"
      />

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-6 px-6 py-8 lg:grid-cols-[1.05fr_1fr] lg:py-10">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200 shadow-sm">
            <Sparkles className="size-3.5" />
            接在现有 DRG 审核系统之后的高精度 Agent 工作台
          </span>

          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              明鉴 · 医保监管智能体
            </h1>
            <h2 className="text-xl font-semibold leading-tight text-sky-700 sm:text-2xl">
              智能复核与决策辅助平台
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-relaxed text-slate-600">
            基于 AI
            大模型读取现有审核系统输出的疑似清单，匹配历史申诉案例，生成红黄绿分级建议与可解释证据链。帮助医保审核员
            <span className="font-medium text-slate-800">减少误伤</span>、
            <span className="font-medium text-slate-800">聚焦风险</span>、
            <span className="font-medium text-slate-800">沉淀经验</span>。
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/console"
              className="inline-flex h-14 items-center gap-2.5 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 px-7 text-base font-semibold text-white shadow-[0_12px_32px_-10px_rgba(2,132,199,0.65)] transition hover:from-sky-600 hover:to-sky-800 hover:shadow-[0_16px_36px_-10px_rgba(2,132,199,0.75)]"
            >
              <Bot className="size-5" />
              进入智能复核控制台
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#features"
              className="inline-flex h-14 items-center gap-2 rounded-2xl border border-slate-300 bg-white/80 px-6 text-base font-medium text-slate-700 backdrop-blur transition hover:border-slate-400 hover:bg-white"
            >
              产品介绍
            </Link>
          </div>

          <div className="flex flex-wrap gap-6 pt-1 text-xs text-slate-500">
            <Stat label="脱敏样例案例" value="10+" />
            <Stat label="向量库历史案例" value="30+" />
            <Stat label="证据链推理步骤" value="5 步" />
          </div>
        </div>

        <HeroIllustration />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[320px]">
      <div className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.55),rgba(186,230,253,0.25)_55%,transparent_75%)] blur-2xl" />
      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-sky-100 to-blue-200/60 ring-1 ring-inset ring-white/60" />

      <div className="absolute inset-12 grid place-items-center rounded-[2rem] bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 shadow-[0_24px_48px_-16px_rgba(2,132,199,0.55)] ring-1 ring-inset ring-white/30">
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-t from-black/10 via-transparent to-white/10" />
        <div className="relative grid size-20 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <ShieldCheck className="size-12 text-white drop-shadow-lg" strokeWidth={1.6} />
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          Agent 工作中
        </div>
      </div>

      <FloatingCard className="absolute left-0 top-2 w-32">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-slate-700">复核结果</span>
          <span className="rounded-md bg-emerald-50 px-1 py-0.5 text-[9px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            +12%
          </span>
        </div>
        <div className="mt-1.5 flex h-6 items-end gap-0.5">
          {[40, 55, 70, 45, 80, 65, 90].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className={cn(
                "flex-1 rounded-sm",
                i === 6 ? "bg-sky-500" : "bg-sky-200"
              )}
            />
          ))}
        </div>
      </FloatingCard>

      <FloatingCard className="absolute right-0 top-8 w-28">
        <div className="flex items-center gap-1 text-[11px]">
          <Users className="size-3 text-sky-600" />
          <span className="font-medium text-slate-700">协作团队</span>
        </div>
        <div className="mt-1.5 flex -space-x-1.5">
          {["王", "李", "陈", "+5"].map((t, i) => (
            <div
              key={i}
              className={cn(
                "grid size-5 place-items-center rounded-full text-[8px] font-medium ring-2 ring-white",
                i === 0 && "bg-sky-100 text-sky-700",
                i === 1 && "bg-emerald-100 text-emerald-700",
                i === 2 && "bg-amber-100 text-amber-700",
                i === 3 && "bg-slate-100 text-slate-600"
              )}
            >
              {t}
            </div>
          ))}
        </div>
      </FloatingCard>

      <FloatingCard className="absolute bottom-2 right-0 w-36">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1">
            <FileText className="size-3 text-sky-600" />
            <span className="font-medium text-slate-700">SC001 证据链</span>
          </div>
          <Star className="size-3 fill-amber-400 text-amber-400" />
        </div>
        <div className="mt-1 space-y-0.5">
          {["DRG 初筛命中", "历史匹配 92%", "建议优先放行"].map((t, i) => (
            <div key={i} className="flex items-center gap-1 text-[10px]">
              <CheckCircle2 className="size-2.5 text-emerald-500" />
              <span className="text-slate-600">{t}</span>
            </div>
          ))}
        </div>
      </FloatingCard>

      <FloatingCard className="absolute -bottom-1 left-2 w-28">
        <div className="flex items-center gap-1 text-[11px]">
          <BarChart3 className="size-3 text-sky-600" />
          <span className="font-medium text-slate-700">置信度</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-sky-400 to-sky-600" />
          </div>
          <span className="text-[10px] font-semibold tabular-nums text-slate-700">
            92%
          </span>
        </div>
      </FloatingCard>
    </div>
  );
}

function FloatingCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/80 bg-white/95 p-2 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.18)] ring-1 ring-inset ring-slate-200/40 backdrop-blur",
        className
      )}
    >
      {children}
    </div>
  );
}

const CORE_STEPS = [
  {
    n: 1,
    title: "智能监听",
    desc: "Agent 接收 DRG 系统疑似清单，自动结构化案例特征",
    badge: "bg-emerald-500",
    pillBg: "bg-emerald-50",
    pillText: "text-emerald-700",
    pillRing: "ring-emerald-200",
    icon: ListChecks,
  },
  {
    n: 2,
    title: "生成复核结果",
    desc: "向量检索匹配历史申诉，输出红黄绿分级建议",
    badge: "bg-amber-500",
    pillBg: "bg-amber-50",
    pillText: "text-amber-700",
    pillRing: "ring-amber-200",
    icon: Sparkles,
  },
  {
    n: 3,
    title: "人工决策",
    desc: "一键放行 / 打回 / 转人工，绿灯打回必填理由",
    badge: "bg-sky-500",
    pillBg: "bg-sky-50",
    pillText: "text-sky-700",
    pillRing: "ring-sky-200",
    icon: Users,
  },
  {
    n: 4,
    title: "反馈沉淀",
    desc: "人工反馈写回向量库与规则边界报告，反哺 Agent",
    badge: "bg-violet-500",
    pillBg: "bg-violet-50",
    pillText: "text-violet-700",
    pillRing: "ring-violet-200",
    icon: Database,
  },
];

const FEATURES = [
  {
    title: "AI 智能监听",
    desc: "自动读取 DRG 疑似清单，提取核心特征结构化入库，省去人工逐条阅读",
    icon: FileSearch,
    accent: "from-sky-500 to-blue-600",
    chips: ["特征提取", "结构化入库"],
  },
  {
    title: "合规参照库",
    desc: "复核通过案例沉淀向量库，秒级匹配相似历史申诉，避免重复争议",
    icon: Library,
    accent: "from-emerald-500 to-teal-600",
    chips: ["语义检索", "Top-K 相似度"],
  },
  {
    title: "决策辅助模型",
    desc: "结合医院画像与历史结论，输出红黄绿建议、置信度与可解释证据链",
    icon: LineChart,
    accent: "from-violet-500 to-fuchsia-600",
    chips: ["红黄绿分级", "证据链"],
  },
];

function BelowFold() {
  return (
    <div
      id="features"
      className="mx-auto w-full max-w-[1400px] space-y-5 px-6 pb-6"
    >
      <section>
        <SectionHeader title="核心流程" hint="疑似清单 → 红黄绿建议 → 人工决策 → 反馈沉淀" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {CORE_STEPS.map((step) => (
            <div
              key={step.n}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 size-16 rounded-full bg-slate-50 transition group-hover:bg-sky-50"
              />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "grid size-7 place-items-center rounded-full text-xs font-semibold text-white shadow-sm",
                      step.badge
                    )}
                  >
                    {step.n}
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                      step.pillBg,
                      step.pillText,
                      step.pillRing
                    )}
                  >
                    <step.icon className="size-2.5" />
                    Step {step.n}
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {step.title}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="产品能力" hint="让现有 DRG 系统更精准的治理辅助层" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm",
                  f.accent
                )}
              >
                <f.icon className="size-5" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">
                  {f.title}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {f.desc}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {f.chips.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2.5">
      <h3 className="text-base font-semibold tracking-tight text-slate-900">
        {title}
      </h3>
      <p className="truncate text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-1 px-6 py-2 text-[11px] text-slate-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-3 text-sky-600" />
          <span>© 2026 明鉴 · 医保监管智能体</span>
          <span className="text-slate-300">·</span>
          <span>模法黑客松 S4 演示作品</span>
        </div>
        <div className="flex items-center gap-2">
          <span>脱敏模拟数据</span>
          <span className="text-slate-300">·</span>
          <span>不接入真实医保数据</span>
        </div>
      </div>
    </footer>
  );
}
