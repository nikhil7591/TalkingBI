from __future__ import annotations

import json
import os
from typing import Any

from mem0 import Memory  # pyright: ignore[reportMissingImports]
from openai import OpenAI

class BiChatService:
    """Context-aware BI chatbot restricted to dashboard/KPI context."""

    def __init__(self) -> None:
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-5.4-mini-2026-03-17")
        self.client: OpenAI | None = None
        self.mem0_client: Memory | None = None
        self.mem0_init_attempted = False

    def _get_client(self) -> OpenAI | None:
        if self.client is not None:
            return self.client

        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not openai_key:
            return None

        self.client = OpenAI(api_key=openai_key)
        return self.client

    def _get_mem0_client(self) -> Memory | None:
        if self.mem0_client is not None:
            return self.mem0_client
        if self.mem0_init_attempted:
            return None

        self.mem0_init_attempted = True
        try:
            self.mem0_client = Memory()
        except Exception:
            self.mem0_client = None
        return self.mem0_client

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
    def _fallback_answer(kpi: str, dashboard_title: str, kpi_cards: list[dict[str, Any]], charts: list[dict[str, Any]]) -> str:
        card_parts: list[str] = []
        for card in kpi_cards[:3]:
            if not isinstance(card, dict):
                continue
            label = str(card.get("label") or "KPI")
            value = str(card.get("formattedValue") or card.get("value") or "N/A")
            card_parts.append(f"{label}: {value}")

        chart_titles = [str(c.get("title") or "") for c in charts[:3] if isinstance(c, dict)]
        chart_titles = [t for t in chart_titles if t]

        summary = (
            f"Quick summary for {kpi} on {dashboard_title}: "
            + (" | ".join(card_parts) if card_parts else "KPI cards are available but values are limited.")
        )
        if chart_titles:
            summary += f". Key charts: {', '.join(chart_titles)}."
        summary += " Ask a focused question like 'top segment by revenue' or 'month-over-month drop reason' for deeper analysis."
        return summary

    @staticmethod
    def _is_dashboard_summary_request(question: str) -> bool:
        q = question.lower().strip()
        summary_markers = [
            "explain",
            "summarize",
            "summary",
            "overview",
            "about this dashboard",
            "about the dashboard",
            "what is this dashboard",
            "tell me about",
            "walk me through",
        ]
        return any(marker in q for marker in summary_markers)

    def _dashboard_summary_response(
        self,
        question: str,
        kpi: str,
        dashboard_title: str,
        insight: str,
        kpi_cards: list[dict[str, Any]],
        charts: list[dict[str, Any]],
    ) -> dict[str, Any]:
        card_lines: list[str] = []
        for card in kpi_cards[:4]:
            if not isinstance(card, dict):
                continue
            label = str(card.get("label") or "KPI")
            value = str(card.get("formattedValue") or card.get("value") or "N/A")
            card_lines.append(f"- {label}: {value}")

        chart_lines: list[str] = []
        for chart in charts[:4]:
            if not isinstance(chart, dict):
                continue
            title = str(chart.get("title") or "Chart")
            chart_type = str(chart.get("type") or "chart")
            chart_lines.append(f"- {title} ({chart_type})")

        answer_parts = [
            f"**{dashboard_title}** is a {kpi} dashboard focused on business performance.",
        ]
        if insight:
            answer_parts.append(f"**Insight:** {insight}")
        if card_lines:
            answer_parts.append("**Key KPIs:**\n" + "\n".join(card_lines))
        if chart_lines:
            answer_parts.append("**Main charts:**\n" + "\n".join(chart_lines))
        answer_parts.append("If you want, I can also break this into trends, risks, and next actions.")

        return {
            "answer": "\n\n".join(answer_parts),
            "sources": ["kpiCards", "charts", "insightText"],
        }

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
        attachments: list[str] | None = None,
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

        if self._is_dashboard_summary_request(question):
            return self._dashboard_summary_response(
                question=question,
                kpi=kpi,
                dashboard_title=title,
                insight=insight,
                kpi_cards=kpi_cards,
                charts=charts,
            )

        compact_context = {
            "title": title,
            "focus": focus,
            "kpi": kpi,
            "insightText": insight,
            "kpiCards": kpi_cards[:6],
            "charts": self._trim_chart_data(charts),
        }

        image_attachments = [a for a in (attachments or []) if isinstance(a, str) and a.startswith("data:image/")]

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

        mem0_client = self._get_mem0_client()
        if mem0_client is not None:
            try:
                memories = mem0_client.search(
                    query=user_message,
                    user_id=resolved_user_id,
                    limit=5,
                )
            except Exception:
                memories = []
        else:
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

        user_content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for image_data_url in image_attachments[:2]:
            user_content.append({"type": "image_url", "image_url": {"url": image_data_url}})

        try:
            response = client.chat.completions.create(
                model=self.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content if image_attachments else prompt},
                ],
                temperature=0.2,
                max_completion_tokens=220,
                timeout=18,
            )
            message = ""
            if response.choices and response.choices[0].message.content:
                message = response.choices[0].message.content.strip()

            if not message:
                message = "I could not generate an answer from the provided dashboard context."

            if mem0_client is not None:
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
                "answer": self._fallback_answer(kpi=kpi, dashboard_title=title, kpi_cards=kpi_cards, charts=charts),
                "sources": ["kpiCards", "charts", "insightText"],
            }


bi_chat_service = BiChatService()
