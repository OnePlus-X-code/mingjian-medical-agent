"use client";

import { CheckCircle2, Inbox, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LightDot } from "@/components/light-badge";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { HumanAction, ReviewCase } from "@/types/review";

interface CaseTableProps {
  cases: ReviewCase[];
  onRowClick?: (c: ReviewCase) => void;
  onAction?: (c: ReviewCase, action: HumanAction) => void;
}

const yuan = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

export function CaseTable({ cases, onRowClick, onAction }: CaseTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
            <TableHead className="w-10" />
            <TableHead className="w-[110px]">案例 ID</TableHead>
            <TableHead className="min-w-[160px]">医院 / 科室</TableHead>
            <TableHead className="min-w-[220px]">项目 / 处方</TableHead>
            <TableHead className="min-w-[180px]">命中规则</TableHead>
            <TableHead className="w-[110px] text-right">金额</TableHead>
            <TableHead className="w-[110px]">置信度</TableHead>
            <TableHead className="w-[100px]">当前状态</TableHead>
            <TableHead className="w-[260px] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-40 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Inbox className="size-6" />
                  <div className="text-sm">没有符合筛选条件的案例</div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            cases.map((c) => (
              <TableRow
                key={c.case_id}
                className="cursor-pointer transition hover:bg-sky-50/40"
                onClick={() => onRowClick?.(c)}
              >
                <TableCell className="pl-4">
                  <LightDot status={c.light_status} />
                </TableCell>
                <TableCell className="font-mono text-xs font-medium text-slate-700">
                  {c.case_id}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-slate-800">
                    {c.hospital_name}
                  </div>
                  <div className="text-xs text-slate-500">{c.department}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-slate-800">
                    {c.procedure_or_item}
                  </div>
                  <div className="line-clamp-1 text-xs text-slate-500">
                    {c.main_diagnosis}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="line-clamp-2 text-sm text-slate-700">
                    {c.trigger_rule}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-slate-800">
                  {yuan.format(c.cost)}
                </TableCell>
                <TableCell>
                  <ConfidenceCell value={c.confidence} status={c.light_status} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.current_status} />
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  {c.current_status === "pending" ? (
                    <div className="flex justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        onClick={() => onAction?.(c, "approve")}
                      >
                        <CheckCircle2 className="size-3.5" />
                        放行
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                        onClick={() => onAction?.(c, "reject")}
                      >
                        <XCircle className="size-3.5" />
                        打回
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
                        onClick={() => onAction?.(c, "manual_review")}
                      >
                        <RotateCcw className="size-3.5" />
                        转人工
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">已处置</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ConfidenceCell({
  value,
  status,
}: {
  value: number;
  status: ReviewCase["light_status"];
}) {
  const pct = Math.round(value * 100);
  const barColor =
    status === "green"
      ? "bg-emerald-500"
      : status === "red"
        ? "bg-rose-500"
        : "bg-amber-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-slate-600">{pct}%</span>
    </div>
  );
}
