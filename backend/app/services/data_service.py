from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import pandas as pd

from app.services.kpi_service import kpi_service
from app.utils.helpers import normalize_key


class DataService:
    def __init__(self) -> None:
        backend_root = Path(__file__).resolve().parents[2]
        configured = os.getenv("DATA_FOLDER", "../data")
        data_path = Path(configured)
        self.data_folder = data_path if data_path.is_absolute() else (backend_root / data_path).resolve()
        self.catalog: dict[str, list[dict[str, Any]]] = {}

    def scan_datasets(self) -> dict[str, list[dict[str, Any]]]:
        catalog: dict[str, list[dict[str, Any]]] = {}
        if not self.data_folder.exists():
            self.catalog = {}
            return self.catalog

        for dataset_dir in sorted([d for d in self.data_folder.iterdir() if d.is_dir()]):
            dataset_name = dataset_dir.name
            entries: list[dict[str, Any]] = []
            for csv_path in sorted(dataset_dir.glob("*.csv")):
                try:
                    sample_df = pd.read_csv(csv_path, nrows=200, low_memory=False)
                    with csv_path.open("r", encoding="utf-8", errors="ignore") as fp:
                        row_count = max(sum(1 for _ in fp) - 1, 0)
                    entries.append(
                        {
                            "file_path": str(csv_path),
                            "columns": sample_df.columns.tolist(),
                            "row_count": row_count,
                        }
                    )
                except Exception:
                    continue
            if entries:
                catalog[dataset_name] = entries

        self.catalog = catalog
        return self.catalog

    def list_datasets(self) -> dict[str, list[dict[str, Any]]]:
        if not self.catalog:
            self.scan_datasets()
        return self.catalog

    def _pick_dataset_file(self, kpi: str) -> tuple[str | None, Path | None]:
        candidates = kpi_service.get_candidate_datasets(kpi)
        if not self.catalog:
            self.scan_datasets()

        for dataset in candidates:
            files = self.catalog.get(dataset)
            if files:
                return dataset, Path(files[0]["file_path"])

        for dataset, files in self.catalog.items():
            if files:
                return dataset, Path(files[0]["file_path"])

        return None, None

    def prepare_aggregated_rows(self, kpi: str, max_rows: int = 60) -> dict[str, Any]:
        dataset_name, file_path = self._pick_dataset_file(kpi)
        if not file_path or not dataset_name:
            return {
                "dataset": None,
                "columns": [],
                "rows": [],
                "meta": {"message": "No readable datasets found."},
            }

        files = self.catalog.get(dataset_name, [])
        dataframes: list[pd.DataFrame] = []
        for file_info in files:
            try:
                dataframes.append(pd.read_csv(file_info["file_path"], low_memory=False))
            except Exception:
                continue

        if not dataframes:
            return {
                "dataset": dataset_name,
                "columns": [],
                "rows": [],
                "meta": {"message": "Dataset files are not readable."},
            }

        df = dataframes[0]
        for next_df in dataframes[1:]:
            common = [c for c in df.columns if c in next_df.columns]
            join_key = None
            for candidate in ["Order ID", "OrderID", "CustomerName", "Product Name", "Date"]:
                if candidate in common:
                    join_key = candidate
                    break

            if join_key:
                df = df.merge(next_df, how="left", on=join_key)
            else:
                # Fall back to vertical append when no reliable join key exists.
                aligned = [c for c in next_df.columns if c in df.columns]
                if aligned:
                    df = pd.concat([df, next_df[aligned]], ignore_index=True)
        terms = kpi_service.get_terms_from_query(kpi)
        mapped_columns = kpi_service.get_columns_for_terms(terms)

        available_columns = set(df.columns)
        usable_columns = [c for c in mapped_columns if c in available_columns]

        dimension_priority = [
            "Month",
            "Year",
            "Quarter",
            "Region",
            "State",
            "City",
            "Category",
            "Sub-Category",
            "Segment",
            "Product Name",
            "PaymentMode",
            "Ship Mode",
        ]
        dimensions = [c for c in dimension_priority if c in usable_columns or c in available_columns and c in dimension_priority]

        numeric_columns = [
            col
            for col in df.columns
            if pd.api.types.is_numeric_dtype(df[col])
            and col.lower() not in {"postal code", "zip"}
        ]

        preferred_metric_names = ["Sales", "Amount", "Profit", "Quantity", "AOV", "Discount", "Cost"]
        metric = next((m for m in preferred_metric_names if m in df.columns and m in numeric_columns), None)
        if metric is None and numeric_columns:
            metric = numeric_columns[0]

        if metric is None:
            # If no numeric metric exists, return a compact sample view.
            sample = df.head(max_rows).fillna("")
            return {
                "dataset": dataset_name,
                "columns": [normalize_key(c) for c in sample.columns.tolist()],
                "rows": sample.rename(columns=lambda c: normalize_key(c)).to_dict(orient="records"),
                "meta": {"message": "No numeric measure found; returned sample rows."},
            }

        group_dims = [d for d in dimensions if d in df.columns][:2]
        if group_dims:
            grouped = (
                df[group_dims + [metric]]
                .dropna(subset=[metric])
                .groupby(group_dims, dropna=False, as_index=False)[metric]
                .sum()
                .sort_values(by=metric, ascending=False)
                .head(max_rows)
            )
        else:
            grouped = pd.DataFrame({metric: [float(df[metric].fillna(0).sum())]})

        grouped = grouped.fillna("")
        normalized_df = grouped.rename(columns=lambda c: normalize_key(c))

        return {
            "dataset": dataset_name,
            "columns": normalized_df.columns.tolist(),
            "rows": normalized_df.to_dict(orient="records"),
            "meta": {
                "source_file": str(file_path),
                "metric": normalize_key(metric),
                "dimensions": [normalize_key(d) for d in group_dims],
                "row_count": len(normalized_df),
            },
        }


data_service = DataService()
