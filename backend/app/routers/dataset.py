from __future__ import annotations

import io
import re
from typing import Any

import httpx
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, inspect

try:
    from pymongo import MongoClient  # type: ignore
except Exception:  # pragma: no cover
    MongoClient = None

from app.services.dynamic_dataset_service import dynamic_dataset_service

router = APIRouter(prefix="/dataset", tags=["dataset"])


class DatasetIngestRequest(BaseModel):
    url: str = Field(..., min_length=4)
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=3)


def _convert_google_drive_url(url: str) -> str:
    if "drive.google.com" not in url:
        return url

    file_id_match = re.search(r"/d/([a-zA-Z0-9_-]+)", url)
    if not file_id_match:
        file_id_match = re.search(r"id=([a-zA-Z0-9_-]+)", url)

    if not file_id_match:
        return url

    file_id = file_id_match.group(1)
    return f"https://drive.google.com/uc?export=download&id={file_id}"


def _is_db_url(url: str) -> bool:
    return url.startswith((
        "postgresql://",
        "mysql://",
        "mysql+pymysql://",
        "sqlite://",
        "mssql://",
        "oracle://",
        "mongodb://",
        "mongodb+srv://",
    ))


def _load_from_sql_database(db_url: str) -> pd.DataFrame:
    engine = create_engine(db_url, pool_pre_ping=True, future=True)
    inspector = inspect(engine)

    table_refs: list[tuple[str | None, str]] = []
    for schema in [None, "public"]:
        try:
            tables = inspector.get_table_names(schema=schema)
        except Exception:
            tables = []
        for table in tables:
            table_refs.append((schema, table))

    deduped: list[tuple[str | None, str]] = []
    seen: set[str] = set()
    for schema, table in table_refs:
        key = f"{schema or ''}.{table}"
        if key not in seen:
            deduped.append((schema, table))
            seen.add(key)

    if not deduped:
        raise HTTPException(status_code=400, detail="No tables found in SQL database URL.")

    # Prefer user-like tables first.
    deduped.sort(key=lambda item: (item[1].startswith("_") or item[1].startswith("pg_"), item[1]))
    schema, first_table = deduped[0]
    quoted_table = f'"{first_table}"'
    if schema:
        quoted_table = f'"{schema}".{quoted_table}'

    for query in [
        f"SELECT * FROM {quoted_table} LIMIT 10000",
        f'SELECT * FROM "{first_table}" LIMIT 10000',
        f"SELECT * FROM {first_table} LIMIT 10000",
    ]:
        try:
            return pd.read_sql_query(query, engine)
        except Exception:
            continue

    raise HTTPException(status_code=400, detail=f"Could not read table '{first_table}' from SQL database URL.")


def _load_from_mongo_database(db_url: str) -> pd.DataFrame:
    if MongoClient is None:
        raise HTTPException(status_code=400, detail="MongoDB URL support requires pymongo package.")

    client = MongoClient(db_url)
    db_name = client.get_default_database().name if client.get_default_database() is not None else None
    if not db_name:
        raise HTTPException(status_code=400, detail="MongoDB URL must include database name.")
    db = client[db_name]
    collections = db.list_collection_names()
    if not collections:
        raise HTTPException(status_code=400, detail="No collections found in MongoDB database.")
    col = db[collections[0]]
    docs = list(col.find({}, {"_id": 0}).limit(10000))
    return pd.DataFrame(docs)


def _json_safe_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    df = pd.DataFrame(rows)
    if df.empty:
        return []
    df = df.where(pd.notna(df), None)
    return df.to_dict(orient="records")


@router.post("/ingest")
async def ingest_dataset(payload: DatasetIngestRequest) -> dict[str, Any]:
    source_url = _convert_google_drive_url(payload.url.strip())

    try:
        if _is_db_url(source_url):
            if source_url.startswith(("mongodb://", "mongodb+srv://")):
                df = _load_from_mongo_database(source_url)
            else:
                df = _load_from_sql_database(source_url)
        else:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                try:
                    response = await client.get(source_url)
                except httpx.HTTPError as exc:
                    raise HTTPException(status_code=400, detail=f"Unable to fetch URL: {exc}") from exc

            content_type = (response.headers.get("content-type") or "").lower()
            url_lower = source_url.lower()

            if "text/csv" in content_type or url_lower.endswith(".csv") or "drive.google.com/uc?export=download" in url_lower:
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
                raise HTTPException(status_code=400, detail="Unsupported source. Use CSV/JSON URL, Google Drive CSV link, or database URL.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse dataset source: {exc}") from exc

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
        # Keep ingestion resilient for text-heavy sources by adding a numeric helper column.
        df = df.copy()
        df["_row_index"] = range(1, len(df) + 1)

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
