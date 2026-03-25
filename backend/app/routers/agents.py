from __future__ import annotations

import json
import os
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pydantic import BaseModel, Field
from rich.console import Console
from rich.panel import Panel

from app.services.dynamic_dataset_service import dynamic_dataset_service

router = APIRouter(prefix="/agent", tags=["agents"])
console = Console()
MODEL_ID = "gpt-5.4-mini-2026-03-17"

ALLOWED_CHART_TYPES = [
    "line",
    "bar",
    "horizontal-bar",
    "stacked-bar",
    "donut",
    "area",
    "gauge",
    "treemap",
    "heatmap",
    "scatter",
    "waterfall",
    "sparkline",
    "funnel",
    "radar",
    "sunburst",
    "pie",
    "bubble",
    "polar-bar",
    "sankey",
    "pictorial-bar",
    "rose",
    "combo",
    "radial-bar",
    "step-line",
    "nightingale",
]


def _normalize_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    df = pd.DataFrame(records)
    if df.empty:
        return []
    df = df.where(pd.notna(df), None)
    return df.to_dict(orient="records")


def _load_json_response(response: Any) -> dict[str, Any]:
    content = ""
    if response.choices and response.choices[0].message.content:
        content = response.choices[0].message.content
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Model returned invalid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=502, detail="Model returned non-object JSON.")
    return parsed


def _make_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")
    return OpenAI(api_key=api_key)


def _to_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _build_fallback_doc2chart(
    rows: list[dict[str, Any]],
    columns: list[str],
    selected: list[str],
    kpi: str,
) -> dict[str, Any]:
    df = pd.DataFrame(rows or [])
    numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    text_cols = [c for c in df.columns if c not in numeric_cols]

    y_field = numeric_cols[0] if numeric_cols else (columns[1] if len(columns) > 1 else (columns[0] if columns else "value"))
    x_field = text_cols[0] if text_cols else (columns[0] if columns else "category")
    group_field = text_cols[1] if len(text_cols) > 1 else None

    values = [_to_float(r.get(y_field)) for r in rows if isinstance(r, dict)]
    total = sum(values)
    avg = (total / len(values)) if values else 0.0
    max_val = max(values) if values else 0.0
    min_val = min(values) if values else 0.0
    growth = ((_to_float(values[-1]) - _to_float(values[0])) / _to_float(values[0]) * 100) if len(values) > 1 and _to_float(values[0]) != 0 else 0.0

    slots = []
    for idx in range(4):
        slots.append(
            {
                "slot": idx + 1,
                "section_title": ["Executive KPI", "Trend Lens", "Segment Breakdown", "Action Panel"][idx],
                "recommended_type": selected[idx % len(selected)] if selected else "bar",
                "business_question": f"What is the key signal in {kpi}?",
                "reason": "Balanced executive view with trend, distribution, and comparison.",
                "x_field": x_field,
                "y_field": y_field,
                "group_field": group_field,
                "data_pattern": ["time_series", "categorical", "distribution", "comparison"][idx],
                "aggregation": "SUM",
                "number_format": "compact",
                "title": ["KPI Momentum", "Trend Over Time", "Top Contributors", "Risk/Opportunity"][idx],
                "subtitle": [
                    "Executive overview for decision-making",
                    "Period-over-period movement",
                    "Segment contribution analysis",
                    "Where to act next",
                ][idx],
                "data": (rows or [])[:18],
            }
        )

    return {
        "meta": {
            "dashboard_goal": kpi,
            "design_intent": "executive_powerbi",
            "industry_hint": "general_business",
        },
        "kpi_summary": {
            "total": total,
            "average": avg,
            "maximum": max_val,
            "minimum": min_val,
            "count": len(rows),
            "growth_percent": growth,
            "variance_percent": 0,
            "top_dimension_value": str(rows[0].get(x_field)) if rows else "n/a",
            "top_dimension_label": x_field,
        },
        "chart_slots": slots,
        "narrative": {
            "headline": f"{kpi} executive dashboard",
            "risk": "Monitor sudden drops in the key metric.",
            "opportunity": "Focus on top-performing segments to scale outcomes.",
            "recommended_action": "Prioritize high-impact segments and track weekly variance.",
        },
        "insight": f"{kpi}: total {total:.2f}, average {avg:.2f}, max {max_val:.2f}, growth {growth:.1f}%.",
    }


