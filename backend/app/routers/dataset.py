from __future__ import annotations

import io
from typing import Any

import httpx
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.dynamic_dataset_service import dynamic_dataset_service

router = APIRouter(prefix="/dataset", tags=["dataset"])


class DatasetIngestRequest(BaseModel):
    url: str = Field(..., min_length=4)
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=3)


def _json_safe_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    df = pd.DataFrame(rows)
    if df.empty:
        return []
    df = df.where(pd.notna(df), None)
    return df.to_dict(orient="records")


@router.post("/ingest")
async def ingest_dataset(payload: DatasetIngestRequest) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        try:
            response = await client.get(payload.url)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=400, detail=f"Unable to fetch URL: {exc}") from exc

    content_type = (response.headers.get("content-type") or "").lower()
    url_lower = payload.url.lower()

    try:
        if "text/csv" in content_type or url_lower.endswith(".csv"):
            df = pd.read_csv(io.StringIO(response.text), low_memory=False)
        elif "application/json" in content_type or url_lower.endswith(".json"):
            data = response.json()
            if isinstance(data, dict):
                if isinstance(data.get("data"), list):
                    df = pd.DataFrame(data["data"])
                else:
                    df = pd.DataFrame([data])
            elif isinstance(data, list):
                df = pd.DataFrame(data)
            else:
                raise HTTPException(status_code=400, detail="Unsupported JSON shape. Provide object/list JSON data.")
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Provide CSV or JSON URL.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse dataset: {exc}") from exc

    if df.empty:
        raise HTTPException(status_code=400, detail="Parsed dataset is empty.")
    truncated = False
    original_count = len(df)
    if len(df) > 10000:
        df = df.head(10000).copy()
        truncated = True
    if len(df.columns) < 2:
        raise HTTPException(status_code=400, detail="Dataset must have at least 2 columns.")

    numeric_columns = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    if not numeric_columns:
        raise HTTPException(status_code=400, detail="Dataset must have at least 1 numeric column.")

    records = _json_safe_rows(df.to_dict(orient="records"))
    columns = dynamic_dataset_service.infer_columns(df)

    try:
        created = dynamic_dataset_service.create_dataset(
            user_id=payload.user_id,
            session_id=payload.session_id,
            source_url=payload.url,
            records=records,
            columns=columns,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "dataset_id": created.get("id"),
        "session_id": payload.session_id,
        "columns": columns,
        "row_count": len(records),
        "sample_rows": records[:5],
        "message": (
            f"Dataset loaded successfully (trimmed from {original_count} to 10000 rows)."
            if truncated
            else "Dataset loaded successfully"
        ),
    }


@router.delete("/cleanup/{session_id}")
async def cleanup_dataset(session_id: str) -> dict[str, Any]:
    try:
        deleted = dynamic_dataset_service.cleanup_session(session_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"deleted": deleted, "message": "Session data cleared"}


@router.get("/status/{session_id}")
async def dataset_status(session_id: str) -> dict[str, Any]:
    try:
        dataset = dynamic_dataset_service.get_dataset_for_session(session_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not dataset:
        return {"exists": False, "columns": [], "row_count": 0}

    return {
        "exists": True,
        "columns": dataset.get("columns") or [],
        "row_count": int(dataset.get("rowCount") or 0),
    }
