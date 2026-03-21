from __future__ import annotations

import json
import re
from typing import Any


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def humanize_number(value: float | int | None) -> str:
    if value is None:
        return "0"
    num = float(value)
    if abs(num) >= 10000000:
        return f"{num / 10000000:.2f}Cr"
    if abs(num) >= 100000:
        return f"{num / 100000:.2f}L"
    if abs(num) >= 1000:
        return f"{num / 1000:.1f}K"
    return f"{num:.0f}"


def extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if not match:
            raise
        return json.loads(match.group(0))
