import reviewCasesData from "@/mock/review_cases.json";
import manualActionsData from "@/mock/manual_actions.json";
import type {
  HumanAction,
  LightStatus,
  ManualAction,
  ReviewCase,
} from "@/types/review";

const REVIEW_CASES = reviewCasesData as ReviewCase[];
const MANUAL_ACTIONS = manualActionsData as ManualAction[];

export interface ReviewCaseQuery {
  status?: LightStatus | "all";
  hospital?: string;
  department?: string;
  keyword?: string;
}

export async function getReviewCases(
  query: ReviewCaseQuery = {}
): Promise<ReviewCase[]> {
  const { status, hospital, department, keyword } = query;
  return REVIEW_CASES.filter((c) => {
    if (status && status !== "all" && c.light_status !== status) return false;
    if (hospital && hospital !== "all" && c.hospital_name !== hospital)
      return false;
    if (department && department !== "all" && c.department !== department)
      return false;
    if (keyword) {
      const k = keyword.trim().toLowerCase();
      if (!k) return true;
      const haystack = [
        c.case_id,
        c.hospital_name,
        c.department,
        c.procedure_or_item,
        c.trigger_rule,
        c.main_diagnosis,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(k)) return false;
    }
    return true;
  });
}

export async function getReviewCaseById(
  caseId: string
): Promise<ReviewCase | null> {
  return REVIEW_CASES.find((c) => c.case_id === caseId) ?? null;
}

export async function getRecentFeedbacks(
  limit = 5
): Promise<ManualAction[]> {
  return [...MANUAL_ACTIONS]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

export interface SubmitActionInput {
  case_id: string;
  agent_status: LightStatus;
  human_action: HumanAction;
  human_reason?: string;
  operator: string;
}

export async function submitAction(
  input: SubmitActionInput
): Promise<ManualAction> {
  const isGreenReject =
    input.agent_status === "green" && input.human_action === "reject";
  if (isGreenReject && !input.human_reason?.trim()) {
    throw new Error("绿灯被打回时必须填写理由");
  }
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const created_at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const action_id = `MA${String(MANUAL_ACTIONS.length + 1).padStart(3, "0")}`;
  const target = await getReviewCaseById(input.case_id);
  return {
    action_id,
    case_id: input.case_id,
    hospital_name: target?.hospital_name,
    department: target?.department,
    agent_status: input.agent_status,
    human_action: input.human_action,
    human_reason: input.human_reason,
    operator: input.operator,
    created_at,
    is_agent_accepted: input.agent_status === lightFromAction(input.human_action),
  };
}

function lightFromAction(action: HumanAction): LightStatus {
  if (action === "approve") return "green";
  if (action === "reject") return "red";
  return "yellow";
}

export function getFilterOptions() {
  const hospitals = Array.from(
    new Set(REVIEW_CASES.map((c) => c.hospital_name))
  );
  const departments = Array.from(
    new Set(REVIEW_CASES.map((c) => c.department))
  );
  return { hospitals, departments };
}

export function getStats() {
  const total = REVIEW_CASES.length;
  const pending = REVIEW_CASES.filter(
    (c) => c.current_status === "pending"
  ).length;
  const green = REVIEW_CASES.filter((c) => c.light_status === "green").length;
  const red = REVIEW_CASES.filter((c) => c.light_status === "red").length;
  const yellow = REVIEW_CASES.filter(
    (c) => c.light_status === "yellow"
  ).length;
  return { total, pending, green, red, yellow };
}