def _normalize_doc2chart_payload(
    parsed: dict[str, Any],
    rows: list[dict[str, Any]],
    columns: list[str],
    selected: list[str],
    kpi: str,
) -> dict[str, Any]:
    fallback = _build_fallback_doc2chart(rows, columns, selected, kpi)

    safe = parsed if isinstance(parsed, dict) else {}
    chart_slots = safe.get("chart_slots") if isinstance(safe.get("chart_slots"), list) else []
    fallback_slots = fallback["chart_slots"]

    normalized_slots: list[dict[str, Any]] = []
    for idx in range(4):
        slot_raw = chart_slots[idx] if idx < len(chart_slots) and isinstance(chart_slots[idx], dict) else {}
        slot_fallback = fallback_slots[idx]

        recommended_type = str(slot_raw.get("recommended_type") or slot_fallback["recommended_type"]).strip().lower()
        if recommended_type not in selected:
            recommended_type = slot_fallback["recommended_type"]

        x_field = str(slot_raw.get("x_field") or slot_fallback["x_field"])
        y_field = str(slot_raw.get("y_field") or slot_fallback["y_field"])
        group_field = slot_raw.get("group_field")
        group_field = str(group_field) if isinstance(group_field, str) and group_field in columns else None

        if x_field not in columns:
            x_field = slot_fallback["x_field"]
        if y_field not in columns:
            y_field = slot_fallback["y_field"]

        data_rows = slot_raw.get("data") if isinstance(slot_raw.get("data"), list) else []
        if not data_rows:
            data_rows = rows[:18]
        data_rows = [r for r in data_rows if isinstance(r, dict)][:18]

        normalized_slots.append(
            {
                "slot": idx + 1,
                "section_title": str(slot_raw.get("section_title") or slot_fallback["section_title"]),
                "recommended_type": recommended_type,
                "business_question": str(slot_raw.get("business_question") or slot_fallback["business_question"]),
                "reason": str(slot_raw.get("reason") or slot_fallback["reason"]),
                "x_field": x_field,
                "y_field": y_field,
                "group_field": group_field,
                "data_pattern": str(slot_raw.get("data_pattern") or slot_fallback["data_pattern"]),
                "aggregation": str(slot_raw.get("aggregation") or slot_fallback["aggregation"]),
                "number_format": str(slot_raw.get("number_format") or slot_fallback["number_format"]),
                "title": str(slot_raw.get("title") or slot_fallback["title"]),
                "subtitle": str(slot_raw.get("subtitle") or slot_fallback["subtitle"]),
                "data": _normalize_records(data_rows),
            }
        )

    kpi_summary = safe.get("kpi_summary") if isinstance(safe.get("kpi_summary"), dict) else {}
    fallback_summary = fallback["kpi_summary"]
    normalized_summary = {
        "total": _to_float(kpi_summary.get("total", fallback_summary["total"])),
        "average": _to_float(kpi_summary.get("average", fallback_summary["average"])),
        "maximum": _to_float(kpi_summary.get("maximum", fallback_summary["maximum"])),
        "minimum": _to_float(kpi_summary.get("minimum", fallback_summary["minimum"])),
        "count": int(kpi_summary.get("count", fallback_summary["count"]) or 0),
        "growth_percent": _to_float(kpi_summary.get("growth_percent", fallback_summary.get("growth_percent", 0))),
        "variance_percent": _to_float(kpi_summary.get("variance_percent", fallback_summary.get("variance_percent", 0))),
        "top_dimension_value": str(kpi_summary.get("top_dimension_value") or fallback_summary["top_dimension_value"]),
        "top_dimension_label": str(kpi_summary.get("top_dimension_label") or fallback_summary["top_dimension_label"]),
    }

    narrative_raw = safe.get("narrative") if isinstance(safe.get("narrative"), dict) else {}
    fallback_narrative = fallback["narrative"]
    normalized_narrative = {
        "headline": str(narrative_raw.get("headline") or fallback_narrative["headline"]),
        "risk": str(narrative_raw.get("risk") or fallback_narrative["risk"]),
        "opportunity": str(narrative_raw.get("opportunity") or fallback_narrative["opportunity"]),
        "recommended_action": str(narrative_raw.get("recommended_action") or fallback_narrative["recommended_action"]),
    }

    meta_raw = safe.get("meta") if isinstance(safe.get("meta"), dict) else {}
    normalized_meta = {
        "dashboard_goal": str(meta_raw.get("dashboard_goal") or kpi),
        "design_intent": str(meta_raw.get("design_intent") or "executive_powerbi"),
        "industry_hint": str(meta_raw.get("industry_hint") or "general_business"),
    }

    return {
        "meta": normalized_meta,
        "kpi_summary": normalized_summary,
        "chart_slots": normalized_slots,
        "narrative": normalized_narrative,
        "insight": str(safe.get("insight") or fallback["insight"]),
    }


