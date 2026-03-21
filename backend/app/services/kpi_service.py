from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class KpiService:
    def __init__(self) -> None:
        config_path = Path(__file__).resolve().parents[1] / "config" / "kpi_mapping.json"
        with config_path.open("r", encoding="utf-8") as fp:
            self.mapping: dict[str, dict[str, Any]] = json.load(fp)

    def get_terms_from_query(self, query: str) -> list[str]:
        query_lower = query.lower()
        matched = [term for term in self.mapping if term.replace("_", " ") in query_lower or term in query_lower]
        if not matched:
            matched = ["sales", "profit", "quantity", "region"]
        return matched

    def get_candidate_datasets(self, query: str) -> list[str]:
        terms = self.get_terms_from_query(query)
        candidates: list[str] = []
        for term in terms:
            candidates.extend(self.mapping.get(term, {}).get("datasets", []))
        # Preserve order while removing duplicates.
        return list(dict.fromkeys(candidates))

    def get_columns_for_terms(self, terms: list[str]) -> list[str]:
        cols: list[str] = []
        for term in terms:
            col = self.mapping.get(term, {}).get("column")
            if col:
                cols.append(col)
        return list(dict.fromkeys(cols))


kpi_service = KpiService()
