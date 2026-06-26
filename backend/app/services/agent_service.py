"""Agent 复核服务 — 读取病例、匹配案例、调用 LLM 或规则兜底。"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import LLM_ENABLED
from app.services.data_store import read_json, write_json
from app.services import llm_client

logger = logging.getLogger(__name__)


def review_one(case_id: str) -> tuple[dict, str]:
    """Agent 复核主流程。

    Returns:
        (review_case, message)
        message = "agent review completed by llm" or
                  "agent review completed by fallback rules"

    Raises:
        ValueError: case not found
    """
    # 1. 查找病例
    case = _find_case(case_id)
    if case is None:
        raise ValueError("case not found")

    # 2. 匹配历史申诉案例
    matched_cases = _match_appeal_cases(case)

    # 3. 读取医院画像
    hospital_profile = _get_hospital_profile(case)

    # 4. 尝试 LLM 或规则兜底
    use_llm = False
    llm_result = None

    if LLM_ENABLED:
        try:
            llm_result = _call_llm(case, matched_cases, hospital_profile)
            use_llm = True
            logger.info("LLM review succeeded for case %s", case_id)
        except Exception as e:
            logger.warning(
                "LLM review failed for case %s, falling back to rules: %s",
                case_id, e,
            )

    if not use_llm:
        llm_result = _rule_based_fallback(case, matched_cases, hospital_profile)

    # 5. 合并结果到 case
    case["light_status"] = llm_result["light_status"]
    case["confidence"] = llm_result["confidence"]
    case["suggested_action"] = llm_result["suggested_action"]
    case["agent_reason"] = llm_result["agent_reason"]
    case["evidence_chain"] = llm_result["evidence_chain"]
    case["matched_cases"] = matched_cases
    case["reviewed_at"] = _now_str()

    # 6. 写回 review_cases.json
    _write_back_case(case_id, case)

    # 7. 关联历史动作
    case["history_actions"] = _get_history_actions(case_id)

    message = (
        "agent review completed by llm"
        if use_llm
        else "agent review completed by fallback rules"
    )
    return case, message


# ── 病例查找 ──────────────────────────────────────────

def _find_case(case_id: str) -> Optional[dict]:
    """查找病例，优先 suspect_cases，其次 review_cases。"""
    # 1. 尝试 suspect_cases
    try:
        suspects = read_json("suspect_cases.json")
        if isinstance(suspects, list):
            case = next(
                (c for c in suspects if c.get("case_id") == case_id), None
            )
            if case is not None:
                return case
    except (FileNotFoundError, ValueError):
        pass

    # 2. 尝试 review_cases
    try:
        cases = read_json("review_cases.json")
        if isinstance(cases, list):
            case = next(
                (c for c in cases if c.get("case_id") == case_id), None
            )
            if case is not None:
                return case
    except (FileNotFoundError, ValueError):
        pass

    return None


# ── 申诉案例匹配 ──────────────────────────────────────

def _match_appeal_cases(case: dict) -> list[dict]:
    """匹配 Top 3 相似申诉案例。

    使用多维加权评分：同医院、同科室、诊断关键词、项目关键词、
    命中规则、risk_reason 与 appeal_reason 关键词重合、历史申诉结果。

    如果 score=0（完全无关联），不硬塞无关案例。
    只有当匹配结果为空时，才 fallback 到 case 中预写的 matched_cases。
    """
    try:
        appeals = read_json("appeal_cases.json")
    except (FileNotFoundError, ValueError):
        appeals = []

    if not isinstance(appeals, list) or not appeals:
        return case.get("matched_cases", []) or []

    # 计算评分
    scored = []
    for appeal in appeals:
        score = _score_appeal(case, appeal)
        if score > 0:
            scored.append((appeal, score))

    if not scored:
        # 没有匹配到，使用 case 中已有的 matched_cases
        return case.get("matched_cases", []) or []

    # 按分数排序，取 Top 3
    scored.sort(key=lambda x: x[1], reverse=True)
    top3 = scored[:3]

    # 归一化：最高分映射到 0.98，其余按比例
    max_score = top3[0][1] if top3 else 1

    result = []
    for appeal, score in top3:
        similarity = min(score / max_score, 0.98) if max_score > 0 else 0
        similarity = max(similarity, 0.1)  # 最低 0.1 避免显示 0
        result.append({
            "appeal_id": appeal.get("appeal_id", ""),
            "similarity": round(similarity, 2),
            "case_type": appeal.get("case_type", _determine_case_type(appeal)),
            "review_result": appeal.get("review_result", _determine_review_result(appeal)),
            "summary": appeal.get("summary", appeal.get("appeal_reason", "")),
        })

    return result


def _score_appeal(case: dict, appeal: dict) -> int:
    """计算申诉案例与当前病例的匹配分数。

    评分维度（总分最高 125）：
    - 同医院：+10
    - 同科室：+20
    - 诊断关键词重合：+25
    - 项目/处方关键词重合：+25
    - 命中规则相似：+20
    - risk_reason 与 appeal_reason/summary 关键词重合：+20
    - 历史申诉成功：+5
    """
    score = 0

    # 同医院 +10
    case_hospital = case.get("hospital_name", "")
    appeal_hospital = appeal.get("hospital_name", appeal.get("appellant", ""))
    if case_hospital and appeal_hospital and case_hospital == appeal_hospital:
        score += 10

    # 同科室 +20
    case_dept = case.get("department", "")
    appeal_dept = appeal.get("department", "")
    if case_dept and appeal_dept and case_dept == appeal_dept:
        score += 20

    # 诊断关键词重合 +25
    case_diagnosis = case.get("main_diagnosis", "")
    appeal_text = (
        appeal.get("appeal_reason", "")
        + " " + appeal.get("summary", "")
        + " " + appeal.get("main_diagnosis", "")
    )
    if case_diagnosis and _keyword_overlap(case_diagnosis, appeal_text):
        score += 25

    # 项目/处方关键词重合 +25
    case_item = case.get("procedure_or_item", "")
    appeal_item_text = (
        appeal.get("procedure_or_item", "")
        + " " + appeal.get("appeal_reason", "")
        + " " + appeal.get("summary", "")
    )
    if case_item and _keyword_overlap(case_item, appeal_item_text):
        score += 25

    # 命中规则相似 +20
    case_rule = case.get("trigger_rule", "")
    appeal_rule = appeal.get("trigger_rule", appeal.get("suspect_type", ""))
    if case_rule and appeal_rule and _keyword_overlap(case_rule, appeal_rule):
        score += 20

    # risk_reason 与 appeal_reason/summary 关键词重合 +20
    risk_reason = case.get("risk_reason", "")
    appeal_reason_text = (
        appeal.get("appeal_reason", "")
        + " " + appeal.get("summary", "")
    )
    if risk_reason and _keyword_overlap(risk_reason, appeal_reason_text):
        score += 20

    # 历史申诉成功 +5
    review_result = appeal.get("review_result", appeal.get("status", ""))
    if "success" in str(review_result).lower() or "成功" in str(review_result):
        score += 5

    return score


def _keyword_overlap(text1: str, text2: str) -> bool:
    """检查两个文本是否有关键词重合（2字以上子串）。"""
    if not text1 or not text2:
        return False
    for i in range(len(text1) - 1):
        sub = text1[i:i + 2]
        if sub in text2:
            return True
    return False


def _determine_case_type(appeal: dict) -> str:
    """根据申诉状态判断案例类型。"""
    status = appeal.get("status", "")
    if "成功" in status or "success" in status.lower():
        return "成功申诉"
    if "打回" in status or "reject" in status.lower():
        return "打回案例"
    return "人工复核案例"


def _determine_review_result(appeal: dict) -> str:
    """根据申诉状态判断复核结果。"""
    status = appeal.get("status", "")
    if "成功" in status or "success" in status.lower():
        return "success"
    if "打回" in status or "reject" in status.lower():
        return "reject"
    return "manual_review"


# ── 医院画像 ─────────────────────────────────────────

def _get_hospital_profile(case: dict) -> dict:
    """读取医院画像。"""
    try:
        profiles = read_json("hospital_profiles.json")
    except (FileNotFoundError, ValueError):
        return {}

    if not isinstance(profiles, list):
        return {}

    hospital_name = case.get("hospital_name", "")
    profile = next(
        (p for p in profiles if p.get("name") == hospital_name
         or p.get("hospital_name") == hospital_name),
        None,
    )
    if profile:
        logger.info(
            "Hospital profile matched: %s → %s (risk_level=%s, violations=%s)",
            hospital_name,
            profile.get("hospital_name", profile.get("name", "")),
            profile.get("risk_level", "N/A"),
            profile.get("historical_violation_count",
                       profile.get("violation_count", "N/A")),
        )
    else:
        logger.warning("Hospital profile NOT found for: %s", hospital_name)
    return profile or {}


# ── LLM 调用 ─────────────────────────────────────────

def _call_llm(case: dict, matched_cases: list, hospital_profile: dict) -> dict:
    """调用 LLM 进行复核。"""
    prompt = _build_prompt(case, matched_cases, hospital_profile)
    return llm_client.call_llm(prompt)


def _build_prompt(case: dict, matched_cases: list, hospital_profile: dict) -> str:
    """构建 LLM prompt。"""
    # 读取 prompt 模板
    prompt_path = _get_prompt_path()
    with prompt_path.open("r", encoding="utf-8") as f:
        template = f.read()

    # 准备 case 的简化 JSON（不传敏感字段）
    case_brief = {
        "case_id": case.get("case_id"),
        "hospital_name": case.get("hospital_name"),
        "department": case.get("department"),
        "drg_group": case.get("drg_group"),
        "main_diagnosis": case.get("main_diagnosis"),
        "procedure_or_item": case.get("procedure_or_item"),
        "cost": case.get("cost"),
        "trigger_rule": case.get("trigger_rule"),
        "risk_reason": case.get("risk_reason"),
        "patient_summary": case.get("patient_summary"),
    }

    prompt = template.replace(
        "{{case_json}}",
        json.dumps(case_brief, ensure_ascii=False, indent=2),
    )
    prompt = prompt.replace(
        "{{matched_cases_json}}",
        json.dumps(matched_cases, ensure_ascii=False, indent=2),
    )
    prompt = prompt.replace(
        "{{hospital_profile_json}}",
        json.dumps(hospital_profile, ensure_ascii=False, indent=2),
    )

    return prompt


def _get_prompt_path() -> Path:
    """获取 prompt 模板路径。"""
    # __file__ = backend/app/services/agent_service.py
    # parent = backend/app/services/
    # parent.parent = backend/app/
    app_dir = Path(__file__).resolve().parent.parent
    return app_dir / "prompts" / "review_case_prompt.md"


# ── 规则兜底 ─────────────────────────────────────────

def _rule_based_fallback(
    case: dict, matched_cases: list, hospital_profile: dict | None = None,
) -> dict:
    """规则兜底生成复核结果。

    基于 matched_cases 的成功/失败比例、risk_reason 高风险关键词、
    医院画像风险等级，动态生成 light_status / confidence / suggested_action / agent_reason。
    不再简单读取 suspect_cases 中预写的值。
    """
    risk_reason = case.get("risk_reason", "")
    patient_summary = case.get("patient_summary", "")
    trigger_rule = case.get("trigger_rule", "")

    # 统计 matched_cases 成功/失败
    success_count = sum(
        1 for m in matched_cases
        if m.get("review_result") == "success"
    )
    reject_count = sum(
        1 for m in matched_cases
        if m.get("review_result") == "reject"
    )
    total_matched = len(matched_cases)

    # 高风险关键词（在 risk_reason、patient_summary、trigger_rule 中搜索）
    high_risk_keywords = [
        "无适应症", "非必需", "过度", "未记录", "重复计费",
        "高套", "不匹配", "不一致", "缺乏", "无记录",
        "无需", "指南偏差",
    ]
    combined_text = risk_reason + " " + patient_summary + " " + trigger_rule
    high_risk_hits = [
        kw for kw in high_risk_keywords if kw in combined_text
    ]

    # 医院画像风险
    hospital_risk = ""
    if hospital_profile:
        hospital_risk = hospital_profile.get("risk_level", "")
    hospital_name = case.get("hospital_name", "")

    # ── 判断逻辑 ──

    if reject_count >= 1 and len(high_risk_hits) >= 1:
        # 命中高风险关键词 + 有打回案例 → 红灯
        light_status = "red"
        suggested_action = "reject"
        confidence = 0.85 + min(len(high_risk_hits) * 0.02, 0.07)

        matched_desc = (
            f"匹配到 {total_matched} 条相似案例，其中 {reject_count} 条被申诉驳回。"
            if total_matched > 0 else "未匹配到相似案例。"
        )
        hospital_desc = (
            f"{hospital_name}（{hospital_risk}风险，历史违规"
            f"{hospital_profile.get('historical_violation_count', 'N/A')}次）。"
            if hospital_profile else ""
        )
        agent_reason = (
            f"DRG初筛命中「{trigger_rule}」，risk_reason 含高风险关键词"
            f"（{ '、'.join(high_risk_hits[:3])}）。{matched_desc}{hospital_desc}"
            f"综合判断建议打回。"
        )

    elif success_count >= 2 and not high_risk_hits:
        # 多条成功申诉 + 无高风险关键词 → 绿灯
        light_status = "green"
        suggested_action = "approve"
        confidence = 0.80 + min(success_count * 0.03, 0.10)

        matched_desc = (
            f"匹配到 {total_matched} 条相似案例，其中 {success_count} 条申诉成功。"
            if total_matched > 0 else ""
        )
        hospital_desc = (
            f"{hospital_name}（{hospital_risk}风险）。"
            if hospital_profile else ""
        )
        agent_reason = (
            f"DRG初筛命中「{trigger_rule}」，但 {matched_desc}{hospital_desc}"
            f"病例信息可解释命中规则，综合判断建议放行。"
        )

    else:
        # 其他情况 → 黄灯
        light_status = "yellow"
        suggested_action = "manual_review"
        confidence = 0.60 + min(
            (success_count * 0.05) + (len(high_risk_hits) * 0.03), 0.15
        )

        matched_desc = (
            f"匹配到 {total_matched} 条案例"
            f"（成功{success_count} / 驳回{reject_count}）。"
            if total_matched > 0 else "未匹配到相似案例。"
        )
        hospital_desc = (
            f"{hospital_name}（{hospital_risk}风险）。"
            if hospital_profile else ""
        )
        risk_desc = (
            f"含高风险关键词（{'、'.join(high_risk_hits[:2])}）。"
            if high_risk_hits else ""
        )
        agent_reason = (
            f"DRG初筛命中「{trigger_rule}」。{matched_desc}{hospital_desc}{risk_desc}"
            f"证据不足以自动放行或打回，建议人工复核。"
        )

    # 生成证据链
    evidence_chain = _build_evidence_chain(
        case, matched_cases, hospital_profile,
        light_status, suggested_action,
    )

    return {
        "light_status": light_status,
        "confidence": round(confidence, 2),
        "suggested_action": suggested_action,
        "agent_reason": agent_reason,
        "evidence_chain": evidence_chain,
    }


def _build_evidence_chain(
    case: dict, matched_cases: list,
    hospital_profile: dict | None = None,
    light_status: str = "", suggested_action: str = "",
) -> list[dict]:
    """生成证据链。

    包含：DRG初筛 → 病历关键点 → 相似申诉案例匹配 → 医院画像参考 → 复核建议。
    """
    chain = []

    # 1. DRG初筛命中
    chain.append({
        "step": "DRG初筛命中",
        "content": (
            f"病例因「{case.get('trigger_rule', '未知规则')}」被标记，"
            f"涉及金额 {case.get('cost', 0)} 元。"
        ),
        "source": "DRG规则引擎",
    })

    # 2. 病历关键点提取
    summary = case.get("patient_summary", "无病历摘要")
    chain.append({
        "step": "病历关键点提取",
        "content": summary[:200] if len(summary) > 200 else summary,
        "source": "脱敏病例摘要",
    })

    # 3. 历史申诉案例匹配
    if matched_cases:
        top_sim = matched_cases[0].get("similarity", 0) if matched_cases else 0
        success_n = sum(1 for m in matched_cases if m.get("review_result") == "success")
        reject_n = sum(1 for m in matched_cases if m.get("review_result") == "reject")
        chain.append({
            "step": "相似申诉案例匹配",
            "content": (
                f"匹配到 {len(matched_cases)} 条相似申诉案例，"
                f"最高相似度 {top_sim * 100:.0f}%。"
                f"（成功 {success_n} 条 / 驳回 {reject_n} 条）"
            ),
            "source": "历史申诉案例库",
        })
    else:
        chain.append({
            "step": "相似申诉案例匹配",
            "content": "未匹配到相似申诉案例。",
            "source": "历史申诉案例库",
        })

    # 4. 医院画像参考
    if hospital_profile:
        chain.append({
            "step": "医院画像参考",
            "content": (
                f"{hospital_profile.get('hospital_name', hospital_profile.get('name', ''))}，"
                f"等级 {hospital_profile.get('hospital_level', hospital_profile.get('level', 'N/A'))}，"
                f"风险等级 {hospital_profile.get('risk_level', 'N/A')}，"
                f"历史违规 {hospital_profile.get('historical_violation_count', hospital_profile.get('violation_count', 'N/A'))} 次，"
                f"申诉成功率 {hospital_profile.get('appeal_success_rate', 'N/A')}。"
            ),
            "source": "医院画像库",
        })
    else:
        chain.append({
            "step": "医院画像参考",
            "content": "未找到该医院的画像信息。",
            "source": "医院画像库",
        })

    # 5. 复核建议生成
    action_map = {
        "approve": "建议放行",
        "reject": "建议打回",
        "manual_review": "建议人工复核",
    }
    light_map = {"green": "绿灯", "yellow": "黄灯", "red": "红灯"}
    suggestion = action_map.get(suggested_action, "建议人工复核")
    light_label = light_map.get(light_status, "黄灯")
    chain.append({
        "step": "复核建议生成",
        "content": f"综合 DRG 初筛、相似案例匹配、医院画像后，判定为{light_label}，{suggestion}。",
        "source": "Agent",
    })

    return chain


# ── 写回 review_cases.json ───────────────────────────

def _write_back_case(case_id: str, updated_case: dict) -> None:
    """将更新后的病例写回 review_cases.json。

    保留 current_status 不被覆盖。
    """
    cases = read_json("review_cases.json")
    if not isinstance(cases, list):
        cases = []

    found = False
    for i, c in enumerate(cases):
        if c.get("case_id") == case_id:
            # 保留 current_status
            current_status = c.get("current_status", "pending")
            updated_case["current_status"] = current_status
            cases[i] = updated_case
            found = True
            break

    if not found:
        # 新增病例
        updated_case.setdefault("current_status", "pending")
        cases.append(updated_case)

    write_json("review_cases.json", cases)


# ── 历史动作 ─────────────────────────────────────────

def _get_history_actions(case_id: str) -> list[dict]:
    """从 manual_actions.json 中按 case_id 关联历史动作。"""
    try:
        actions = read_json("manual_actions.json")
    except (FileNotFoundError, ValueError):
        return []

    if not isinstance(actions, list):
        return []

    matched = [a for a in actions if a.get("case_id") == case_id]
    matched.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return matched


# ── 工具函数 ─────────────────────────────────────────

def _now_str() -> str:
    """当前时间，格式 YYYY-MM-DD HH:MM:SS。"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ── DRG 疑点同步 ─────────────────────────────────────

