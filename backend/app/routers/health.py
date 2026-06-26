"""健康检查路由。"""

from fastapi import APIRouter

from app.schemas.common import ok

router = APIRouter()


@router.get("/health")
def health():
    """健康检查。"""
    return ok(
        data={
            "status": "ok",
            "service": "mingjian-agent-backend",
        }
    )
