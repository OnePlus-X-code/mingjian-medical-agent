"""ReviewService — 病例列表与详情查询。"""

from __future__ import annotations

from typing import Any, Optional

from app.services.data_store import read_json


def _matches_status(case: dict, status: str) -> bool:
    """状态筛选：同时支持 light_status 和 current_status。"""
    if status in ("green", "yellow", "red"):
        return case.get("light_status") == status
    if status in ("pending", "approved", "rejected", "manual_review"):
        return case.get("current_status") == status
    return True


def _matches_keyword(case: dict, keyword: str) -> bool:
    """关键词模糊搜索：在多个文本字段中匹配。"""
    k = keyword.strip().lower()
    if not k:
        return True

    haystack = " ".join(
        str(case.get(field, "") or "")
        for field in (
            "case_id",
            "hospital_name",
            "department",
            "procedure_or_item",
            "trigger_rule",
            "main_diagnosis",
        )
    ).lower()
    return k in haystack


def list_review_cases(
    status: Optional[str] = None,
    hospital: Optional[str] = None,
    department: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
) -> dict:
    """获取复核案例列表。

    Returns:
        { total, page, page_size, items }
    """
    cases = read_json("review_cases.json")
    if not isinstance(cases, list):
        cases = []

    # 筛选
    filtered = []
    for case in cases:
        if status and status != "all" and not _matches_status(case, status):
            continue
        if hospital and hospital != "all" and case.get("hospital_name") != hospital:
            continue
        if department and department != "all" and case.get("department") != department:
            continue
        if keyword and not _matches_keyword(case, keyword):
            continue
        filtered.append(case)

    # 分页
    total = len(filtered)
    # 保证 page 和 page_size 为正整数
    page = max(1, page)
    page_size = max(1, page_size)
    start = (page - 1) * page_size
    end = start + page_size
    items = filtered[start:end]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }


def get_review_case_by_id(case_id: str) -> Optional[dict]:
    """获取单条案例详情。

    从 review_cases.json 查找病例，
    并从 manual_actions.json 关联 history_actions。

    Returns:
        完整病例 dict（含 history_actions），找不到返回 None
    """
    cases = read_json("review_cases.json")
    if not isinstance(cases, list):
        return None

    case = next((c for c in cases if c.get("case_id") == case_id), None)
    if case is None:
        return None

    # 关联历史动作
    history_actions = _get_history_actions(case_id)
    case["history_actions"] = history_actions

    return case


def _get_history_actions(case_id: str) -> list[dict]:
    """从 manual_actions.json 中按 case_id 关联历史动作。"""
    try:
        actions = read_json("manual_actions.json")
    except (FileNotFoundError, ValueError):
        return []

    if not isinstance(actions, list):
        return []

    # 按 created_at 降序排列
    matched = [a for a in actions if a.get("case_id") == case_id]
    matched.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return matched
