"""JSON DataStore — 统一读写 data/ 目录下的 JSON 文件。"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.config import get_data_path


def get_data_filepath(filename: str) -> Path:
    """获取 data 目录下指定文件的路径。"""
    return get_data_path(filename)


def read_json(filename: str) -> Any:
    """读取 data 目录下的 JSON 文件。

    Args:
        filename: 文件名，如 "review_cases.json"

    Returns:
        解析后的 JSON 数据（通常为 list 或 dict）

    Raises:
        FileNotFoundError: 文件不存在
        ValueError: JSON 解析失败
    """
    filepath = get_data_filepath(filename)
    if not filepath.exists():
        raise FileNotFoundError(f"数据文件不存在: {filepath}")

    try:
        with filepath.open("r", encoding="utf-8-sig") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON 解析失败: {filepath} - {e}") from e


def write_json(filename: str, data: Any) -> None:
    """写入数据到 data 目录下的 JSON 文件。

    Args:
        filename: 文件名，如 "manual_actions.json"
        data: 要写入的数据

    Raises:
        OSError: 写入失败
    """
    filepath = get_data_filepath(filename)
    # 确保目录存在
    filepath.parent.mkdir(parents=True, exist_ok=True)

    try:
        with filepath.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except OSError as e:
        raise OSError(f"写入文件失败: {filepath} - {e}") from e
