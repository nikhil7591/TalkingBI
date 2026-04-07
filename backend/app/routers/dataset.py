from __future__ import annotations

import io
import re
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

import httpx
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, inspect

try:
    from pymongo import MongoClient  # type: ignore
except Exception:  # pragma: no cover
    MongoClient = None

try:
    from neo4j import GraphDatabase  # type: ignore
except Exception:  # pragma: no cover
    GraphDatabase = None

from app.services.dynamic_dataset_service import dynamic_dataset_service

router = APIRouter(prefix="/dataset", tags=["dataset"])

SQL_SCHEMES = {
    "postgresql",
    "postgresql+psycopg2",
    "mysql",
    "mysql+pymysql",
    "mariadb",
    "mariadb+pymysql",
    "sqlite",
    "mssql",
    "sqlserver",
    "oracle",
    "redshift",
}

MONGO_SCHEMES = {"mongodb", "mongodb+srv"}

NEO4J_SCHEMES = {"neo4j", "neo4j+s", "neo4j+ssc", "bolt", "bolt+s", "bolt+ssc"}


class DatasetIngestRequest(BaseModel):
    url: str = Field(..., min_length=4)
    user_id: str = Field(..., min_length=1)
    session_id: str = Field(..., min_length=3)


def _normalize_database_url(url: str) -> str:
    lowered = url.lower()
    if lowered.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    if lowered.startswith("redshift://"):
        return "postgresql://" + url[len("redshift://"):]
    if lowered.startswith("mysql2://"):
        return "mysql+pymysql://" + url[len("mysql2://"):]
    if lowered.startswith("sqlserver://"):
        return "mssql://" + url[len("sqlserver://"):]
    return url


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
    scheme = urlparse(url).scheme.lower()
    return scheme in SQL_SCHEMES or scheme in MONGO_SCHEMES or scheme in NEO4J_SCHEMES


