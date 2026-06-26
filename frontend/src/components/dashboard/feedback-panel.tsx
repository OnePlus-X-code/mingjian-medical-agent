"use client";

import { History } from "lucide-react";
import { LightBadge } from "@/components/light-badge";
import { cn } from "@/lib/utils";
import type { HumanAction, ManualAction } from "@/types/review";

interface FeedbackPanelProps {
  feedbacks: ManualAction[];
}

const ACTION_LABEL: Record<HumanAction, string> = {
  approve: "放行",
  reject: "打回",
  manual_review: "转人工",
};

const ACTION_STYLE: Record<HumanAction, string> = {
  approve: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  reject: "bg-rose-50 text-rose-700 ring-rose-200",
  manual_review: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function FeedbackPanel({ feedbacks }: FeedbackPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-sky-50 text-sky-600">
            <History className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">
              近期人工反馈
            </div>
            <div className="text-xs text-slate-500">
              用于优化 Agent 判断逻辑与规则适用边界
            </div>
          </div>
        </div>
        <span className="text-xs text-slate-400">
          最近 {feedbacks.length} 条
        </span>
      </div>
      {feedbacks.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-500">
          暂无人工操作记录
        </div>
      ) : (
        <ul className="divide-y">
          {feedbacks.map((f) => (
            <li key={f.action_id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">
                    {f.case_id}
                  </span>
                  {f.hospital_name && (
                    <span className="text-xs text-slate-600">
                      {f.hospital_name}
                      {f.department && ` · ${f.department}`}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">{f.created_at}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <LightBadge status={f.agent_status} />
                <span className="text-slate-400">→</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                    ACTION_STYLE[f.human_action]
                  )}
                >
                  {ACTION_LABEL[f.human_action]}
                </span>
                <span className="text-slate-500">· {f.operator}</span>
                {!f.is_agent_accepted && (
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                    人工未采纳
                  </span>
                )}
              </div>
              {f.human_reason && (
                <p className="mt-1.5 line-clamp-2 text-sm text-slate-700">
                  {f.human_reason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
