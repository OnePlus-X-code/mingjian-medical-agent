"""恢复 demo 数据基线脚本。

用法：
    cd backend
    python -m scripts.reset_demo_data
    或
    python scripts/reset_demo_data.py

效果：
    1. manual_actions.json 只保留 MA001-MA005
    2. review_cases.json 中 SC006-SC010 的 current_status 恢复为 pending
    3. SC001-SC005 的 current_status 与 MA001-MA005 同步
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# 确保 backend 目录在 path 中
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import get_data_path

# MA001-MA005 对应的 current_status 映射
STATUS_MAP = {
    "SC001": "rejected",      # MA005 reject
    "SC002": "rejected",      # MA004 reject
    "SC003": "manual_review", # MA003 manual_review
    "SC004": "approved",      # MA001 approve
    "SC005": "rejected",      # MA002 reject
}


def reset():
    """执行数据重置。"""
    # 1. 截断 manual_actions.json，只保留 MA001-MA005
    ma_path = get_data_path("manual_actions.json")
    with ma_path.open("r", encoding="utf-8-sig") as f:
        actions = json.load(f)

    kept = [a for a in actions if a.get("action_id", "") in (
        "MA001", "MA002", "MA003", "MA004", "MA005"
    )]

    with ma_path.open("w", encoding="utf-8") as f:
        json.dump(kept, f, ensure_ascii=False, indent=2)
    print(f"manual_actions.json: 保留 {len(kept)} 条 (MA001-MA005)")

    # 2. 同步 review_cases.json 的 current_status
    rc_path = get_data_path("review_cases.json")
    with rc_path.open("r", encoding="utf-8-sig") as f:
        cases = json.load(f)

    for case in cases:
        cid = case.get("case_id", "")
        if cid in STATUS_MAP:
            case["current_status"] = STATUS_MAP[cid]
        elif cid.startswith("SC"):
            # SC006-SC010 恢复为 pending
            case["current_status"] = "pending"

    with rc_path.open("w", encoding="utf-8") as f:
        json.dump(cases, f, ensure_ascii=False, indent=2)
    print(f"review_cases.json: {len(cases)} 条病例状态已同步")

    # 3. 打印摘要
    for case in cases:
        print(f"  {case['case_id']}: {case['current_status']}")


if __name__ == "__main__":
    reset()