def normalize_suspect_case(suspect: dict) -> dict:
    """将 DRG 系统输出的疑点病例转换为 ReviewCase 格式。

    兼容旧格式（hospital, suspect_type, total_cost 等）和新格式
    （hospital_name, trigger_rule, cost 等）。
    """
    case_id = suspect.get("case_id", "")
    hospital_name = suspect.get("hospital_name") or suspect.get("hospital", "")
    department = suspect.get("department", "")
    trigger_rule = (
        suspect.get("trigger_rule")
        or suspect.get("suspect_type", "未知规则")
    )
    cost = suspect.get("cost") or suspect.get("total_cost", 0)
    risk_reason = (
        suspect.get("risk_reason")
        or suspect.get("description", "")
    )
    patient_summary = (
        suspect.get("patient_summary")
        or suspect.get("description", "无病历摘要")
    )
    main_diagnosis = suspect.get("main_diagnosis", "")
    procedure_or_item = suspect.get("procedure_or_item", "")
    drg_group = suspect.get("drg_group", "")

    # 如果 main_diagnosis 或 procedure_or_item 为空，从 risk_reason 中提取
    if not main_diagnosis and risk_reason:
        main_diagnosis = risk_reason.split("，")[0] if "，" in risk_reason else risk_reason[:20]
    if not procedure_or_item:
        procedure_or_item = trigger_rule

    return {
        "case_id": case_id,
        "hospital_name": hospital_name,
        "department": department,
        "drg_group": drg_group,
        "main_diagnosis": main_diagnosis,
        "procedure_or_item": procedure_or_item,
        "cost": cost,
        "trigger_rule": trigger_rule,
        "risk_reason": risk_reason,
        "patient_summary": patient_summary,
        "light_status": "yellow",
        "confidence": 0.0,
        "suggested_action": "manual_review",
        "agent_reason": "",
        "evidence_chain": [],
        "matched_cases": [],
        "reviewed_at": "",
        "current_status": "pending",
    }


