"""Review Cases 路由 — 病例列表与详情。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas.common import ok
from app.services.review_service import get_review_case_by_id, list_review_cases

router = APIRouter()


@router.get("/review-cases")
def get_review_cases(
    status: str | None = Query(default=None, description="green/yellow/red 或 pending/approved/rejected/manual_review"),
    hospital: str | None = Query(default=None, description="医院名称"),
    department: str | None = Query(default=None, description="科室名称"),
    keyword: str | None = Query(default=None, description="搜索关键词"),
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=10, ge=1, description="每页数量"),
):
    """获取复核案例列表。"""
    result = list_review_cases(
        status=status,
        hospital=hospital,
        department=department,
        keyword=keyword,
        page=page,
        page_size=page_size,
    )
    return ok(data=result)


@router.get("/review-cases/{case_id}")
def get_review_case_detail(case_id: str):
    """获取单条复核案例详情。"""
    case = get_review_case_by_id(case_id)
    if case is None:
        raise HTTPException(
            status_code=404,
            detail={
                "success": False,
                "data": None,
                "message": f"case not found: {case_id}",
            },
        )
    return ok(data=case)
