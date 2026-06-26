"""反馈服务 — 获取近期人工反馈记录。"""

from __future__ import annotations

from app.services.data_store import read_json


def get_recent_feedbacks(limit: int = 5) -> list[dict]:
    """获取近期人工反馈记录。

    从 data/manual_actions.json 读取，按 created_at 倒序排列。

    Args:
        limit: 返回数量，默认 5

    Returns:
        ManualAction dict 列表
    """
    try:
        actions = read_json("manual_actions.json")
    except (FileNotFoundError, ValueError):
        return []

    if not isinstance(actions, list):
        return []

    # 按 created_at 倒序排列
    sorted_actions = sorted(
        actions,
        key=lambda x: x.get("created_at", ""),
        reverse=True,
    )

    # 限制数量
    return sorted_actions[:limit]
