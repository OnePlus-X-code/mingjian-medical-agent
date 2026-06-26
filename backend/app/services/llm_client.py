"""LLM 客户端 — OpenAI-compatible API 调用封装。"""

from __future__ import annotations

import json
import logging
import re

from app.config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL, LLM_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    """检查 LLM 配置是否完整（不检查 LLM_ENABLED）。"""
    return bool(LLM_API_KEY and LLM_BASE_URL and LLM_MODEL)


def call_llm(prompt: str) -> dict:
    """调用大模型 API，返回解析后的 JSON dict。

    Args:
        prompt: 完整的 user prompt 文本

    Returns:
        解析后的 dict，包含 light_status, confidence, suggested_action,
        agent_reason, evidence_chain

    Raises:
        RuntimeError: 配置不完整、调用失败、返回格式错误等
    """
    if not is_configured():
        raise RuntimeError("LLM configuration incomplete: API_KEY / BASE_URL / MODEL missing")

    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai package not installed")

    try:
        client = OpenAI(
            api_key=LLM_API_KEY,
            base_url=LLM_BASE_URL,
            timeout=LLM_TIMEOUT_SECONDS,
        )

        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是医保基金监管场景下的智能复核助手。"
                        "请严格根据输入信息判断，只输出JSON，"
                        "不要输出Markdown、代码块标记或解释性前缀。"
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content
        if not content or not content.strip():
            raise RuntimeError("LLM returned empty content")

        # 清理可能的 markdown 代码块标记
        content = content.strip()
        if content.startswith("```"):
            # 移除 ```json 或 ``` 前缀
            lines = content.split("\n")
            if lines[0].strip().startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            content = "\n".join(lines).strip()

        result = json.loads(content)

        # 校验返回字段
        _validate_llm_result(result)

        logger.info("LLM call succeeded, model=%s", LLM_MODEL)
        return result

    except json.JSONDecodeError as e:
        logger.warning("LLM returned non-JSON: %s", e)
        raise RuntimeError("LLM returned non-JSON content")
    except Exception as e:
        # 清理错误信息中的 API Key
        error_msg = str(e)
        if LLM_API_KEY and LLM_API_KEY in error_msg:
            error_msg = error_msg.replace(LLM_API_KEY, "***REDACTED***")
        logger.warning("LLM call failed: %s", error_msg)
        raise RuntimeError(f"LLM call failed: {type(e).__name__}")


def _validate_llm_result(result: dict) -> None:
    """校验 LLM 返回的字段完整性和枚举合法性。

    Raises:
        RuntimeError: 字段缺失或枚举值非法
    """
    if not isinstance(result, dict):
        raise RuntimeError("LLM result is not a dict")

    required_fields = [
        "light_status",
        "confidence",
        "suggested_action",
        "agent_reason",
        "evidence_chain",
    ]
    for field in required_fields:
        if field not in result:
            raise RuntimeError(f"LLM result missing field: {field}")

    if result["light_status"] not in ("green", "yellow", "red"):
        raise RuntimeError(f"Invalid light_status: {result['light_status']}")

    if result["suggested_action"] not in ("approve", "reject", "manual_review"):
        raise RuntimeError(f"Invalid suggested_action: {result['suggested_action']}")

    conf = result["confidence"]
    if not isinstance(conf, (int, float)):
        # 尝试转换为 float
        try:
            result["confidence"] = float(conf)
        except (ValueError, TypeError):
            raise RuntimeError(f"Invalid confidence type: {type(conf)}")
    else:
        # 确保在 0-1 范围
        result["confidence"] = max(0.0, min(1.0, float(conf)))

    if not isinstance(result["agent_reason"], str):
        raise RuntimeError("agent_reason is not a string")

    if not isinstance(result["evidence_chain"], list):
        raise RuntimeError("evidence_chain is not a list")

    # 校验 evidence_chain 每项
    for item in result["evidence_chain"]:
        if not isinstance(item, dict):
            raise RuntimeError("evidence_chain item is not a dict")
        if "step" not in item or "content" not in item:
            raise RuntimeError("evidence_chain item missing step or content")
        item.setdefault("source", "Agent")