class SqlAgentRequest(BaseModel):
    kpi: str = Field(..., min_length=2)
    session_id: str = Field(..., min_length=3)
    user_id: str = Field(..., min_length=1)


class DeepPrepRequest(BaseModel):
    rows: list[dict[str, Any]] = Field(default_factory=list)
    columns: list[str] = Field(default_factory=list)
    kpi: str = Field(..., min_length=2)


class Doc2ChartRequest(BaseModel):
    rows: list[dict[str, Any]] = Field(default_factory=list)
    columns: list[str] = Field(default_factory=list)
    kpi: str = Field(..., min_length=2)
    user_id: str = Field(..., min_length=1)
    user_preferences: dict[str, Any] = Field(default_factory=dict)


class InsightsRequest(BaseModel):
    rows: list[dict[str, Any]] = Field(default_factory=list)
    kpi: str = Field(..., min_length=2)
    dashboard_title: str | None = None


async def run_sql_agent(payload: SqlAgentRequest) -> dict[str, Any]:
    console.print(Panel("[bold cyan]SQL AGENT STARTED[/bold cyan]", border_style="cyan"))
    console.print(f"[cyan]  -> KPI received:[/cyan] [yellow]{payload.kpi}[/yellow]")
    console.print(f"[cyan]  -> Session ID:[/cyan] {payload.session_id}")
    console.print("[cyan]  -> Fetching dataset from Prisma...[/cyan]")

    dataset = dynamic_dataset_service.get_dataset_for_session(payload.session_id, payload.user_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="No dynamic dataset found for the given session and user.")

    raw_data = dataset.get("rawData") or []
    if not isinstance(raw_data, list) or not raw_data:
        raise HTTPException(status_code=400, detail="Dynamic dataset has no rows.")

    columns_info = dataset.get("columns") or []
    columns = [c.get("name") for c in columns_info if isinstance(c, dict) and c.get("name")]
    column_types = {c.get("name"): c.get("dtype") for c in columns_info if isinstance(c, dict) and c.get("name")}
    row_count = int(dataset.get("rowCount") or len(raw_data))
    sample_rows = raw_data[:5]
    console.print(f"[cyan]  -> Dataset loaded:[/cyan] [green]{row_count} rows, {len(columns)} columns[/green]")
    console.print(f"[cyan]  -> Calling {MODEL_ID}...[/cyan]")

    client = _make_client()
    response = client.chat.completions.create(
        model=MODEL_ID,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior data engineer. Your ONLY job is to analyze "
                    "dataset schema and produce a precise query plan. Only use column "
                    "names that exist in the provided schema. Never hallucinate columns. "
                    "Return ONLY valid JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Dataset columns: {columns}\n"
                    f"Column types: {column_types}\n"
                    f"Sample data (5 rows): {sample_rows}\n"
                    f"Total rows: {row_count}\n"
                    f"User KPI: {payload.kpi}\n\n"
                    "Return ONLY this JSON:\n"
                    "{\n"
                    "  \"identified_metric\": \"exact column name for the metric\",\n"
                    "  \"identified_dimensions\": [\"exact column names for dimensions\"],\n"
                    "  \"aggregation\": \"SUM or AVG or COUNT\",\n"
                    "  \"group_by\": [\"columns to group by\"],\n"
                    "  \"order_by\": \"column to sort\",\n"
                    "  \"limit\": 50,\n"
                    "  \"filter_conditions\": [],\n"
                    "  \"query_description\": \"plain english description\"\n"
                    "}"
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_completion_tokens=8000,
    )

    query_plan = _load_json_response(response)
    console.print(f"[cyan]  -> Query plan generated:[/cyan] {query_plan.get('query_description', 'n/a')}")
    console.print("[cyan]  -> Executing pandas aggregation...[/cyan]")

    df = pd.DataFrame(raw_data)
    if df.empty:
        return {"rows": [], "query_plan": query_plan, "row_count": 0}

    for condition in query_plan.get("filter_conditions", []):
        if not isinstance(condition, dict):
            continue
        column = condition.get("column")
        operator = str(condition.get("operator", "=")).strip()
        value = condition.get("value")
        if column not in df.columns:
            continue
        if operator == "=":
            df = df[df[column] == value]
        elif operator == "!=":
            df = df[df[column] != value]

    numeric_columns = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    metric = str(query_plan.get("identified_metric") or "").strip()
    if metric not in df.columns or metric not in numeric_columns:
        metric = numeric_columns[0] if numeric_columns else ""

    dimensions = [d for d in (query_plan.get("group_by") or query_plan.get("identified_dimensions") or []) if d in df.columns and d != metric]
    aggregation = str(query_plan.get("aggregation") or "SUM").upper()

    if metric and dimensions:
        grouped = df[dimensions + [metric]].dropna(subset=[metric]).groupby(dimensions, as_index=False)[metric]
        if aggregation == "AVG":
            out_df = grouped.mean()
        elif aggregation == "COUNT":
            out_df = grouped.count().rename(columns={metric: f"{metric}_count"})
        else:
            out_df = grouped.sum()
    elif metric:
        if aggregation == "AVG":
            out_df = pd.DataFrame([{metric: float(df[metric].mean())}])
        elif aggregation == "COUNT":
            out_df = pd.DataFrame([{f"{metric}_count": int(df[metric].count())}])
        else:
            out_df = pd.DataFrame([{metric: float(df[metric].sum())}])
    else:
        out_df = df.copy()

    order_by = str(query_plan.get("order_by") or "").strip()
    if order_by in out_df.columns:
        out_df = out_df.sort_values(by=order_by, ascending=False)
    elif metric and metric in out_df.columns:
        out_df = out_df.sort_values(by=metric, ascending=False)

    limit = int(query_plan.get("limit") or 50)
    out_df = out_df.head(max(1, min(limit, 200)))

    rows = _normalize_records(out_df.to_dict(orient="records"))
    console.print(f"[green]  + SQL AGENT COMPLETE - {len(rows)} rows returned[/green]")
    console.print(Panel("[green]SQL AGENT COMPLETE[/green]", border_style="green"))
    return {
        "rows": rows,
        "query_plan": query_plan,
        "row_count": len(rows),
    }


