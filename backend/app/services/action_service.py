"""人工动作服务 — 提交动作、写入 JSON、同步 review_cases。"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from app.services.data_store import read_json, write_json


def _next_action_id(existing_actions: list[dict]) -> str:
    """生成下一个 action_id，格式 MA006、MA007 递增。"""
    max_num = 0
    pattern = re.compile(r"^MA(\d+)$")
    for action in existing_actions:
        action_id = action.get("action_id", "")
        match = pattern.match(action_id)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
    return f"MA{max_num + 1:03d}"


def _now_str() -> str:
    """当前时间，格式 YYYY-MM-DD HH:MM:SS。"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _human_action_to_status(human_action: str) -> str:
    """human_action 映射到 current_status。"""
    mapping = {
        "approve": "approved",
        "reject": "rejected",
        "manual_review": "manual_review",
    }
    return mapping.get(human_action, "pending")


def submit_action(
    case_id: str,
    agent_status: str,
    human_action: str,
    human_reason: Optional[str],
    operator: str,
) -> dict:
    """提交人工动作。

    业务规则：
    1. case_id 必须存在于 review_cases.json
    2. agent_status=green 且 human_action=reject 时，human_reason 必须非空
    3. 写入 manual_actions.json
    4. 同步更新 review_cases.json 中对应病例的 current_status
    5. is_agent_accepted = (human_action === suggested_action)

    Returns:
        完整的 ManualAction dict

    Raises:
        ValueError: 病例不存在或绿灯打回无理由
    """
    # 1. 读取 review_cases，校验 case_id 存在
    cases = read_json("review_cases.json")
    if not isinstance(cases, list):
        raise ValueError("case not found")

    case = next((c for c in cases if c.get("case_id") == case_id), None)
    if case is None:
        raise ValueError("case not found")

    # 2. 绿灯打回校验
    if agent_status == "green" and human_action == "reject":
        if not human_reason or not human_reason.strip():
            raise ValueError("human_reason is required when rejecting a green case")

    # 3. 计算 is_agent_accepted
    suggested_action = case.get("suggested_action", "")
    is_agent_accepted = human_action == suggested_action

    # 4. 读取现有 manual_actions，生成 action_id
    actions = read_json("manual_actions.json")
    if not isinstance(actions, list):
        actions = []

    action_id = _next_action_id(actions)
    created_at = _now_str()

    # 5. 构建新的 ManualAction 记录
    new_action = {
        "action_id": action_id,
        "case_id": case_id,
        "hospital_name": case.get("hospital_name"),
        "department": case.get("department"),
        "agent_status": agent_status,
        "human_action": human_action,
        "human_reason": human_reason,
        "operator": operator,
        "created_at": created_at,
        "is_agent_accepted": is_agent_accepted,
    }

    # 6. 追加写入 manual_actions.json
    actions.append(new_action)
    write_json("manual_actions.json", actions)

    # 7. 同步更新 review_cases.json 中对应病例的 current_status
    new_status = _human_action_to_status(human_action)
    for c in cases:
        if c.get("case_id") == case_id:
            c["current_status"] = new_status
            break
    write_json("review_cases.json", cases)

    return new_action
