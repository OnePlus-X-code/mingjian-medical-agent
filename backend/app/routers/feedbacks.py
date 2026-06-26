"""Feedbacks 路由 — 获取近期人工反馈。"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas.common import ok
from app.services.feedback_service import get_recent_feedbacks

router = APIRouter()


@router.get("/feedbacks")
def get_feedbacks(
    limit: int = Query(default=5, ge=1, le=100, description="返回数量"),
):
    """获取近期人工反馈记录。"""
    items = get_recent_feedbacks(limit=limit)
    return ok(data={"items": items}, message="ok")