async def run_deepprep_agent(payload: DeepPrepRequest) -> dict[str, Any]:
    console.print(Panel("[bold magenta]DEEPPREP AGENT STARTED[/bold magenta]", border_style="magenta"))
    console.print(f"[magenta]  -> Received {len(payload.rows)} rows for cleaning[/magenta]")
    console.print(f"[magenta]  -> Calling {MODEL_ID} for data analysis...[/magenta]")

    rows = payload.rows or []
    df = pd.DataFrame(rows)

    client = _make_client()
    response = client.chat.completions.create(
        model=MODEL_ID,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a data preparation specialist. Analyze raw data quality and "
                    "recommend transformations. Return ONLY valid JSON. Do NOT include "
                    "actual data in response."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Columns: {payload.columns}\n"
                    f"Sample rows (10): {rows[:10]}\n"
                    f"Total rows: {len(rows)}\n"
                    f"KPI: {payload.kpi}\n\n"
                    "Return ONLY this JSON:\n"
                    "{\n"
                    "  \"quality_issues\": [\"issue1\", \"issue2\"],\n"
                    "  \"transformations_applied\": [\"transform1\", \"transform2\"],\n"
                    "  \"recommended_aggregation\": {\n"
                    "    \"metric_column\": \"...\",\n"
                    "    \"dimension_columns\": [\"...\"],\n"
                    "    \"aggregation_type\": \"SUM/AVG/COUNT\",\n"
                    "    \"top_n\": 20\n"
                    "  },\n"
                    "  \"data_ready\": true\n"
                    "}"
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_completion_tokens=8000,
    )

    prep_plan = _load_json_response(response)
    quality_issues = prep_plan.get("quality_issues") or []
    transformations_preview = prep_plan.get("transformations_applied") or []
    console.print(f"[magenta]  -> Issues found:[/magenta] {quality_issues}")
    console.print(f"[magenta]  -> Applying transformations:[/magenta] {transformations_preview}")
    console.print("[magenta]  -> Running pandas clean + aggregate...[/magenta]")

    if df.empty:
        return {
            "cleaned_rows": [],
            "transformations": prep_plan.get("transformations_applied", []),
            "row_count": 0,
        }

    before = len(df)
    df = df.drop_duplicates()

    numeric_columns = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    rec_agg = prep_plan.get("recommended_aggregation") or {}
    metric_col = rec_agg.get("metric_column") if isinstance(rec_agg, dict) else None
    if metric_col not in df.columns or metric_col not in numeric_columns:
        metric_col = numeric_columns[0] if numeric_columns else None

    if metric_col:
        df = df.dropna(subset=[metric_col])

    for col in df.columns:
        if pd.api.types.is_object_dtype(df[col]):
            df[col] = df[col].astype(str).str.strip().str.title()

    dim_cols = rec_agg.get("dimension_columns") if isinstance(rec_agg, dict) else []
    dim_cols = [c for c in (dim_cols or []) if c in df.columns and c != metric_col]
    agg_type = str((rec_agg.get("aggregation_type") if isinstance(rec_agg, dict) else "SUM") or "SUM").upper()
    top_n = int((rec_agg.get("top_n") if isinstance(rec_agg, dict) else 20) or 20)

    if metric_col and dim_cols:
        grouped = df[dim_cols + [metric_col]].groupby(dim_cols, as_index=False)[metric_col]
        if agg_type == "AVG":
            df = grouped.mean()
        elif agg_type == "COUNT":
            df = grouped.count().rename(columns={metric_col: f"{metric_col}_count"})
        else:
            df = grouped.sum()

        sort_col = metric_col if metric_col in df.columns else df.columns[-1]
        df = df.sort_values(by=sort_col, ascending=False).head(max(1, min(top_n, 200)))

    transformations = list(prep_plan.get("transformations_applied") or [])
    transformations.extend(
        [
            f"Deduplicated rows: {before} -> {len(df)}",
            "Normalized string columns (strip + title case)",
        ]
    )
    if metric_col:
        transformations.append(f"Dropped null metric values in '{metric_col}'")

    cleaned_rows = _normalize_records(df.to_dict(orient="records"))
    console.print(f"[green]  + DEEPPREP AGENT COMPLETE - {len(cleaned_rows)} clean rows[/green]")
    console.print(Panel("[green]DEEPPREP AGENT COMPLETE[/green]", border_style="green"))
    return {
        "cleaned_rows": cleaned_rows,
        "transformations": transformations,
        "row_count": len(cleaned_rows),
    }


