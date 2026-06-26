"""ReviewCase 相关 Pydantic 模型，对齐 frontend/src/types/review.ts。"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class MatchedCase(BaseModel):
    """相似申诉案例，对齐前端 MatchedCase。"""

    appeal_id: str
    similarity: float
    case_type: str
    review_result: str
    summary: str


class EvidenceItem(BaseModel):
    """证据链条目，对齐前端 EvidenceItem。"""

    step: str
    content: str
    source: str


class ManualAction(BaseModel):
    """人工动作记录，对齐前端 ManualAction。

    注意：此处使用 agent_status（非 light_status），
    与 ReviewCase.light_status 区分。
    """

    action_id: str
    case_id: str
    hospital_name: Optional[str] = None
    department: Optional[str] = None
    agent_status: str
    human_action: str
    human_reason: Optional[str] = None
    operator: str
    created_at: str
    is_agent_accepted: bool


class ReviewCase(BaseModel):
    """复核案例，对齐前端 ReviewCase。

    列表接口返回前 12 个字段（到 reviewed_at）。
    详情接口返回全部字段（含 matched_cases、evidence_chain、history_actions）。
    """

    case_id: str
    hospital_name: str
    department: str
    procedure_or_item: str
    main_diagnosis: Optional[str] = None
    cost: float
    trigger_rule: str
    light_status: str
    confidence: float
    suggested_action: str
    current_status: str
    reviewed_at: Optional[str] = None

    # 详情字段
    drg_group: Optional[str] = None
    risk_reason: Optional[str] = None
    patient_summary: Optional[str] = None
    agent_reason: Optional[str] = None
    matched_cases: Optional[list[MatchedCase]] = None
    evidence_chain: Optional[list[EvidenceItem]] = None
    history_actions: Optional[list[ManualAction]] = None
