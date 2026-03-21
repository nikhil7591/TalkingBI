from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.ai_service import ai_service
from app.services.data_service import data_service
from app.services.voice_service import voice_service

router = APIRouter(tags=["dashboard"])


class DashboardRequest(BaseModel):
    kpi: str = Field(..., min_length=2)
    selectedCharts: list[str] = Field(default_factory=list)
    selectedThemes: list[str] = Field(default_factory=list)


class VoiceExplanationRequest(BaseModel):
    dashboardSpec: dict[str, Any] = Field(...)
    kpi: str = Field(..., min_length=2)

@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/datasets")
def datasets() -> dict:
    return {"datasets": data_service.list_datasets()}


@router.post("/generate-dashboard")
def generate_dashboard(payload: DashboardRequest) -> dict:
    aggregated = data_service.prepare_aggregated_rows(payload.kpi)
    spec = ai_service.generate_dashboard_spec(payload.kpi, aggregated, payload.selectedCharts, payload.selectedThemes)
    spec["source"] = {
        "dataset": aggregated.get("dataset"),
        "meta": aggregated.get("meta", {}),
        "selected_charts": payload.selectedCharts,
        "selected_themes": payload.selectedThemes,
    }
    return spec


@router.post("/voice-explanation")
def generate_voice_explanation(payload: VoiceExplanationRequest) -> dict[str, Any]:
    """Generate voice explanation and transcript for a dashboard."""
    return voice_service.get_voice_explanation(payload.dashboardSpec, payload.kpi)