async def run_doc2chart_agent(payload: Doc2ChartRequest) -> dict[str, Any]:
    user_prefs = payload.user_preferences or {}
    selected = [c for c in (user_prefs.get("selectedCharts") or []) if c in ALLOWED_CHART_TYPES]
    if not selected:
        selected = ["line", "bar", "donut", "area"]

    console.print(Panel("[bold yellow]DOC2CHART AGENT STARTED[/bold yellow]", border_style="yellow"))
    console.print(f"[yellow]  -> User theme:[/yellow] {user_prefs.get('theme', 'dark-professional')}")
    console.print(f"[yellow]  -> Allowed charts:[/yellow] {selected}")
    console.print(f"[yellow]  -> Calling {MODEL_ID} for chart recommendations...[/yellow]")

    rows = payload.rows or []
    df = pd.DataFrame(rows)
    numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    text_cols = [c for c in df.columns if c not in numeric_cols]

    client = _make_client()
    response = client.chat.completions.create(
        model=MODEL_ID,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a principal Power BI solution architect with 20+ years of enterprise dashboard design experience. "
                    "Your ONLY job is to generate a professional analytics JSON spec from the data. "
                    "Focus on executive storytelling, decision-useful charting, and industry-ready structure. "
                    "Do NOT output markdown. Return ONLY valid JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"KPI: {payload.kpi}\n"
                    f"Data columns: {payload.columns}\n"
                    f"Numeric columns: {numeric_cols}\n"
                    f"Text/dimension columns: {text_cols}\n"
                    f"Total rows: {len(rows)}\n"
                    f"Sample data: {json.dumps(rows[:5], ensure_ascii=True)}\n"
                    f"Allowed chart type IDs catalog: {ALLOWED_CHART_TYPES}\n"
                    f"User's allowed chart types: {selected}\n\n"
                    "Analyze the data and return an executive canvas JSON spec.\n"
                    "You MUST only use chart types from the allowed list.\n"
                    "Return ONLY this JSON:\n"
                    "{\n"
                    "  \"meta\": {\n"
                    "    \"dashboard_goal\": \"...\",\n"
                    "    \"design_intent\": \"executive_powerbi\",\n"
                    "    \"industry_hint\": \"retail / finance / ops / hr / marketing / generic\"\n"
                    "  },\n"
                    "  \"kpi_summary\": {\n"
                    "    \"total\": 0,\n"
                    "    \"average\": 0,\n"
                    "    \"maximum\": 0,\n"
                    "    \"minimum\": 0,\n"
                    "    \"count\": 0,\n"
                    "    \"growth_percent\": 0,\n"
                    "    \"variance_percent\": 0,\n"
                    "    \"top_dimension_value\": \"...\",\n"
                    "    \"top_dimension_label\": \"...\"\n"
                    "  },\n"
                    "  \"chart_slots\": [\n"
                    "    {\n"
                    "      \"slot\": 1,\n"
                    "      \"section_title\": \"Executive KPI\",\n"
                    "      \"recommended_type\": \"line\",\n"
                    "      \"business_question\": \"...\",\n"
                    "      \"reason\": \"time series data detected\",\n"
                    "      \"x_field\": \"exact_column_name\",\n"
                    "      \"y_field\": \"exact_column_name\",\n"
                    "      \"group_field\": \"exact_column_name or null\",\n"
                    "      \"data_pattern\": \"time_series / categorical / distribution / correlation\",\n"
                    "      \"aggregation\": \"SUM / AVG / COUNT\",\n"
                    "      \"number_format\": \"compact / percent / currency\",\n"
                    "      \"title\": \"professional chart title\",\n"
                    "      \"subtitle\": \"what business user should see\",\n"
                    "      \"data\": []\n"
                    "    },\n"
                    "    {\n"
                    "      \"slot\": 2,\n"
                    "      \"section_title\": \"Trend Lens\",\n"
                    "      \"recommended_type\": \"bar\",\n"
                    "      \"business_question\": \"...\",\n"
                    "      \"reason\": \"...\",\n"
                    "      \"x_field\": \"exact_column_name\",\n"
                    "      \"y_field\": \"exact_column_name\",\n"
                    "      \"group_field\": null,\n"
                    "      \"data_pattern\": \"categorical\",\n"
                    "      \"aggregation\": \"SUM\",\n"
                    "      \"number_format\": \"compact\",\n"
                    "      \"title\": \"...\",\n"
                    "      \"subtitle\": \"...\",\n"
                    "      \"data\": []\n"
                    "    },\n"
                    "    {\n"
                    "      \"slot\": 3,\n"
                    "      \"section_title\": \"Segment Breakdown\",\n"
                    "      \"recommended_type\": \"donut\",\n"
                    "      \"business_question\": \"...\",\n"
                    "      \"reason\": \"...\",\n"
                    "      \"x_field\": \"exact_column_name\",\n"
                    "      \"y_field\": \"exact_column_name\",\n"
                    "      \"group_field\": null,\n"
                    "      \"data_pattern\": \"distribution\",\n"
                    "      \"aggregation\": \"SUM\",\n"
                    "      \"number_format\": \"percent\",\n"
                    "      \"title\": \"...\",\n"
                    "      \"subtitle\": \"...\",\n"
                    "      \"data\": []\n"
                    "    },\n"
                    "    {\n"
                    "      \"slot\": 4,\n"
                    "      \"section_title\": \"Action Panel\",\n"
                    "      \"recommended_type\": \"area\",\n"
                    "      \"business_question\": \"...\",\n"
                    "      \"reason\": \"...\",\n"
                    "      \"x_field\": \"exact_column_name\",\n"
                    "      \"y_field\": \"exact_column_name\",\n"
                    "      \"group_field\": null,\n"
                    "      \"data_pattern\": \"time_series\",\n"
                    "      \"aggregation\": \"SUM\",\n"
                    "      \"number_format\": \"currency\",\n"
                    "      \"title\": \"...\",\n"
                    "      \"subtitle\": \"...\",\n"
                    "      \"data\": []\n"
                    "    }\n"
                    "  ],\n"
                    "  \"narrative\": {\n"
                    "    \"headline\": \"one-line exec summary\",\n"
                    "    \"risk\": \"main risk signal\",\n"
                    "    \"opportunity\": \"largest opportunity\",\n"
                    "    \"recommended_action\": \"immediate action\"\n"
                    "  },\n"
                    "  \"insight\": \"One sentence with actual numbers from data\"\n"
                    "}\n\n"
                    "RULES:\n"
                    "- Return exactly 4 chart slots\n"
                    "- Use enterprise dashboard language (not generic placeholders)\n"
                    "- Each slot data must use ACTUAL rows from provided data\n"
                    "- Each slot data should be <= 18 rows for readability\n"
                    f"- x_field and y_field must be EXACT column names from: {payload.columns}\n"
                    "- kpi_summary values must be REAL calculated numbers\n"
                    "- insight must contain real numbers"
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_completion_tokens=8000,
    )

    parsed = _load_json_response(response)
    normalized = _normalize_doc2chart_payload(parsed, rows, payload.columns, selected, payload.kpi)
    chart_slots = normalized.get("chart_slots") if isinstance(normalized.get("chart_slots"), list) else []

    console.print(f"[yellow]  -> Available charts:[/yellow] {len(selected)} types")
    console.print("[yellow]  -> Charts recommended:[/yellow]")
    for slot in chart_slots:
        if isinstance(slot, dict):
            slot_no = slot.get("slot", "?")
            chart_name = str(slot.get("recommended_type", "bar"))
            reason = str(slot.get("reason", "n/a"))
            console.print(f"[yellow]     [{slot_no}][/yellow] [white]{chart_name:15}[/white] <- {reason}")

    console.print("[green]  + DOC2CHART AGENT COMPLETE - 4 chart specs ready[/green]")
    console.print(Panel("[green]DOC2CHART AGENT COMPLETE[/green]", border_style="green"))
    return normalized


