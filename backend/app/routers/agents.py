from __future__ import annotations

import json
import os
from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pydantic import BaseModel, Field

from app.services.dynamic_dataset_service import dynamic_dataset_service

router = APIRouter(prefix="/agent", tags=["agents"])


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


def _compute_human_readable(value: float) -> str:
    abs_value = abs(value)
    if abs_value >= 100000:
        return f"{value / 100000:.2f}L"
    if abs_value >= 1000:
        return f"{value / 1000:.1f}K"
    return f"{value:.2f}"


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


class InsightsRequest(BaseModel):
    rows: list[dict[str, Any]] = Field(default_factory=list)
    kpi: str = Field(..., min_length=2)
    dashboard_title: str | None = None


async def run_sql_agent(payload: SqlAgentRequest) -> dict[str, Any]:
    dataset = dynamic_dataset_service.get_dataset_for_session(payload.session_id, payload.user_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="No dynamic dataset found for the given session and user.")

    raw_data = dataset.get("rawData") or []
    if not isinstance(raw_data, list) or not raw_data:
        raise HTTPException(status_code=400, detail="Dynamic dataset has no rows.")

    columns_info = dataset.get("columns") or []
    columns = [c.get("name") for c in columns_info if isinstance(c, dict) and c.get("name")]
    row_count = int(dataset.get("rowCount") or len(raw_data))
    sample_rows = raw_data[:5]

    client = _make_client()
    response = client.chat.completions.create(
        model="gpt-5.4-mini-2026-03-17",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior data engineer specializing in business intelligence. "
                    "Your ONLY job is to analyze a dataset schema and write accurate query plans. "
                    "You understand business KPIs and map them to correct columns. "
                    "Never hallucinate column names — only use columns from the provided schema. "
                    "Return ONLY valid JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Dataset columns: {columns}\n"
                    f"Sample data (5 rows): {sample_rows}\n"
                    f"Total rows: {row_count}\n"
                    f"User KPI: {payload.kpi}\n\n"
                    "Analyze columns and generate a query plan.\n"
                    "Return JSON:\n"
                    "{\n"
                    "  \"identified_metric\": \"which column is the metric\",\n"
                    "  \"identified_dimensions\": [\"which columns are dimensions\"],\n"
                    "  \"aggregation\": \"SUM or AVG or COUNT\",\n"
                    "  \"group_by\": [\"columns to group by\"],\n"
                    "  \"order_by\": \"column to sort by\",\n"
                    "  \"limit\": 50,\n"
                    "  \"filter_conditions\": [],\n"
                    "  \"query_description\": \"what this query will return\"\n"
                    "}"
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_completion_tokens=8000,
    )

    query_plan = _load_json_response(response)

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
    return {
        "rows": rows,
        "query_plan": query_plan,
        "row_count": len(rows),
    }


