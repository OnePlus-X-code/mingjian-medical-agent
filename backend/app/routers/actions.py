"""Actions 路由 — 提交人工动作。"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.action import SubmitActionPayload
from app.schemas.common import ok
from app.services.action_service import submit_action

router = APIRouter()


@router.post("/actions")
def post_actions(payload: SubmitActionPayload):
    """提交人工审核动作。"""
    try:
        action = submit_action(
            case_id=payload.case_id,
            agent_status=payload.agent_status,
            human_action=payload.human_action,
            human_reason=payload.human_reason,
            operator=payload.operator,
        )
    except ValueError as e:
        message = str(e)
        # 区分 404 和 400
        if "not found" in message:
            raise HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "data": None,
                    "message": message,
                },
            )
        # 绿灯打回无理由等校验错误
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "data": None,
                "message": message,
            },
        )

    return ok(data=action, message="action submitted")
