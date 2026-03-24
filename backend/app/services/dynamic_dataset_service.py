from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


def _to_json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        if np.isnan(value):
            return None
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, (datetime, pd.Timestamp)):
        return value.isoformat()
    if pd.isna(value):
        return None
    return value


def _records_to_json_safe(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{k: _to_json_safe(v) for k, v in row.items()} for row in records]


class DynamicDatasetService:
    def __init__(self) -> None:
        self._engine: Engine | None = None

    def _get_engine(self) -> Engine:
        if self._engine is not None:
            return self._engine

        database_url = os.getenv("DATABASE_URL", "").strip()
        if not database_url:
            raise RuntimeError("DATABASE_URL is not configured.")

        self._engine = create_engine(database_url, future=True)
        return self._engine

    @staticmethod
    def infer_columns(df: pd.DataFrame) -> list[dict[str, str]]:
        columns: list[dict[str, str]] = []
        for col in df.columns:
            series = df[col]
            dtype = "string"
            if pd.api.types.is_numeric_dtype(series):
                dtype = "numeric"
            elif pd.api.types.is_datetime64_any_dtype(series):
                dtype = "date"
            else:
                # Lightweight date detection for object columns.
                if isinstance(col, str) and any(token in col.lower() for token in ["date", "time", "month", "year"]):
                    parsed = pd.to_datetime(series, errors="coerce")
                    if parsed.notna().mean() > 0.8:
                        dtype = "date"
            columns.append({"name": str(col), "dtype": dtype})
        return columns

    def create_dataset(
        self,
        *,
        user_id: str,
        session_id: str,
        source_url: str,
        records: list[dict[str, Any]],
        columns: list[dict[str, str]],
    ) -> dict[str, Any]:
        engine = self._get_engine()

        expires_at = datetime.now(timezone.utc) + timedelta(hours=2)
        dataset_id = uuid.uuid4().hex
        table_name = f"session_{session_id[:24]}"
        safe_records = _records_to_json_safe(records)

        with engine.begin() as conn:
            # Ensure user exists because DynamicDataset has a required relation.
            user_exists = conn.execute(
                text('SELECT 1 FROM "User" WHERE "id" = :user_id LIMIT 1'),
                {"user_id": user_id},
            ).scalar()
            if not user_exists:
                conn.execute(
                    text(
                        'INSERT INTO "User" ("id", "email", "createdAt", "updatedAt") '
                        'VALUES (:id, :email, NOW(), NOW()) '
                        'ON CONFLICT ("id") DO NOTHING'
                    ),
                    {
                        "id": user_id,
                        "email": f"temp_{user_id}@talkingbi.local",
                    },
                )

            conn.execute(
                text('DELETE FROM "DynamicDataset" WHERE "sessionId" = :session_id AND "userId" = :user_id'),
                {"session_id": session_id, "user_id": user_id},
            )

            created = conn.execute(
                text(
                    'INSERT INTO "DynamicDataset" '
                    '("id", "userId", "sessionId", "tableName", "rawData", "columns", "rowCount", "sourceUrl", "createdAt", "expiresAt") '
                    'VALUES (:id, :user_id, :session_id, :table_name, CAST(:raw_data AS jsonb), CAST(:columns AS jsonb), :row_count, :source_url, NOW(), :expires_at) '
                    'RETURNING "id", "sessionId", "rowCount", "columns", "rawData"'
                ),
                {
                    "id": dataset_id,
                    "user_id": user_id,
                    "session_id": session_id,
                    "table_name": table_name,
                    "raw_data": json.dumps(safe_records, ensure_ascii=True),
                    "columns": json.dumps(columns, ensure_ascii=True),
                    "row_count": len(safe_records),
                    "source_url": source_url,
                    "expires_at": expires_at,
                },
            ).mappings().first()

        if not created:
            raise RuntimeError("Failed to save dynamic dataset.")

        return dict(created)

    def get_dataset_for_session(self, session_id: str, user_id: str | None = None) -> dict[str, Any] | None:
        engine = self._get_engine()

        query = (
            'SELECT "id", "userId", "sessionId", "tableName", "rawData", "columns", "rowCount", "sourceUrl", "createdAt", "expiresAt" '
            'FROM "DynamicDataset" WHERE "sessionId" = :session_id AND "expiresAt" > NOW() '
        )
        params: dict[str, Any] = {"session_id": session_id}
        if user_id:
            query += 'AND "userId" = :user_id '
            params["user_id"] = user_id
        query += 'ORDER BY "createdAt" DESC LIMIT 1'

        with engine.begin() as conn:
            row = conn.execute(text(query), params).mappings().first()

        if not row:
            return None

        data = dict(row)
        if isinstance(data.get("rawData"), str):
            data["rawData"] = json.loads(data["rawData"])
        if isinstance(data.get("columns"), str):
            data["columns"] = json.loads(data["columns"])
        return data

    def cleanup_session(self, session_id: str) -> int:
        engine = self._get_engine()
        with engine.begin() as conn:
            by_session = conn.execute(
                text('DELETE FROM "DynamicDataset" WHERE "sessionId" = :session_id'),
                {"session_id": session_id},
            ).rowcount or 0
            expired = conn.execute(
                text('DELETE FROM "DynamicDataset" WHERE "expiresAt" < NOW()')
            ).rowcount or 0
        return int(by_session + expired)


dynamic_dataset_service = DynamicDatasetService()
