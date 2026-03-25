from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field
from rich.console import Console
from rich.panel import Panel

from app.routers.agents import (
    DeepPrepRequest,
    Doc2ChartRequest,
    InsightsRequest,
    SqlAgentRequest,
    run_deepprep_agent,
    run_doc2chart_agent,
    run_insights_agent,
    run_sql_agent,
)
from app.services.ai_service import ai_service
from app.services.bi_chat_service import bi_chat_service
from app.services.data_service import data_service
from app.services.dynamic_dataset_service import dynamic_dataset_service
from app.services.voice_service import voice_service

router = APIRouter(tags=["dashboard"])
console = Console()


def _apply_user_preferences_and_fill_data(
    spec: dict[str, Any],
    selected_charts: list[str],
    selected_themes: list[str],
    fallback_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    updated = spec
    if selected_charts:
        updated = ai_service._apply_selected_chart_types(updated, selected_charts)
    if selected_themes:
        updated = ai_service._apply_themes_to_dashboards(updated, selected_themes)

    for dashboard in updated.get("dashboards", []):
        charts = dashboard.get("charts", [])
        for chart in charts:
            if not isinstance(chart, dict):
                continue
            data_rows = chart.get("data")
            if not isinstance(data_rows, list) or len(data_rows) == 0:
                chart["data"] = fallback_rows[:60]

    return updated


class DashboardRequest(BaseModel):
    kpi: str = Field(..., min_length=2)
    selectedCharts: list[str] = Field(default_factory=list)
    selectedThemes: list[str] = Field(default_factory=list)
    user_id: str | None = Field(default=None)
    session_id: str | None = Field(default=None)
    use_url_dataset: bool = Field(default=False)
    user_preferences: dict[str, Any] = Field(default_factory=dict)


class VoiceExplanationRequest(BaseModel):
    dashboardSpec: dict[str, Any] = Field(...)
    kpi: str = Field(..., min_length=2)


class BiChatRequest(BaseModel):
    question: str = Field(..., min_length=2)
    kpi: str = Field(..., min_length=2)
    dashboardSpec: dict[str, Any] = Field(...)
    userName: str | None = Field(default=None)
    userId: str | None = Field(default=None)

@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/datasets")
def datasets() -> dict:
    return {"datasets": data_service.list_datasets()}


@router.post("/gen-dashboard")
@router.post("/generate-dashboard")
async def generate_dashboard(payload: DashboardRequest) -> dict:
    try:
        console.print(
            Panel(
                "[bold white]TALKING BI PIPELINE[/bold white]\n"
                f"[white]KPI:[/white] [yellow]{payload.kpi}[/yellow]\n"
                f"[white]Mode:[/white] [cyan]{'URL Dataset' if payload.use_url_dataset else 'CSV Fallback'}[/cyan]\n"
                f"[white]User:[/white] {payload.user_id or 'guest'}",
                border_style="white",
                title="PIPELINE START",
            )
        )

        if payload.use_url_dataset and payload.session_id and payload.user_id:
            dataset = dynamic_dataset_service.get_dataset_for_session(payload.session_id, payload.user_id)
            if dataset:
                step1 = await run_sql_agent(
                    SqlAgentRequest(
                        kpi=payload.kpi,
                        session_id=payload.session_id,
                        user_id=payload.user_id,
                    )
                )
                columns = [c.get("name") for c in (dataset.get("columns") or []) if isinstance(c, dict) and c.get("name")]
                step2 = await run_deepprep_agent(
                    DeepPrepRequest(
                        rows=step1.get("rows") or [],
                        columns=columns,
                        kpi=payload.kpi,
                    )
                )
                step3 = await run_doc2chart_agent(
                    Doc2ChartRequest(
                        rows=step2.get("cleaned_rows") or [],
                        columns=columns,
                        kpi=payload.kpi,
                        user_id=payload.user_id,
                        user_preferences=payload.user_preferences,
                    )
                )
                step4 = await run_insights_agent(
                    InsightsRequest(
                        rows=step2.get("cleaned_rows") or [],
                        kpi=payload.kpi,
                        dashboard_title="URL Dataset Dashboard",
                    )
                )

                console.print(
                    Panel(
                        "[bold green]PIPELINE COMPLETE[/bold green]\n"
                        "[green]4 dashboards generated successfully[/green]",
                        border_style="green",
                        title="PIPELINE DONE",
                    )
                )
                return {
                    "doc2chart": step3,
                    "insights": step4,
                    "source": "url",
                    "session_id": payload.session_id,
                }

        console.print("[cyan]CSV Fallback mode[/cyan]")
        aggregated = data_service.prepare_aggregated_rows(payload.kpi)
        spec = ai_service.generate_dashboard_spec(payload.kpi, aggregated, payload.selectedCharts, payload.selectedThemes)
        spec["source"] = "csv_fallback"
        console.print(
            Panel(
                "[bold green]PIPELINE COMPLETE[/bold green]\n"
                "[green]4 dashboards generated successfully[/green]",
                border_style="green",
                title="PIPELINE DONE",
            )
        )
        spec["source_meta"] = {
            "dataset": aggregated.get("dataset"),
            "meta": aggregated.get("meta", {}),
            "selected_charts": payload.selectedCharts,
            "selected_themes": payload.selectedThemes,
        }
        return spec
    except Exception as exc:
        console.print(Panel(f"[bold red]PIPELINE ERROR[/bold red]\n{exc}", border_style="red", title="PIPELINE FAILED"))
        raise


@router.post("/voice-explanation")
def generate_voice_explanation(payload: VoiceExplanationRequest) -> dict[str, Any]:
    """Generate voice explanation and transcript for a dashboard."""
    return voice_service.get_voice_explanation(payload.dashboardSpec, payload.kpi)


@router.post("/bi-chat")
def bi_chat(payload: BiChatRequest) -> dict[str, Any]:
    return bi_chat_service.answer(
        question=payload.question,
        kpi=payload.kpi,
        dashboard_spec=payload.dashboardSpec,
        user_name=payload.userName,
        user_id=payload.userId,
    )
