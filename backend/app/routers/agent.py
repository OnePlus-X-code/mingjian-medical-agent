"""Agent 路由 — 智能复核。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas.common import ok
from app.services.agent_service import review_one

router = APIRouter()


class ReviewOnePayload(BaseModel):
    """Agent 复核请求体。"""
    case_id: str


@router.post("/agent/review-one")
def post_agent_review_one(payload: ReviewOnePayload):
    """触发单条 Agent 复核。

    返回完整的 ReviewCase，并写回 review_cases.json。
    """
    try:
        case, message = review_one(payload.case_id)
    except ValueError as e:
        msg = str(e)
        if "not found" in msg:
            raise HTTPException(
                status_code=404,
                detail={"success": False, "data": None, "message": msg},
            )
        raise HTTPException(
            status_code=400,
            detail={"success": False, "data": None, "message": msg},
        )

    return ok(data=case, message=message)