def refresh_drg_cases(limit: int = 3) -> tuple[list[dict], int, int]:
    """同步 DRG 疑点并执行 Agent 分析。

    Returns:
        (imported_items, imported_count, skipped_count)
    """
    # 1. 读取 suspect_cases 和 review_cases
    suspects = read_json("suspect_cases.json")
    if not isinstance(suspects, list):
        suspects = []

    review_cases = read_json("review_cases.json")
    if not isinstance(review_cases, list):
        review_cases = []

    # 2. 找出已存在的 case_id
    existing_ids = {c.get("case_id") for c in review_cases if c.get("case_id")}

    # 3. 筛选新增疑点
    new_suspects = [
        s for s in suspects
        if s.get("case_id") and s["case_id"] not in existing_ids
    ]

    skipped_count = len(suspects) - len(new_suspects)

    # 4. 最多处理 limit 条
    to_process = new_suspects[:limit]
    imported_items: list[dict] = []

    for suspect in to_process:
        try:
            case = normalize_suspect_case(suspect)

            # 匹配历史申诉案例
            matched_cases = _match_appeal_cases(case)

            # 读取医院画像
            hospital_profile = _get_hospital_profile(case)

            # Agent 分析：LLM 或规则兜底
            use_llm = False
            llm_result = None

            if LLM_ENABLED:
                try:
                    llm_result = _call_llm(case, matched_cases, hospital_profile)
                    use_llm = True
                except Exception as e:
                    logger.warning(
                        "LLM review failed for %s during DRG sync, "
                        "falling back to rules: %s",
                        case["case_id"], e,
                    )

            if not use_llm:
                llm_result = _rule_based_fallback(case, matched_cases, hospital_profile)

            # 合并 Agent 结果
            case["light_status"] = llm_result["light_status"]
            case["confidence"] = llm_result["confidence"]
            case["suggested_action"] = llm_result["suggested_action"]
            case["agent_reason"] = llm_result["agent_reason"]
            case["evidence_chain"] = llm_result["evidence_chain"]
            case["matched_cases"] = matched_cases
            case["reviewed_at"] = _now_str()

            imported_items.append(case)

        except Exception as e:
            logger.error(
                "Failed to process suspect %s: %s",
                suspect.get("case_id", "unknown"), e,
            )

    # 5. 写入 review_cases.json（不重复）
    if imported_items:
        review_cases.extend(imported_items)
        write_json("review_cases.json", review_cases)

    imported_count = len(imported_items)
    return imported_items, imported_count, skipped_count
