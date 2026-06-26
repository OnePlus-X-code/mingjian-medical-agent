"""后端配置读取。"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# 加载 .env 文件（如果存在）
load_dotenv()


def _get_bool(key: str, default: bool = False) -> bool:
    value = os.getenv(key)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def _get_int(key: str, default: int) -> int:
    value = os.getenv(key)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


# ===== 基础配置 =====
APP_NAME: str = "mingjian-agent-backend"
DATA_DIR: str = os.getenv("DATA_DIR", "../data")

# 前端允许的跨域来源
_frontends = os.getenv("FRONTEND_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
FRONTEND_ORIGINS: list[str] = [o.strip() for o in _frontends.split(",") if o.strip()]

# ===== LLM 配置（Phase 5 使用，当前阶段不调用） =====
LLM_ENABLED: bool = _get_bool("LLM_ENABLED", False)
LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "")
LLM_MODEL: str = os.getenv("LLM_MODEL", "")
LLM_TIMEOUT_SECONDS: int = _get_int("LLM_TIMEOUT_SECONDS", 20)


def get_data_path(filename: str) -> Path:
    """获取 data 目录下指定文件的绝对路径。

    DATA_DIR 是相对于 backend/ 的路径（默认 ../data），
    需要基于 backend/ 目录解析为绝对路径。
    """
    backend_dir = Path(__file__).resolve().parent.parent
    data_dir = (backend_dir / DATA_DIR).resolve()
    return data_dir / filename
