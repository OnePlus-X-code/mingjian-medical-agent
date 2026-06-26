"""人工动作相关 Pydantic 模型，对齐 frontend/src/types/review.ts。"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class SubmitActionPayload(BaseModel):
    """提交人工动作的请求体，对齐前端 SubmitActionInput。"""

    case_id: str
    agent_status: str  # green / yellow / red
    human_action: str  # approve / reject / manual_review
    human_reason: Optional[str] = None
    operator: str
