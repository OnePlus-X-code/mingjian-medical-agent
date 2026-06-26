"""统一响应结构。"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ApiResponse(BaseModel):
    """统一 API 响应结构。

    所有接口返回此结构：
    { success: bool, data: Any, message: str }
    """

    success: bool
    data: Any = None
    message: str = "ok"


def ok(data: Any = None, message: str = "ok") -> dict:
    """返回成功响应 dict。"""
    return {"success": True, "data": data, "message": message}


def error(message: str = "error", data: Any = None) -> dict:
    """返回失败响应 dict。"""
    return {"success": False, "data": data, "message": message}