async def run_insights_agent(payload: InsightsRequest) -> dict[str, Any]:
    console.print(Panel("[bold blue]INSIGHTS AGENT STARTED[/bold blue]", border_style="blue"))
    console.print(f"[blue]  -> Analyzing {len(payload.rows)} rows...[/blue]")
    console.print(f"[blue]  -> Calling {MODEL_ID} for business insights...[/blue]")

    client = _make_client()
    response = client.chat.completions.create(
        model=MODEL_ID,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior business intelligence analyst. "
                    "Extract meaningful non-obvious insights. "
                    "Always use real numbers. Never state obvious facts. "
                    "Return ONLY valid JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"KPI: {payload.kpi}\n"
                    f"Data: {payload.rows}\n\n"
                    "Return ONLY this JSON:\n"
                    "{\n"
                    "  \"insights\": {\n"
                    "    \"descriptive\": \"What happened - with real numbers\",\n"
                    "    \"diagnostic\": \"Why it happened - with real numbers\",\n"
                    "    \"predictive\": \"What will likely happen\",\n"
                    "    \"prescriptive\": \"What action to take\",\n"
                    "    \"evaluative\": \"Performance vs benchmark\",\n"
                    "    \"exploratory\": \"Hidden pattern or anomaly with numbers\"\n"
                    "  },\n"
                    "  \"kpi_coverage_percent\": 85,\n"
                    "  \"top_insight\": \"Single most important finding\",\n"
                    "  \"voice_narration\": \"3-4 sentences, professional analyst tone, real numbers, suitable for text-to-speech\"\n"
                    "}"
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_completion_tokens=8000,
    )

    parsed = _load_json_response(response)
    insights = parsed.get("insights") if isinstance(parsed.get("insights"), dict) else {}
    top_insight = str(parsed.get("top_insight", ""))
    coverage = parsed.get("kpi_coverage_percent", "n/a")
    descriptive = str(insights.get("descriptive", ""))

    console.print(f"[blue]  -> Descriptive:[/blue] {descriptive[:60]}...")
    console.print(f"[blue]  -> Top insight:[/blue] {top_insight[:60]}...")
    console.print(f"[blue]  -> KPI Coverage:[/blue] [green]{coverage}%[/green]")
    console.print("[green]  + INSIGHTS AGENT COMPLETE[/green]")
    console.print(Panel("[green]INSIGHTS AGENT COMPLETE[/green]", border_style="green"))
    return parsed


