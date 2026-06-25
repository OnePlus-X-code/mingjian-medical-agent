"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { StatsRow } from "@/components/dashboard/stats-row";
import {
  FilterBar,
  type FilterState,
} from "@/components/dashboard/filter-bar";
import { CaseTable } from "@/components/dashboard/case-table";
import { CaseDetailDrawer } from "@/components/dashboard/case-detail-drawer";
import { FeedbackPanel } from "@/components/dashboard/feedback-panel";
import { RejectReasonDialog } from "@/components/dashboard/reject-reason-dialog";
import {
  getFilterOptions,
  getRecentFeedbacks,
  getReviewCases,
  submitAction,
} from "@/lib/api";
import reviewCasesData from "@/mock/review_cases.json";
import manualActionsData from "@/mock/manual_actions.json";
import type {
  CurrentStatus,
  HumanAction,
  ManualAction,
  ReviewCase,
} from "@/types/review";

const OPERATOR = "王明";
const INITIAL_CASES = reviewCasesData as ReviewCase[];
const INITIAL_FEEDBACKS = manualActionsData as ManualAction[];

const STATUS_BY_ACTION: Record<HumanAction, CurrentStatus> = {
  approve: "approved",
  reject: "rejected",
  manual_review: "manual_review",
};

const ACTION_LABEL: Record<HumanAction, string> = {
  approve: "放行",
  reject: "打回",
  manual_review: "转人工审核",
};

export default function DashboardPage() {
  const [cases, setCases] = useState<ReviewCase[]>(INITIAL_CASES);
  const [feedbacks, setFeedbacks] =
    useState<ManualAction[]>(INITIAL_FEEDBACKS);
  const [filter, setFilter] = useState<FilterState>({
    hospital: "all",
    department: "all",
    status: "all",
    date: "all",
    keyword: "",
  });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingReject, setPendingReject] = useState<ReviewCase | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      const [loadedCases, loadedFeedbacks] = await Promise.all([
        getReviewCases(),
        getRecentFeedbacks(5),
      ]);
      if (cancelled) return;
      setCases(loadedCases);
      setFeedbacks(loadedFeedbacks);
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const filterOptions = useMemo(() => getFilterOptions(cases), [cases]);

  const stats = useMemo(() => {
    const pending = cases.filter((c) => c.current_status === "pending").length;
    const green = cases.filter(
      (c) => c.current_status === "pending" && c.light_status === "green"
    ).length;
    const yellow = cases.filter(
      (c) => c.current_status === "pending" && c.light_status === "yellow"
    ).length;
    const red = cases.filter(
      (c) => c.current_status === "pending" && c.light_status === "red"
    ).length;
    return { pending, green, yellow, red };
  }, [cases]);

  const filteredCases = useMemo(() => {
    const k = filter.keyword.trim().toLowerCase();
    return cases.filter((c) => {
      if (filter.hospital !== "all" && c.hospital_name !== filter.hospital)
        return false;
      if (
        filter.department !== "all" &&
        c.department !== filter.department
      )
        return false;
      if (filter.status !== "all" && c.light_status !== filter.status)
        return false;
      if (!matchesDateFilter(c.reviewed_at, filter.date)) return false;
      if (k) {
        const hay = [
          c.case_id,
          c.hospital_name,
          c.department,
          c.procedure_or_item,
          c.trigger_rule,
          c.main_diagnosis,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    });
  }, [cases, filter]);

  const selectedCase = useMemo(
    () => cases.find((c) => c.case_id === selectedCaseId) ?? null,
    [cases, selectedCaseId]
  );

  const caseFeedbacks = useMemo(
    () =>
      selectedCase
        ? feedbacks.filter((f) => f.case_id === selectedCase.case_id)
        : [],
    [feedbacks, selectedCase]
  );

  const handleRowClick = (c: ReviewCase) => {
    setSelectedCaseId(c.case_id);
    setDrawerOpen(true);
  };

  const applyAction = (
    c: ReviewCase,
    action: HumanAction,
    reason?: string
  ) => {
    const newStatus = STATUS_BY_ACTION[action];
    void submitAction({
      case_id: c.case_id,
      agent_status: c.light_status,
      human_action: action,
      human_reason: reason,
      operator: OPERATOR,
    })
      .then((savedAction) => {
        setCases((prev) =>
          prev.map((x) =>
            x.case_id === c.case_id ? { ...x, current_status: newStatus } : x
          )
        );
        setFeedbacks((prev) => [
          {
            ...savedAction,
            hospital_name: savedAction.hospital_name ?? c.hospital_name,
            department: savedAction.department ?? c.department,
          },
          ...prev,
        ]);

        const verb = ACTION_LABEL[action];
        if (c.light_status === "green" && action === "reject") {
          toast.warning(`已打回绿灯案例 ${c.case_id}`, {
            description: `已记录人工理由，将用于优化 Agent 判断逻辑`,
          });
        } else if (action === "approve") {
          toast.success(`已${verb} ${c.case_id}`, {
            description: `${c.hospital_name} · ${c.department}`,
          });
        } else if (action === "reject") {
          toast.error(`已${verb} ${c.case_id}`, {
            description: `${c.hospital_name} · ${c.department}`,
          });
        } else {
          toast.info(`已${verb} ${c.case_id}`, {
            description: `${c.hospital_name} · ${c.department}`,
          });
        }
      })
      .catch((error: unknown) => {
        toast.error("操作提交失败", {
          description:
            error instanceof Error ? error.message : "请稍后重试或检查后端接口",
        });
      });
  };

  const handleAction = (c: ReviewCase, action: HumanAction) => {
    if (c.current_status !== "pending") return;
    // 绿灯被打回必须填写理由
    if (c.light_status === "green" && action === "reject") {
      setPendingReject(c);
      return;
    }
    applyAction(c, action);
  };

  const handleConfirmReject = (reason: string) => {
    if (!pendingReject) return;
    applyAction(pendingReject, "reject", reason);
    setPendingReject(null);
  };

  const recentFeedbacks = useMemo(
    () =>
      [...feedbacks]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5),
    [feedbacks]
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1400px] flex-1 space-y-5 px-6 py-6">
        <StatsRow
          pending={stats.pending}
          green={stats.green}
          yellow={stats.yellow}
          red={stats.red}
        />
        <FilterBar
          value={filter}
          onChange={setFilter}
          hospitals={filterOptions.hospitals}
          departments={filterOptions.departments}
          totalCount={cases.length}
          filteredCount={filteredCases.length}
        />
        <CaseTable
          cases={filteredCases}
          onRowClick={handleRowClick}
          onAction={handleAction}
        />
        <FeedbackPanel feedbacks={recentFeedbacks} />
      </main>
      <CaseDetailDrawer
        caseItem={selectedCase}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onAction={handleAction}
        caseFeedbacks={caseFeedbacks}
      />
      <RejectReasonDialog
        caseItem={pendingReject}
        open={pendingReject !== null}
        onOpenChange={(o) => {
          if (!o) setPendingReject(null);
        }}
        onConfirm={handleConfirmReject}
      />
    </>
  );
}

function matchesDateFilter(reviewedAt: string | undefined, date: FilterState["date"]) {
  if (date === "all") return true;
  if (!reviewedAt) return false;

  const reviewedTime = new Date(`${reviewedAt}T00:00:00`).getTime();
  if (Number.isNaN(reviewedTime)) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - reviewedTime) / 86400000);

  if (date === "today") return diffDays === 0;
  if (date === "last_3_days") return diffDays >= 0 && diffDays <= 2;
  return diffDays >= 0 && diffDays <= 6;
}
