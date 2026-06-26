"use client";

import { useEffect, useState } from "react";
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
import { LightBadge } from "@/components/light-badge";
import type { ReviewCase } from "@/types/review";

interface RejectReasonDialogProps {
  caseItem: ReviewCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

export function RejectReasonDialog({
  caseItem,
  open,
  onOpenChange,
  onConfirm,
}: RejectReasonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <RejectReasonContent
        caseItem={caseItem}
        open={open}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    </Dialog>
  );
}

function RejectReasonContent({
  caseItem,
  open,
  onOpenChange,
  onConfirm,
}: Omit<RejectReasonDialogProps, "open"> & { open: boolean }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset internal state when dialog closes
  useEffect(() => {
    if (!open) {
      setReason("");
      setTouched(false);
      setSubmitting(false);
    }
  }, [open]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= 5;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setTouched(true);
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
      onOpenChange(false);
    } catch {
      // Error toast handled by parent; allow retry
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>打回绿灯案例需说明理由</DialogTitle>
        <DialogDescription>
          绿灯案例表示 Agent 建议放行，打回需提供充分理由以优化模型判断。
        </DialogDescription>
      </DialogHeader>

      {caseItem && (
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium">
              {caseItem.case_id}
            </span>
            <LightBadge status={caseItem.light_status} />
            <span className="text-xs text-muted-foreground">
              {caseItem.hospital_name} · {caseItem.department}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {caseItem.main_diagnosis}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">打回理由</label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="请输入打回理由（至少 5 个字）"
          rows={3}
          className="resize-none"
          disabled={submitting}
        />
        <div className="flex items-center justify-between">
          {touched && !valid ? (
            <span className="text-xs text-rose-500">
              理由至少需要 5 个字
            </span>
          ) : (
            <span className="text-xs text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {trimmed.length} 字
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
        >
          取消
        </Button>
        <Button
          type="button"
          className="bg-rose-600 text-white hover:bg-rose-700"
          disabled={!valid || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "提交中..." : "确认打回"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
