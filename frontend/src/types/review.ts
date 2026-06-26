export type LightStatus = "green" | "yellow" | "red";

export type SuggestedAction = "approve" | "reject" | "manual_review";

export type HumanAction = SuggestedAction;

export type CurrentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "manual_review";

export type ReviewResult = "success" | "reject" | "manual_review";

export type CaseType = "成功申诉" | "打回案例" | "人工复核案例";

export interface MatchedCase {
  appeal_id: string;
  similarity: number;
  case_type: CaseType;
  review_result: ReviewResult;
  summary: string;
}

export interface EvidenceStep {
  step: string;
  content: string;
  source?: string;
}

export interface ReviewCase {
  case_id: string;
  reviewed_at?: string;
  hospital_name: string;
  department: string;
  drg_group: string;
  main_diagnosis: string;
  procedure_or_item: string;
  cost: number;
  trigger_rule: string;
  risk_reason: string;
  patient_summary: string;
  light_status: LightStatus;
  confidence: number;
  suggested_action: SuggestedAction;
  agent_reason: string;
  matched_cases: MatchedCase[];
  evidence_chain: EvidenceStep[];
  current_status: CurrentStatus;
}

export interface ManualAction {
  action_id: string;
  case_id: string;
  hospital_name?: string;
  department?: string;
  agent_status: LightStatus;
  human_action: HumanAction;
  human_reason?: string;
  operator: string;
  created_at: string;
  is_agent_accepted: boolean;
}
