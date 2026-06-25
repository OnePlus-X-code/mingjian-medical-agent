"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LightBadge } from "@/components/light-badge";
import type { ReviewCase } from "@/types/review";

interface RejectReasonDialogProps {
  caseItem: ReviewCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

export function RejectReasonDialog({
  caseItem,
  open,
  onOpenChange,
  onConfirm,
}: RejectReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= 5;
  const showError = touched && !valid;

  const submit = () => {
    if (!valid) {
      setTouched(true);
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-md bg-amber-50 text-amber-600">
              <AlertTriangle className="size-4" />
            </div>
            <DialogTitle>打回绿灯案例需说明理由</DialogTitle>
          </div>
          <DialogDescription className="text-slate-600">
            Agent 建议放行该案例，但你选择打回。请填写理由，反馈将用于优化
            Agent 判断逻辑与规则适用边界。
          </DialogDescription>
        </DialogHeader>

        {caseItem && (
          <div className="rounded-lg border bg-slate-50 p-3 text-xs">
            <div className="flex items-center gap-2">
              <LightBadge status={caseItem.light_status} />
              <span className="font-mono text-slate-600">
                {caseItem.case_id}
              </span>
              <span className="text-slate-600">
                {caseItem.hospital_name} · {caseItem.department}
              </span>
            </div>
            <div className="mt-1 line-clamp-1 text-slate-700">
              {caseItem.procedure_or_item} · {caseItem.trigger_rule}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="reject-reason" className="text-sm">
            打回理由 <span className="text-rose-600">*</span>
          </Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="例如：本次病例缺少术中影像证据，与 Agent 匹配的历史案例特征虽相似，但本例耗材使用与术中记录不一致，暂不放行。"
            rows={4}
            className="resize-none"
          />
          <div className="flex justify-between text-xs">
            <span className={showError ? "text-rose-600" : "text-slate-400"}>
              {showError ? "请填写至少 5 个字符" : "至少 5 个字符"}
            </span>
            <span className="text-slate-400">{trimmed.length} 字</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            className="bg-rose-600 text-white hover:bg-rose-700"
            disabled={!valid}
            onClick={submit}
          >
            确认打回
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
