"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LightStatus } from "@/types/review";

export interface FilterState {
  hospital: string;
  department: string;
  status: LightStatus | "all";
  keyword: string;
}

interface FilterBarProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
  hospitals: string[];
  departments: string[];
  totalCount: number;
  filteredCount: number;
}

export function FilterBar({
  value,
  onChange,
  hospitals,
  departments,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">医院</span>
          <Select
            value={value.hospital}
            onValueChange={(v) => set("hospital", v ?? "all")}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="全部医院" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部医院</SelectItem>
              {hospitals.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">科室</span>
          <Select
            value={value.department}
            onValueChange={(v) => set("department", v ?? "all")}
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="全部科室" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部科室</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">状态</span>
          <Select
            value={value.status}
            onValueChange={(v) =>
              set("status", (v ?? "all") as FilterState["status"])
            }
          >
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="green">🟢 建议放行</SelectItem>
              <SelectItem value="yellow">🟡 建议人工</SelectItem>
              <SelectItem value="red">🔴 建议打回</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={value.keyword}
            onChange={(e) => set("keyword", e.target.value)}
            placeholder="搜索案例 ID / 项目 / 规则"
            className="h-9 pl-8"
          />
        </div>
      </div>
      <div className="mt-3 text-xs text-slate-500">
        共 <span className="font-medium text-slate-700">{totalCount}</span> 条疑点
        ·{" "}
        当前显示{" "}
        <span className="font-medium text-slate-700">{filteredCount}</span> 条
      </div>
    </div>
  );
}
