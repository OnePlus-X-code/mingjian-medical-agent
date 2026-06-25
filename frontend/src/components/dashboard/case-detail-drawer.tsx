"use client";

import {
  Activity,
  Building2,
  CheckCircle2,
  FileText,
  Gauge,
  History,
  Library,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
  Workflow,
  XCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LightBadge } from "@/components/light-badge";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type {
  CaseType,
  HumanAction,
  ManualAction,
  ReviewCase,
} from "@/types/review";

const yuan = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

interface CaseDetailDrawerProps {
  caseItem: ReviewCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction?: (c: ReviewCase, action: HumanAction) => void;
  caseFeedbacks?: ManualAction[];
}

export function CaseDetailDrawer({
  caseItem,
  open,
  onOpenChange,
  onAction,
  caseFeedbacks = [],
}: CaseDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[760px]"
      >
        {caseItem && (
          <>
            <DrawerHeader caseItem={caseItem} />
            <ScrollArea className="flex-1">
              <div className="space-y-6 px-6 pb-4 pt-2">
                <CaseOverview caseItem={caseItem} />
                <SuspectSection caseItem={caseItem} />
                <AgentJudgement caseItem={caseItem} />
                <MatchedCases caseItem={caseItem} />
                <EvidenceTimeline caseItem={caseItem} />
                <FeedbackSection feedbacks={caseFeedbacks} />
              </div>
            </ScrollArea>
            <DrawerFooter caseItem={caseItem} onAction={onAction} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerHeader({ caseItem }: { caseItem: ReviewCase }) {
  return (
    <SheetHeader className="space-y-3 border-b bg-gradient-to-b from-slate-50 to-white px-6 py-5">
      <div className="flex items-center gap-2.5">
        <LightBadge status={caseItem.light_status} />
        <StatusBadge status={caseItem.current_status} />
        <span className="font-mono text-xs text-slate-500">
          {caseItem.case_id}
        </span>
      </div>
      <SheetTitle className="text-lg font-semibold text-slate-900">
        {caseItem.procedure_or_item}
      </SheetTitle>
      <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Building2 className="size-3.5 text-slate-400" />
          {caseItem.hospital_name}
        </span>
        <span className="inline-flex items-center gap-1">
          <Stethoscope className="size-3.5 text-slate-400" />
          {caseItem.department}
        </span>
        <span className="inline-flex items-center gap-1">
          <Workflow className="size-3.5 text-slate-400" />
          {caseItem.drg_group}
        </span>
      </SheetDescription>
    </SheetHeader>
  );
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-md bg-sky-50 text-sky-600">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          {hint && <div className="text-xs text-slate-500">{hint}</div>}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {children}
      </div>
    </section>
  );
}

function CaseOverview({ caseItem }: { caseItem: ReviewCase }) {
  return (
    <Section icon={FileText} title="病例全景">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <Field label="主诊断">{caseItem.main_diagnosis}</Field>
        <Field label="项目 / 处方">{caseItem.procedure_or_item}</Field>
        <Field label="DRG 分组">{caseItem.drg_group}</Field>
        <Field label="费用">
          <span className="font-medium tabular-nums text-slate-900">
            {yuan.format(caseItem.cost)}
          </span>
        </Field>
      </dl>
      <Separator className="my-3" />
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          脱敏病例摘要
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          {caseItem.patient_summary}
        </p>
      </div>
    </Section>
  );
}

function SuspectSection({ caseItem }: { caseItem: ReviewCase }) {
  return (
    <Section
      icon={ShieldAlert}
      title="DRG 原始疑点"
      hint="来自现有 DRG 审核系统的疑似违规清单"
    >
      <Field label="命中规则">{caseItem.trigger_rule}</Field>
      <Separator className="my-3" />
      <Field label="疑似违规原因">{caseItem.risk_reason}</Field>
    </Section>
  );
}

function AgentJudgement({ caseItem }: { caseItem: ReviewCase }) {
  const pct = Math.round(caseItem.confidence * 100);
  const barColor =
    caseItem.light_status === "green"
      ? "bg-emerald-500"
      : caseItem.light_status === "red"
        ? "bg-rose-500"
        : "bg-amber-500";
  const actionLabel: Record<HumanAction, string> = {
    approve: "建议放行",
    reject: "建议打回",
    manual_review: "建议人工审核",
  };
  return (
    <Section
      icon={Gauge}
      title="Agent 判断"
      hint="基于历史申诉案例 + 医院科室画像生成"
    >
      <div className="flex flex-wrap items-center gap-3">
        <LightBadge status={caseItem.light_status} />
        <span className="text-sm text-slate-600">
          {actionLabel[caseItem.suggested_action]}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">置信度</span>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full", barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-medium tabular-nums text-slate-700">
            {pct}%
          </span>
        </div>
      </div>
      <Separator className="my-3" />
      <p className="text-sm leading-relaxed text-slate-700">
        {caseItem.agent_reason}
      </p>
    </Section>
  );
}

function MatchedCases({ caseItem }: { caseItem: ReviewCase }) {
  return (
    <Section
      icon={Library}
      title={`相似历史申诉案例 · ${caseItem.matched_cases.length} 条`}
      hint="向量库匹配的高相似度复核案例"
    >
      {caseItem.matched_cases.length === 0 ? (
        <div className="text-sm text-slate-500">未匹配到相似历史案例</div>
      ) : (
        <ul className="space-y-3">
          {caseItem.matched_cases.map((m) => (
            <li
              key={m.appeal_id}
              className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium text-slate-700">
                    {m.appeal_id}
                  </span>
                  <CaseTypeBadge type={m.case_type} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${Math.round(m.similarity * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium tabular-nums text-slate-600">
                    相似度 {Math.round(m.similarity * 100)}%
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {m.summary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function CaseTypeBadge({ type }: { type: CaseType }) {
  const map: Record<CaseType, string> = {
    成功申诉: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    打回案例: "bg-rose-50 text-rose-700 ring-rose-200",
    人工复核案例: "bg-sky-50 text-sky-700 ring-sky-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        map[type]
      )}
    >
      {type}
    </span>
  );
}

function EvidenceTimeline({ caseItem }: { caseItem: ReviewCase }) {
  return (
    <Section
      icon={Activity}
      title="证据链"
      hint="从原始疑点到复核建议的完整推理路径"
    >
      <ol className="relative space-y-4 border-l-2 border-dashed border-slate-200 pl-5">
        {caseItem.evidence_chain.map((step, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[26px] top-0.5 grid size-5 place-items-center rounded-full bg-sky-500 text-[11px] font-semibold text-white ring-4 ring-white">
              {i + 1}
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm font-semibold text-slate-800">
                {step.step}
              </div>
              {step.source && (
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                  {step.source}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {step.content}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function FeedbackSection({ feedbacks }: { feedbacks: ManualAction[] }) {
  return (
    <Section icon={History} title="历史反馈记录">
      {feedbacks.length === 0 ? (
        <div className="text-sm text-slate-500">该案例暂无历史人工操作</div>
      ) : (
        <ul className="space-y-3">
          {feedbacks.map((f) => (
            <li
              key={f.action_id}
              className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800">{f.operator}</span>
                <span className="text-xs text-slate-500">{f.created_at}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                <span>Agent 建议</span>
                <LightBadge status={f.agent_status} />
                <span>→ 人工执行</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium">
                  {humanActionLabel(f.human_action)}
                </span>
              </div>
              {f.human_reason && (
                <p className="mt-2 text-sm text-slate-700">{f.human_reason}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function DrawerFooter({
  caseItem,
  onAction,
}: {
  caseItem: ReviewCase;
  onAction?: (c: ReviewCase, action: HumanAction) => void;
}) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-white px-6 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.08)]">
      <div className="text-xs text-slate-500">
        审核员的最终判断会写入反馈记录，用于优化 Agent 判断逻辑
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
          onClick={() => onAction?.(caseItem, "reject")}
        >
          <XCircle className="size-4" />
          打回
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
          onClick={() => onAction?.(caseItem, "manual_review")}
        >
          <RotateCcw className="size-4" />
          转人工
        </Button>
        <Button
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => onAction?.(caseItem, "approve")}
        >
          <CheckCircle2 className="size-4" />
          放行
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm leading-relaxed text-slate-800">
        {children}
      </dd>
    </div>
  );
}

function humanActionLabel(a: HumanAction): string {
  if (a === "approve") return "放行";
  if (a === "reject") return "打回";
  return "转人工";
}
