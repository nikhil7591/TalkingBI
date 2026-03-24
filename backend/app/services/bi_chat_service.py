from __future__ import annotations

import json
import os
from typing import Any

from mem0 import Memory  # pyright: ignore[reportMissingImports]
from openai import OpenAI

mem0_client = Memory()


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

    @staticmethod
    def _is_off_topic(question: str) -> bool:
        q = question.lower().strip()
        off_topic_markers = [
            "joke",
            "funny",
            "poem",
            "story",
            "movie",
            "song",
            "roast",
            "riddle",
            "motivation",
            "quote",
        ]
        data_markers = [
            "kpi",
            "dashboard",
            "chart",
            "trend",
            "metric",
            "revenue",
            "sales",
            "value",
            "top",
            "segment",
            "region",
            "month",
        ]
        return any(m in q for m in off_topic_markers) and not any(m in q for m in data_markers)

    def answer(
        self,
        question: str,
        kpi: str,
        dashboard_spec: dict[str, Any],
        user_name: str | None = None,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        if not question.strip():
            return {"answer": "Please ask a specific KPI question.", "sources": []}

        if self._is_off_topic(question):
            return {
                "answer": "I can only answer questions related to the generated dashboard, KPI cards, chart trends, and insights. Please ask a dashboard-specific business question.",
                "sources": ["kpiCards", "charts", "insightText"],
            }

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
        resolved_user_id = (user_id or "anonymous-user").strip() or "anonymous-user"
        user_message = question.strip()

        try:
            memories = mem0_client.search(
                query=user_message,
                user_id=resolved_user_id,
                limit=5,
            )
        except Exception:
            memories = []

        memory_context = "\n".join([m.get("memory", "") for m in memories if isinstance(m, dict) and m.get("memory")])
        if not memory_context:
            memory_context = "No previous context."

        dashboard_data = compact_context.get("charts", [])
        kpis = compact_context.get("kpiCards", [])

        system_prompt = f"""
You are a BI analyst assistant for Talking BI.
Answer questions accurately using real dashboard data.
    You are strictly restricted to dashboard context only.
    If the user asks for anything unrelated (jokes, stories, generic chat), politely refuse and ask a KPI/dashboard question.
    Never provide answers outside provided dashboard context.

User's past context and preferences:
{memory_context}

Current dashboard data: {dashboard_data}
Current KPIs: {kpis}

Be concise and professional. Use real numbers only.
"""

        prompt = f"""User: {persona}
Question:
{question}

Context JSON:
{json.dumps(compact_context, ensure_ascii=True)}
"""

        try:
            response = client.chat.completions.create(
                model=self.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
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

            try:
                mem0_client.add(
                    messages=[
                        {"role": "user", "content": user_message},
                        {"role": "assistant", "content": message},
                    ],
                    user_id=resolved_user_id,
                )
            except Exception:
                pass

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