async def run_deepprep_agent(payload: DeepPrepRequest) -> dict[str, Any]:
    rows = payload.rows or []
    df = pd.DataFrame(rows)

    client = _make_client()
    response = client.chat.completions.create(
        model="gpt-5.4-mini-2026-03-17",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a data preparation specialist with expertise in ETL pipelines. "
                    "Your job is to clean, transform and aggregate raw data for dashboard visualization. "
                    "You identify data quality issues, handle nulls, normalize formats, and produce "
                    "analysis-ready datasets. Always preserve data accuracy. Return ONLY valid JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Raw data columns: {payload.columns}\n"
                    f"Sample rows (first 10): {rows[:10]}\n"
                    f"Total rows: {len(rows)}\n"
                    f"KPI requested: {payload.kpi}\n\n"
                    "Analyze data quality and plan transformations.\n"
                    "Return JSON:\n"
                    "{\n"
                    "  \"quality_issues\": [\"list nulls, duplicates, format issues found\"],\n"
                    "  \"transformations_applied\": [\"list what will be cleaned/transformed\"],\n"
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

    # Normalize textual dimensions after null cleanup.
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
    return {
        "cleaned_rows": cleaned_rows,
        "transformations": transformations,
        "row_count": len(cleaned_rows),
    }


async def run_doc2chart_agent(payload: Doc2ChartRequest) -> dict[str, Any]:
    rows = payload.rows or []
    df = pd.DataFrame(rows)
    numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    text_cols = [c for c in df.columns if c not in numeric_cols]

    client = _make_client()
    response = client.chat.completions.create(
        model="gpt-5.4-mini-2026-03-17",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior data visualization expert and PowerBI dashboard designer. "
                    "You create visually stunning, information-dense dashboards. "
                    "You understand which chart types best represent different data patterns. "
                    "Return ONLY valid JSON, no markdown, no explanation."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"KPI: {payload.kpi}\n"
                    f"Data columns: {payload.columns}\n"
                    f"Numeric columns: {numeric_cols}\n"
                    f"Text/dimension columns: {text_cols}\n"
                    f"Sample data (first 5 rows): {json.dumps(rows[:5], ensure_ascii=True, indent=2)}\n"
                    f"Total rows: {len(rows)}\n\n"
                    "Generate EXACTLY 4 unique dashboard specifications.\n"
                    "Return JSON with top-level key 'dashboards'.\n"
                    "STRICT RULES: 4 dashboards, each with exactly 4 KPI cards, non-overlapping chart positions, "
                    "and insightText with real numbers from data.\n"
                    "COMPLEXITY RULES:\n"
                    "1. Use information-dense chart configs with meaningful subtitles and clear business purpose.\n"
                    "2. Include at least two charts per dashboard that use grouped or comparative multi-series data where possible.\n"
                    "3. Use diverse dimensions and avoid repeating the exact same chart logic across dashboards.\n"
                    "4. KPI cards must include real computed values and realistic deltas.\n"
                    "5. insightText must mention at least two concrete numeric facts from the provided data."
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_completion_tokens=8000,
    )

    parsed = _load_json_response(response)
    dashboards = parsed.get("dashboards") if isinstance(parsed.get("dashboards"), list) else []

    # Ensure exactly 4 dashboards are returned.
    dashboards = dashboards[:4]
    while len(dashboards) < 4:
        dashboards.append({
            "id": f"dashboard_{len(dashboards)+1}",
            "title": f"Dashboard {len(dashboards)+1}",
            "theme": {},
            "kpiCards": [],
            "charts": [],
            "insightText": "Insufficient model output; fallback dashboard generated.",
        })

    value_col = numeric_cols[0] if numeric_cols else None
    total = float(df[value_col].sum()) if value_col else 0.0
    avg = float(df[value_col].mean()) if value_col else 0.0
    max_value = float(df[value_col].max()) if value_col else 0.0
    min_value = float(df[value_col].min()) if value_col else 0.0

    kpi_cards = [
        {
            "id": "kpi_1",
            "label": f"Total {value_col or 'Value'}",
            "value": total,
            "formattedValue": _compute_human_readable(total),
            "delta": 0.0,
            "deltaDirection": "up",
            "deltaLabel": "overall",
        },
        {
            "id": "kpi_2",
            "label": f"Average {value_col or 'Value'}",
            "value": avg,
            "formattedValue": _compute_human_readable(avg),
            "delta": 0.0,
            "deltaDirection": "up",
            "deltaLabel": "per segment",
        },
        {
            "id": "kpi_3",
            "label": f"Peak {value_col or 'Value'}",
            "value": max_value,
            "formattedValue": _compute_human_readable(max_value),
            "delta": 0.0,
            "deltaDirection": "up",
            "deltaLabel": "max",
        },
        {
            "id": "kpi_4",
            "label": f"Min {value_col or 'Value'}",
            "value": min_value,
            "formattedValue": _compute_human_readable(min_value),
            "delta": 0.0,
            "deltaDirection": "down",
            "deltaLabel": "min",
        },
    ]

    for index, dashboard in enumerate(dashboards, start=1):
        if not isinstance(dashboard, dict):
            dashboards[index - 1] = {}
            dashboard = dashboards[index - 1]
        dashboard.setdefault("id", f"dashboard_{index}")
        dashboard.setdefault("title", f"Dashboard {index}")
        dashboard.setdefault("theme", {})
        dashboard["kpiCards"] = kpi_cards

        for chart in dashboard.get("charts", []):
            if isinstance(chart, dict) and "data" not in chart:
                chart["data"] = rows[:50]

        dashboard["insightText"] = (
            dashboard.get("insightText")
            or f"{value_col or 'Value'} totals {_compute_human_readable(total)} across {len(rows)} rows; peak {_compute_human_readable(max_value)}."
        )

    return {"dashboards": dashboards}


async def run_insights_agent(payload: InsightsRequest) -> dict[str, Any]:
    client = _make_client()
    response = client.chat.completions.create(
        model="gpt-5.4-mini-2026-03-17",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior business intelligence analyst. "
                    "You extract meaningful, non-obvious insights from data. "
                    "You cover 6 insight types: descriptive (what happened), diagnostic (why), "
                    "predictive (what will happen), prescriptive (what to do), evaluative (how good/bad), "
                    "exploratory (hidden patterns). Always use real numbers. Never state obvious facts. "
                    "Return ONLY valid JSON."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"KPI: {payload.kpi}\n"
                    f"Aggregated data: {payload.rows}\n\n"
                    "Return JSON:\n"
                    "{\n"
                    "  \"insights\": {\n"
                    "    \"descriptive\": \"What happened — 1 sentence with real numbers\",\n"
                    "    \"diagnostic\": \"Why it happened — 1 sentence with real numbers\",\n"
                    "    \"predictive\": \"What will likely happen — 1 sentence\",\n"
                    "    \"prescriptive\": \"What action to take — 1 sentence\",\n"
                    "    \"evaluative\": \"Performance rating with benchmark — 1 sentence\",\n"
                    "    \"exploratory\": \"Hidden pattern or anomaly — 1 sentence with numbers\"\n"
                    "  },\n"
                    "  \"kpi_coverage_percent\": 85,\n"
                    "  \"top_insight\": \"Single most important finding in 1 sentence\",\n"
                    "  \"voice_narration\": \"3-4 sentence spoken business commentary using real numbers, professional analyst tone\"\n"
                    "}"
                ),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.3,
        max_completion_tokens=8000,
    )
    return _load_json_response(response)


@router.post("/sql")
async def sql_agent(payload: SqlAgentRequest) -> dict[str, Any]:
    return await run_sql_agent(payload)


@router.post("/deepprep")
async def deepprep_agent(payload: DeepPrepRequest) -> dict[str, Any]:
    return await run_deepprep_agent(payload)


@router.post("/doc2chart")
async def doc2chart_agent(payload: Doc2ChartRequest) -> dict[str, Any]:
    return await run_doc2chart_agent(payload)


@router.post("/insights")
async def insights_agent(payload: InsightsRequest) -> dict[str, Any]:
    return await run_insights_agent(payload)