@router.post("/sql")
async def sql_agent(payload: SqlAgentRequest) -> dict[str, Any]:
    try:
        return await run_sql_agent(payload)
    except Exception as exc:
        console.print(Panel(f"[bold red]SQL AGENT ERROR[/bold red]\n{exc}", border_style="red"))
        raise


@router.post("/deepprep")
async def deepprep_agent(payload: DeepPrepRequest) -> dict[str, Any]:
    try:
        return await run_deepprep_agent(payload)
    except Exception as exc:
        console.print(Panel(f"[bold red]DEEPPREP AGENT ERROR[/bold red]\n{exc}", border_style="red"))
        raise


@router.post("/doc2chart")
async def doc2chart_agent(payload: Doc2ChartRequest) -> dict[str, Any]:
    try:
        return await run_doc2chart_agent(payload)
    except Exception as exc:
        console.print(Panel(f"[bold red]DOC2CHART AGENT ERROR[/bold red]\n{exc}", border_style="red"))
        raise


@router.post("/insights")
async def insights_agent(payload: InsightsRequest) -> dict[str, Any]:
    try:
        return await run_insights_agent(payload)
    except Exception as exc:
        console.print(Panel(f"[bold red]INSIGHTS AGENT ERROR[/bold red]\n{exc}", border_style="red"))
        raise
