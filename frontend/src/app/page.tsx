"use client";

import { useMemo, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsRow } from "@/components/dashboard/stats-row";
import {
  FilterBar,
  type FilterState,
} from "@/components/dashboard/filter-bar";
import { CaseTable } from "@/components/dashboard/case-table";
import { CaseDetailDrawer } from "@/components/dashboard/case-detail-drawer";
import { FeedbackPanel } from "@/components/dashboard/feedback-panel";
import { getFilterOptions, getStats } from "@/lib/api";
import reviewCasesData from "@/mock/review_cases.json";
import manualActionsData from "@/mock/manual_actions.json";
import type {
  HumanAction,
  ManualAction,
  ReviewCase,
} from "@/types/review";

const OPERATOR = "医保审核员 01";
const ALL_CASES = reviewCasesData as ReviewCase[];
const ALL_FEEDBACKS = manualActionsData as ManualAction[];

export default function DashboardPage() {
  const [filter, setFilter] = useState<FilterState>({
    hospital: "all",
    department: "all",
    status: "all",
    keyword: "",
  });
  const [selectedCase, setSelectedCase] = useState<ReviewCase | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filterOptions = useMemo(() => getFilterOptions(), []);
  const stats = useMemo(() => getStats(), []);

  const filteredCases = useMemo(() => {
    const k = filter.keyword.trim().toLowerCase();
    return ALL_CASES.filter((c) => {
      if (filter.hospital !== "all" && c.hospital_name !== filter.hospital)
        return false;
      if (
        filter.department !== "all" &&
        c.department !== filter.department
      )
        return false;
      if (filter.status !== "all" && c.light_status !== filter.status)
        return false;
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
  }, [filter]);

  const recentFeedbacks = useMemo(
    () =>
      [...ALL_FEEDBACKS]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5),
    []
  );

  const caseFeedbacks = useMemo(
    () =>
      selectedCase
        ? ALL_FEEDBACKS.filter((f) => f.case_id === selectedCase.case_id)
        : [],
    [selectedCase]
  );

  const handleRowClick = (c: ReviewCase) => {
    setSelectedCase(c);
    setDrawerOpen(true);
  };

  const handleAction = (c: ReviewCase, action: HumanAction) => {
    // Step 4 接入完整人工操作闭环
    console.log("[action]", c.case_id, action);
  };

  return (
    <>
      <DashboardHeader operator={OPERATOR} />
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
          totalCount={ALL_CASES.length}
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
    </>
  );
}