def _cloud_provider_from_url(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    if not host:
        return "local"
    if any(token in host for token in ["amazonaws.com", "aws", "rds.", "neptune."]):
        return "aws"
    if any(token in host for token in ["googleapis.com", "gcp", "cloudsql", "cloud.google"]):
        return "gcp"
    if any(token in host for token in ["azure.com", "database.windows.net", "cosmos.azure.com"]):
        return "azure"
    return "self_hosted"


def _detect_source_type(url: str, content_type: str = "") -> str:
    parsed = urlparse(url)
    scheme = parsed.scheme.lower()
    url_lower = url.lower()
    content_type = content_type.lower()

    if scheme in MONGO_SCHEMES:
        return "mongodb"
    if scheme in NEO4J_SCHEMES:
        return "neo4j"
    if scheme in SQL_SCHEMES:
        return "sql_database"
    if "text/csv" in content_type or url_lower.endswith(".csv") or "drive.google.com/uc?export=download" in url_lower:
        return "csv"
    if "application/json" in content_type or url_lower.endswith(".json"):
        return "json"
    return "api"


def _infer_date_columns(df: pd.DataFrame) -> list[str]:
    date_columns: list[str] = []
    for col in df.columns:
        series = df[col]
        if pd.api.types.is_datetime64_any_dtype(series):
            date_columns.append(str(col))
            continue

        if not pd.api.types.is_object_dtype(series):
            continue

        col_name = str(col).lower()
        if not any(token in col_name for token in ["date", "time", "month", "year"]):
            continue

        sample = series.dropna().head(300)
        if sample.empty:
            continue

        try:
            parsed = pd.to_datetime(sample, errors="coerce", format="mixed")
        except TypeError:
            parsed = pd.to_datetime(sample, errors="coerce")
        if parsed.notna().mean() >= 0.7:
            date_columns.append(str(col))

    return date_columns


def _build_dataset_overview(df: pd.DataFrame, source_url: str, source_type: str) -> dict[str, Any]:
    numeric_columns = [str(col) for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]
    date_columns = _infer_date_columns(df)
    date_set = set(date_columns)
    categorical_columns = [str(col) for col in df.columns if str(col) not in date_set and str(col) not in numeric_columns]

    missing_by_col = []
    for col, count in df.isna().sum().to_dict().items():
        missing = int(count or 0)
        if missing > 0:
            missing_by_col.append({"column": str(col), "missing": missing})
    missing_by_col.sort(key=lambda item: item["missing"], reverse=True)

    return {
        "source_type": source_type,
        "cloud_provider": _cloud_provider_from_url(source_url),
        "database_engine": (urlparse(source_url).scheme or "").lower() if source_type in {"sql_database", "mongodb", "neo4j"} else None,
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "numeric_columns": numeric_columns[:12],
        "categorical_columns": categorical_columns[:12],
        "date_columns": date_columns[:12],
        "missing_cells": int(df.isna().sum().sum()),
        "duplicate_rows": int(df.duplicated().sum()) if not df.empty else 0,
        "top_missing_columns": missing_by_col[:5],
    }


def _fallback_clean_preview(df: pd.DataFrame) -> dict[str, Any]:
    working = df.copy()
    quality_issues: list[str] = []
    transformations: list[str] = []

    duplicate_rows = int(working.duplicated().sum()) if not working.empty else 0
    if duplicate_rows > 0:
        quality_issues.append(f"Found {duplicate_rows} duplicate rows in source preview")

    missing_cells = int(working.isna().sum().sum()) if not working.empty else 0
    if missing_cells > 0:
        quality_issues.append(f"Found {missing_cells} missing values in source preview")

    before = len(working)
    working = working.drop_duplicates()
    if len(working) != before:
        transformations.append(f"Deduplicated rows: {before} -> {len(working)}")

    text_cols_touched = 0
    for col in working.columns:
        if pd.api.types.is_object_dtype(working[col]) or pd.api.types.is_string_dtype(working[col]):
            cleaned = working[col].apply(lambda value: value.strip() if isinstance(value, str) else value)
            if not cleaned.equals(working[col]):
                text_cols_touched += 1
            working[col] = cleaned
    if text_cols_touched:
        transformations.append(f"Trimmed whitespace in {text_cols_touched} text columns")

    numeric_columns = [c for c in working.columns if pd.api.types.is_numeric_dtype(working[c])]
    if numeric_columns:
        metric_col = numeric_columns[0]
        null_metric_count = int(working[metric_col].isna().sum())
        if null_metric_count:
            working = working.dropna(subset=[metric_col])
            transformations.append(f"Dropped {null_metric_count} null metric rows from '{metric_col}'")

    if not quality_issues:
        quality_issues.append("No critical quality issues detected in preview rows")
    if not transformations:
        transformations.append("No major cleaning actions were required")

    cleaned_rows = _json_safe_rows(working.head(8).to_dict(orient="records"))
    return {
        "quality_issues": quality_issues,
        "transformations": transformations,
        "cleaned_row_count": int(len(working)),
        "cleaned_sample_rows": cleaned_rows,
    }


async def _generate_deepprep_preview(df: pd.DataFrame, columns: list[dict[str, str]]) -> dict[str, Any]:
    try:
        from app.routers.agents import DeepPrepRequest, run_deepprep_agent

        preview_rows = _json_safe_rows(df.head(300).to_dict(orient="records"))
        deep_result = await run_deepprep_agent(
            DeepPrepRequest(
                rows=preview_rows,
                columns=[str(col.get("name", "")) for col in columns if isinstance(col, dict) and col.get("name")],
                kpi="Initial dataset quality check",
            )
        )
        cleaned_rows = deep_result.get("cleaned_rows") if isinstance(deep_result, dict) else []
        return {
            "quality_issues": deep_result.get("quality_issues") if isinstance(deep_result, dict) else [],
            "transformations": deep_result.get("transformations") if isinstance(deep_result, dict) else [],
            "cleaned_row_count": int((deep_result.get("row_count") if isinstance(deep_result, dict) else 0) or len(cleaned_rows or [])),
            "cleaned_sample_rows": (cleaned_rows or [])[:8],
        }
    except Exception:
        return _fallback_clean_preview(df)


def _load_from_sql_database(db_url: str) -> pd.DataFrame:
    try:
        engine = create_engine(db_url, pool_pre_ping=True, future=True)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to initialize SQL database connection. "
                "Verify URL format, credentials, and required driver packages. "
                f"Details: {exc}"
            ),
        ) from exc

    inspector = inspect(engine)

    table_refs: list[tuple[str | None, str]] = []
    schema_candidates: list[str | None] = [None]

    try:
        for schema_name in inspector.get_schema_names():
            lowered = schema_name.lower()
            if lowered in {"information_schema", "pg_catalog", "sys", "mysql", "performance_schema"}:
                continue
            schema_candidates.append(schema_name)
    except Exception:
        pass

    if "public" not in schema_candidates:
        schema_candidates.append("public")

    seen_schema: set[str] = set()
    ordered_schemas: list[str | None] = []
    for schema in schema_candidates:
        key = (schema or "").lower()
        if key in seen_schema:
            continue
        seen_schema.add(key)
        ordered_schemas.append(schema)

    for schema in ordered_schemas:
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
    deduped.sort(key=lambda item: ((item[0] or "").lower() in {"pg_catalog", "information_schema", "sys"}, item[1].startswith("_") or item[1].startswith("pg_"), item[1]))
    schema, first_table = deduped[0]
    safe_table = first_table.replace('"', '""')
    quoted_table = f'"{safe_table}"'
    if schema:
        safe_schema = schema.replace('"', '""')
        quoted_table = f'"{safe_schema}".{quoted_table}'

    for query in [
        f"SELECT * FROM {quoted_table} LIMIT 10000",
        f'SELECT * FROM "{safe_table}" LIMIT 10000',
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
    default_db = None
    try:
        default_db = client.get_default_database()
    except Exception:
        default_db = None

    db_name = default_db.name if default_db is not None else None
    if not db_name:
        db_name = (urlparse(db_url).path or "").lstrip("/") or None

    if not db_name:
        raise HTTPException(status_code=400, detail="MongoDB URL must include database name.")
    try:
        db = client[db_name]
        collections = db.list_collection_names()
        if not collections:
            raise HTTPException(status_code=400, detail="No collections found in MongoDB database.")
        col = db[collections[0]]
        docs = list(col.find({}, {"_id": 0}).limit(10000))
        return pd.DataFrame(docs)
    finally:
        client.close()


def _load_from_neo4j_database(db_url: str) -> pd.DataFrame:
    if GraphDatabase is None:
        raise HTTPException(status_code=400, detail="Neo4j URL support requires neo4j package.")

    parsed = urlparse(db_url)
    username = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    if not username or not password:
        params = parse_qs(parsed.query)
        username = username or (params.get("user", [""])[0] or params.get("username", [""])[0])
        password = password or (params.get("password", [""])[0] or params.get("pass", [""])[0])
    host = parsed.hostname

    if not host:
        raise HTTPException(status_code=400, detail="Neo4j URL must include hostname.")
    if not username or not password:
        raise HTTPException(status_code=400, detail="Neo4j URL must include username and password.")

    port = parsed.port
    scheme = parsed.scheme.lower()
    driver_url = f"{scheme}://{host}"
    if port:
        driver_url = f"{driver_url}:{port}"

    database_name = (parsed.path or "").lstrip("/") or "neo4j"
    driver = GraphDatabase.driver(driver_url, auth=(username, password))

    try:
        with driver.session(database=database_name) as session:
            records = session.run(
                "MATCH (n) RETURN labels(n) AS labels, properties(n) AS props LIMIT 10000"
            ).data()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unable to query Neo4j URL: {exc}") from exc
    finally:
        driver.close()

    if not records:
        raise HTTPException(status_code=400, detail="No nodes found in Neo4j database.")

    flattened: list[dict[str, Any]] = []
    for item in records:
        row: dict[str, Any] = {}
        props = item.get("props") if isinstance(item, dict) else None
        if isinstance(props, dict):
            row.update(props)

        labels = item.get("labels") if isinstance(item, dict) else None
        if isinstance(labels, list):
            row["_labels"] = ", ".join(str(label) for label in labels)
        elif labels:
            row["_labels"] = str(labels)

        flattened.append(row)

    return pd.DataFrame(flattened)


def _json_safe_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    df = pd.DataFrame(rows)
    if df.empty:
        return []
    df = df.where(pd.notna(df), None)
    return df.to_dict(orient="records")


@router.post("/ingest")
async def ingest_dataset(payload: DatasetIngestRequest) -> dict[str, Any]:
    source_url = _normalize_database_url(_convert_google_drive_url(payload.url.strip()))
    source_type = _detect_source_type(source_url)

    try:
        if _is_db_url(source_url):
            parsed_scheme = urlparse(source_url).scheme.lower()
            if parsed_scheme in MONGO_SCHEMES:
                df = _load_from_mongo_database(source_url)
            elif parsed_scheme in NEO4J_SCHEMES:
                df = _load_from_neo4j_database(source_url)
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
            source_type = _detect_source_type(source_url, content_type)

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
    overview = _build_dataset_overview(df, source_url, source_type)
    deepprep = await _generate_deepprep_preview(df, columns)

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
        "overview": overview,
        "deepprep": deepprep,
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
