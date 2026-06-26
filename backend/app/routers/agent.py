"""Agent 路由 — 智能复核。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.schemas.common import ok
from app.services.agent_service import review_one, refresh_drg_cases

router = APIRouter()


class ReviewOnePayload(BaseModel):
    """Agent 复核请求体。"""
    case_id: str


class RefreshDrgPayload(BaseModel):
    """DRG 疑点同步请求体。"""
    limit: int | None = 3


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


@router.post("/agent/refresh-drg-cases")
def post_refresh_drg_cases(payload: RefreshDrgPayload):
    """同步 DRG 疑点并执行 Agent 分析。

    读取 suspect_cases.json，找出尚未存在于 review_cases 的病例，
    对每条执行 normalize + Agent 分析（LLM 或规则兜底），
    写入 review_cases.json，返回新增病例列表。
    """
    limit = payload.limit if payload.limit and payload.limit > 0 else 3
    items, imported_count, skipped_count = refresh_drg_cases(limit=limit)

    message = "drg cases refreshed" if imported_count > 0 else "no new drg cases"

    return ok(
        data={
            "imported_count": imported_count,
            "skipped_count": skipped_count,
            "items": items,
        },
        message=message,
    )
