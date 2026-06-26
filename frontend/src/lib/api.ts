import reviewCasesData from "@/mock/review_cases.json";
import manualActionsData from "@/mock/manual_actions.json";
import type {
  HumanAction,
  LightStatus,
  ManualAction,
  ReviewCase,
} from "@/types/review";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const API_TIMEOUT_MS = 5000;

const REVIEW_CASES = reviewCasesData as ReviewCase[];
const MANUAL_ACTIONS = manualActionsData as ManualAction[];

export interface ReviewCaseQuery {
  status?: LightStatus | "all";
  hospital?: string;
  department?: string;
  keyword?: string;
}

export interface SubmitActionInput {
  case_id: string;
  agent_status: LightStatus;
  human_action: HumanAction;
  human_reason?: string;
  operator: string;
}

type ApiData = Record<string, unknown> | unknown[] | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildQuery(query: ReviewCaseQuery) {
  const params = new URLSearchParams();
  // 请求足够大的 page_size，确保一次返回全部病例（demo 级数据量 < 100）
  params.set("page_size", "100");
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.hospital && query.hospital !== "all")
    params.set("hospital", query.hospital);
  if (query.department && query.department !== "all")
    params.set("department", query.department);
  if (query.keyword?.trim()) params.set("keyword", query.keyword.trim());
  return `?${params.toString()}`;
}

async function requestJson(
  path: string,
  init?: RequestInit,
  timeoutMs?: number
): Promise<ApiData> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    timeoutMs ?? API_TIMEOUT_MS
  );

  // GET requests don't need Content-Type header; omitting it avoids CORS preflight
  const isPost = init?.method === "POST";
  const headers: Record<string, string> = {};
  if (isPost) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      ...headers,
      ...init?.headers,
    },
  }).finally(() => window.clearTimeout(timeout));

  if (!response.ok) {
    throw new Error(`API ${path} returned ${response.status}`);
  }

  return (await response.json()) as ApiData;
}

function unwrapList<T>(payload: ApiData): T[] | null {
  if (Array.isArray(payload)) return payload as T[];
  if (!isRecord(payload)) return null;

  const data = payload.data;
  if (Array.isArray(data)) return data as T[];
  if (isRecord(data) && Array.isArray(data.items)) return data.items as T[];
  if (Array.isArray(payload.items)) return payload.items as T[];

  return null;
}

function unwrapObject(payload: ApiData): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function filterLocalCases(query: ReviewCaseQuery = {}) {
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

export async function getReviewCases(
  query: ReviewCaseQuery = {}
): Promise<ReviewCase[]> {
  try {
    const payload = await requestJson(`/review-cases${buildQuery(query)}`);
    return unwrapList<ReviewCase>(payload) ?? filterLocalCases(query);
  } catch {
    return filterLocalCases(query);
  }
}

export async function getReviewCaseById(
  caseId: string
): Promise<ReviewCase | null> {
  try {
    const payload = await requestJson(`/review-cases/${caseId}`);
    const data = unwrapObject(payload);
    if (data) return data as unknown as ReviewCase;
  } catch {
    // Fall back to local demo data when the backend is not running.
  }

  return REVIEW_CASES.find((c) => c.case_id === caseId) ?? null;
}

export async function getRecentFeedbacks(limit = 5): Promise<ManualAction[]> {
  try {
    const payload = await requestJson(`/feedbacks?limit=${limit}`);
    const feedbacks = unwrapList<ManualAction>(payload);
    if (feedbacks) return feedbacks.slice(0, limit);
  } catch {
    // Fall back to local demo data when the backend is not running.
  }

  return [...MANUAL_ACTIONS]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, limit);
}

export async function submitAction(
  input: SubmitActionInput
): Promise<ManualAction> {
  const isGreenReject =
    input.agent_status === "green" && input.human_action === "reject";
  if (isGreenReject && !input.human_reason?.trim()) {
    throw new Error("绿灯被打回时必须填写理由");
  }

  const target = REVIEW_CASES.find((c) => c.case_id === input.case_id);
  const fallback = createLocalAction(input, target);

  try {
    const payload = await requestJson("/actions", {
      method: "POST",
      body: JSON.stringify(input),
    });
    const saved = unwrapObject(payload);
    return saved ? ({ ...fallback, ...saved } as ManualAction) : fallback;
  } catch {
    return fallback;
  }
}

function createLocalAction(
  input: SubmitActionInput,
  target?: ReviewCase
): ManualAction {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const created_at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return {
    action_id: `MA-${input.case_id}-${now.getTime()}`,
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

export async function triggerAgentReview(
  caseId: string
): Promise<ReviewCase | null> {
  const localCase = REVIEW_CASES.find((c) => c.case_id === caseId);

  try {
    const payload = await requestJson("/agent/review-one", {
      method: "POST",
      body: JSON.stringify({ case_id: caseId }),
    });
    const data = unwrapObject(payload);
    return data ? (data as unknown as ReviewCase) : localCase ?? null;
  } catch {
    // Fall back to local demo data when the backend is not running.
    return localCase ?? null;
  }
}

export interface RefreshDrgResult {
  imported_count: number;
  skipped_count: number;
  items: ReviewCase[];
}

export async function refreshDrgCases(
  limit: number = 3
): Promise<RefreshDrgResult> {
  try {
    // LLM processing for multiple cases can take 30+ seconds
    const payload = await requestJson(
      "/agent/refresh-drg-cases",
      {
        method: "POST",
        body: JSON.stringify({ limit }),
      },
      60000
    );
    const data = isRecord(payload) ? payload.data : null;
    if (data && isRecord(data)) {
      const items = Array.isArray(data.items) ? data.items as ReviewCase[] : [];
      return {
        imported_count: typeof data.imported_count === "number" ? data.imported_count : 0,
        skipped_count: typeof data.skipped_count === "number" ? data.skipped_count : 0,
        items,
      };
    }
    return { imported_count: 0, skipped_count: 0, items: [] };
  } catch {
    // Fall back to empty result when the backend is not running.
    return { imported_count: 0, skipped_count: 0, items: [] };
  }
}

export function getFilterOptions(cases: ReviewCase[] = REVIEW_CASES) {
  const hospitals = Array.from(new Set(cases.map((c) => c.hospital_name)));
  const departments = Array.from(new Set(cases.map((c) => c.department)));
  return { hospitals, departments };
}

export function getStats(cases: ReviewCase[] = REVIEW_CASES) {
  const total = cases.length;
  const pending = cases.filter((c) => c.current_status === "pending").length;
  const green = cases.filter((c) => c.light_status === "green").length;
  const red = cases.filter((c) => c.light_status === "red").length;
  const yellow = cases.filter((c) => c.light_status === "yellow").length;
  return { total, pending, green, red, yellow };
}
