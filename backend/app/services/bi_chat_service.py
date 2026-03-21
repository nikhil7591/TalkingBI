from __future__ import annotations

import json
import os
from typing import Any

from openai import OpenAI


class BiChatService:
    """Context-aware BI chatbot restricted to dashboard/KPI context."""

    def __init__(self) -> None:
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-5.4-mini-2026-03-17")
        self.client: OpenAI | None = None

    def _get_client(self) -> OpenAI | None:
        if self.client is not None:
            return self.client

        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not openai_key:
            return None

        self.client = OpenAI(api_key=openai_key)
        return self.client

    def _trim_chart_data(self, charts: list[dict[str, Any]], max_rows_per_chart: int = 10) -> list[dict[str, Any]]:
        compact: list[dict[str, Any]] = []
        for chart in charts[:10]:
            if not isinstance(chart, dict):
                continue
            compact.append(
                {
                    "id": chart.get("id"),
                    "title": chart.get("title"),
                    "type": chart.get("type"),
                    "xAxis": chart.get("xAxis"),
                    "yAxis": chart.get("yAxis"),
                    "groupBy": chart.get("groupBy"),
                    "data": (chart.get("data") or [])[:max_rows_per_chart],
                }
            )
        return compact

    def answer(
        self,
        question: str,
        kpi: str,
        dashboard_spec: dict[str, Any],
        user_name: str | None = None,
    ) -> dict[str, Any]:
        if not question.strip():
            return {"answer": "Please ask a specific KPI question.", "sources": []}

        title = str(dashboard_spec.get("title") or "Dashboard")
        focus = str(dashboard_spec.get("focus") or "analysis")
        insight = str(dashboard_spec.get("insightText") or "")
        kpi_cards = dashboard_spec.get("kpiCards") or []
        charts = dashboard_spec.get("charts") or []

        compact_context = {
            "title": title,
            "focus": focus,
            "kpi": kpi,
            "insightText": insight,
            "kpiCards": kpi_cards[:6],
            "charts": self._trim_chart_data(charts),
        }

        client = self._get_client()
        if not client:
            fallback = (
                "I cannot access the language model right now. "
                "Please verify OPENAI_API_KEY and try again."
            )
            return {
                "answer": fallback,
                "sources": [
                    "kpiCards",
                    "charts",
                ],
            }

        persona = user_name.strip() if user_name and user_name.strip() else "there"

        prompt = f"""You are a personalized BI chatbot assistant for user '{persona}'.
You only know the dashboard context below.
Do not answer from outside assumptions.
If context is missing, say exactly what is missing.

Rules:
1) Keep answer practical and data-grounded.
2) If asked "why" (e.g., "Why did sales drop in March?"), explain likely driver from available chart/KPI patterns.
3) Mention exact fields/values from context when possible.
4) End with one short next-step recommendation.
5) Max 120 words.

Question:
{question}

Context JSON:
{json.dumps(compact_context, ensure_ascii=True)}
"""

        try:
            response = client.chat.completions.create(
                model=self.openai_model,
                messages=[
                    {"role": "system", "content": "You are a concise BI analyst chatbot."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_completion_tokens=260,
            )
            message = ""
            if response.choices and response.choices[0].message.content:
                message = response.choices[0].message.content.strip()

            if not message:
                message = "I could not generate an answer from the provided dashboard context."

            return {
                "answer": message,
                "sources": ["kpiCards", "charts", "insightText"],
            }
        except Exception as exc:
            return {
                "answer": f"I hit an error while analyzing this dashboard context: {exc}",
                "sources": ["kpiCards", "charts", "insightText"],
            }


bi_chat_service = BiChatService()
