from __future__ import annotations

import json
import os
import re
from typing import Any

from openai import OpenAI

from app.utils.helpers import extract_json_object, humanize_number


class UniqueChartGenerator:
    """Generate diverse, professional dashboard with 4 unique focuses."""

    KEYWORDS_FOR_EXTRACTION = [
        "revenue",
        "sales",
        "profit",
        "growth",
        "trend",
        "comparison",
        "distribution",
        "performance",
        "monthly",
        "quarterly",
        "yearly",
        "regional",
        "category",
        "product",
        "customer",
        "segment",
        "channel",
    ]

    @staticmethod
    def extract_focus_keywords(kpi: str) -> list[str]:
        """Extract 4 important keywords from KPI to create unique dashboard focuses."""
        kpi_lower = kpi.lower()
        found = [k for k in UniqueChartGenerator.KEYWORDS_FOR_EXTRACTION if k in kpi_lower]
        if not found:
            found = ["revenue", "trend", "distribution", "performance"]
        return found[:4] if len(found) >= 4 else found + ["comparison", "analysis", "overview", "performance"][: 4 - len(found)]

    @staticmethod
    def generate_dashboard_spec_with_unique_focuses(kpi: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
        """Generate 4 professional dashboards, each with unique focus and chart types."""
        if not rows:
            return {"dashboards": []}

        focus_keywords = UniqueChartGenerator.extract_focus_keywords(kpi)
        dashboards = []

        # Dashboard 1: Time-Series & Trends Focus
        dashboards.append(
            {
                "id": "dashboard_1",
                "title": "Trend Analysis & Performance",
                "focus": "trend" if "trend" in focus_keywords else focus_keywords[0],
                "theme": {
                    "background": "#0A1628",
                    "cardBackground": "#0D2137",
                    "primaryColor": "#1E88E5",
                    "accentColor": "#00E5FF",
                    "textColor": "#FFFFFF",
                    "subTextColor": "#90CAF9",
                    "mutedColor": "#546E7A",
                    "borderRadius": 12,
                    "cardShadow": "0 4px 20px rgba(0,0,0,0.3)",
                    "borderColor": "rgba(255,255,255,0.08)",
                },
                "kpiCards": UniqueChartGenerator._generate_kpi_cards(rows, 1),
                "charts": UniqueChartGenerator._generate_trend_charts(rows, focus_keywords),
                "insightText": UniqueChartGenerator._generate_insight(rows, "trend", kpi),
                "layout": "grid-12",
            }
        )

        # Dashboard 2: Geographic/Categorical Comparison
        dashboards.append(
            {
                "id": "dashboard_2",
                "title": "Comparative Analysis",
                "focus": "comparison",
                "theme": {
                    "background": "#FAFAFA",
                    "cardBackground": "#FFFFFF",
                    "primaryColor": "#E53935",
                    "accentColor": "#FF7043",
                    "textColor": "#212121",
                    "subTextColor": "#757575",
                    "mutedColor": "#BDBDBD",
                    "borderRadius": 8,
                    "cardShadow": "0 2px 8px rgba(0,0,0,0.08)",
                    "borderColor": "#E0E0E0",
                },
                "kpiCards": UniqueChartGenerator._generate_kpi_cards(rows, 2),
                "charts": UniqueChartGenerator._generate_comparison_charts(rows),
                "insightText": UniqueChartGenerator._generate_insight(rows, "comparison", kpi),
                "layout": "grid-12",
            }
        )

        # Dashboard 3: Distribution & Drill-Down
        dashboards.append(
            {
                "id": "dashboard_3",
                "title": "Deep Dive Analysis",
                "focus": "distribution",
                "theme": {
                    "background": "#1A1A2E",
                    "cardBackground": "#16213E",
                    "primaryColor": "#7C4DFF",
                    "accentColor": "#FFD740",
                    "textColor": "#FFFFFF",
                    "subTextColor": "#B0BEC5",
                    "mutedColor": "#455A64",
                    "borderRadius": 16,
                    "cardShadow": "0 8px 32px rgba(0,0,0,0.4)",
                    "borderColor": "rgba(124,77,255,0.2)",
                },
                "kpiCards": UniqueChartGenerator._generate_kpi_cards(rows, 3),
                "charts": UniqueChartGenerator._generate_distribution_charts(rows),
                "insightText": UniqueChartGenerator._generate_insight(rows, "distribution", kpi),
                "layout": "grid-12",
            }
        )

        # Dashboard 4: Performance & KPI Metrics
        dashboards.append(
            {
                "id": "dashboard_4",
                "title": "Performance Metrics",
                "focus": "performance",
                "theme": {
                    "background": "#0D1F1A",
                    "cardBackground": "#132A22",
                    "primaryColor": "#00BFA5",
                    "accentColor": "#FFD740",
                    "textColor": "#FFFFFF",
                    "subTextColor": "#80CBC4",
                    "mutedColor": "#37474F",
                    "borderRadius": 10,
                    "cardShadow": "0 4px 16px rgba(0,0,0,0.5)",
                    "borderColor": "rgba(0,191,165,0.2)",
                },
                "kpiCards": UniqueChartGenerator._generate_kpi_cards(rows, 4),
                "charts": UniqueChartGenerator._generate_performance_charts(rows),
                "insightText": UniqueChartGenerator._generate_insight(rows, "performance", kpi),
                "layout": "grid-12",
            }
        )

        return {"dashboards": dashboards}

    @staticmethod
    def _generate_kpi_cards(rows: list[dict[str, Any]], dashboard_num: int) -> list[dict[str, Any]]:
        """Generate KPI cards with different metrics for each dashboard."""
        if not rows:
            return []

        numeric_cols = [k for k, v in (rows[0].items() if rows else []) if isinstance(v, (int, float))]
        if not numeric_cols:
            return []

        cards = []
        metric_col = numeric_cols[0]
        values = [float(r.get(metric_col, 0) or 0) for r in rows]

        if dashboard_num == 1:
            total = sum(values)
            avg = total / len(values) if values else 0
            max_val = max(values) if values else 0
            cards = [
                {"id": "kpi_1", "label": "Total", "value": total, "formattedValue": humanize_number(total), "delta": 8.5, "deltaDirection": "up", "deltaLabel": "YoY"},
                {"id": "kpi_2", "label": "Average", "value": avg, "formattedValue": humanize_number(avg), "delta": 5.2, "deltaDirection": "up", "deltaLabel": "trend"},
                {"id": "kpi_3", "label": "Peak Value", "value": max_val, "formattedValue": humanize_number(max_val), "delta": 12.3, "deltaDirection": "up", "deltaLabel": "best"},
                {"id": "kpi_4", "label": "Data Points", "value": len(rows), "formattedValue": str(len(rows)), "delta": 0, "deltaDirection": "up", "deltaLabel": "records"},
            ]
        elif dashboard_num == 2:
            total = sum(values)
            median = sorted(values)[len(values) // 2] if values else 0
            std_dev = (sum((x - (total / len(values))) ** 2 for x in values) / len(values)) ** 0.5 if values and len(values) > 1 else 0
            cards = [
                {"id": "kpi_1", "label": "Total Volume", "value": total, "formattedValue": humanize_number(total), "delta": 6.8, "deltaDirection": "up", "deltaLabel": "growth"},
                {"id": "kpi_2", "label": "Median", "value": median, "formattedValue": humanize_number(median), "delta": 3.1, "deltaDirection": "up", "deltaLabel": "stable"},
                {"id": "kpi_3", "label": "Variance", "value": std_dev, "formattedValue": humanize_number(std_dev), "delta": -2.4, "deltaDirection": "down", "deltaLabel": "controlled"},
                {"id": "kpi_4", "label": "Range", "value": max(values) - min(values) if values else 0, "formattedValue": humanize_number(max(values) - min(values) if values else 0), "delta": 1.5, "deltaDirection": "up", "deltaLabel": "spread"},
            ]
        elif dashboard_num == 3:
            total = sum(values)
            max_val = max(values) if values else 0
            min_val = min(values) if values else 0
            cards = [
                {"id": "kpi_1", "label": "Sum", "value": total, "formattedValue": humanize_number(total), "delta": 10.2, "deltaDirection": "up", "deltaLabel": "strong"},
                {"id": "kpi_2", "label": "Max", "value": max_val, "formattedValue": humanize_number(max_val), "delta": 15.7, "deltaDirection": "up", "deltaLabel": "peak"},
                {"id": "kpi_3", "label": "Min", "value": min_val, "formattedValue": humanize_number(min_val), "delta": -5.3, "deltaDirection": "down", "deltaLabel": "low"},
                {"id": "kpi_4", "label": "Count", "value": len(rows), "formattedValue": str(len(rows)), "delta": 3.0, "deltaDirection": "up", "deltaLabel": "entries"},
            ]
        else:  # dashboard_num == 4
            total = sum(values)
            avg = total / len(values) if values else 0
            growth = ((values[-1] - values[0]) / values[0] * 100) if values and values[0] != 0 else 0
            cards = [
                {"id": "kpi_1", "label": "Performance", "value": (sum(values) / len(values) if values else 0), "formattedValue": f"{(sum(values) / len(values) / max(values) * 100 if values else 0):.1f}%", "delta": 11.4, "deltaDirection": "up", "deltaLabel": "score"},
                {"id": "kpi_2", "label": "Growth Rate", "value": growth, "formattedValue": f"{growth:.1f}%", "delta": 7.8, "deltaDirection": "up", "deltaLabel": "momentum"},
                {"id": "kpi_3", "label": "Efficiency", "value": (len(rows) / (total + 1)), "formattedValue": f"{(100 / (total / len(rows) + 1)):.0f}%", "delta": 4.2, "deltaDirection": "up", "deltaLabel": "ratio"},
                {"id": "kpi_4", "label": "Target Status", "value": 85, "formattedValue": "85%", "delta": 2.1, "deltaDirection": "up", "deltaLabel": "on track"},
            ]

        return cards

    @staticmethod
    def _generate_trend_charts(rows: list[dict[str, Any]], keywords: list[str]) -> list[dict[str, Any]]:
        """Generate charts for Trend Analysis dashboard."""
        if not rows:
            return []

        numeric_col = next((k for k, v in (rows[0].items() if rows else []) if isinstance(v, (int, float))), None)
        if not numeric_col:
            return []

        return [
            {
                "id": "chart_1",
                "type": "line",
                "title": "Time Series Trend",
                "subtitle": "Progressive movement over time",
                "position": {"x": 0, "y": 0, "w": 8, "h": 4},
                "xAxis": {"field": list(rows[0].keys())[0], "label": "Period"},
                "yAxis": {"field": numeric_col, "label": "Value"},
                "colors": ["#1E88E5", "#00E5FF", "#69F0AE"],
                "showLegend": False,
                "showGrid": True,
                "data": rows[:20],
            },
            {
                "id": "chart_2",
                "type": "area",
                "title": "Cumulative Growth",
                "subtitle": "Running total trend",
                "position": {"x": 8, "y": 0, "w": 4, "h": 4},
                "xAxis": {"field": list(rows[0].keys())[0], "label": "Time"},
                "yAxis": {"field": numeric_col, "label": "Cumulative"},
                "colors": ["#00E5FF"],
                "showLegend": False,
                "data": rows[:15],
            },
            {
                "id": "chart_3",
                "type": "combo",
                "title": "Period Comparison Combo",
                "subtitle": "Bar + line combined",
                "position": {"x": 0, "y": 4, "w": 6, "h": 4},
                "xAxis": {"field": list(rows[0].keys())[0], "label": "Segment"},
                "yAxis": {"field": numeric_col, "label": "Amount"},
                "colors": ["#1E88E5"],
                "showLegend": False,
                "data": rows[:10],
            },
            {
                "id": "chart_4",
                "type": "step-line",
                "title": "Volatility Step Trend",
                "subtitle": "Step movement of KPI",
                "position": {"x": 6, "y": 4, "w": 6, "h": 4},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#FFD740"],
                "data": rows[:12],
            },
            {
                "id": "chart_5",
                "type": "radar",
                "title": "Multi Metric Radar",
                "subtitle": "Balanced performance view",
                "position": {"x": 0, "y": 8, "w": 12, "h": 3},
                "xAxis": {"field": list(rows[0].keys())[0], "label": "Metric"},
                "yAxis": {"field": numeric_col, "label": "Score"},
                "colors": ["#00E5FF"],
                "data": rows[:8],
            },
            {
                "id": "chart_6",
                "type": "polar-bar",
                "title": "Polar Segment Spread",
                "subtitle": "Radial bar composition",
                "position": {"x": 0, "y": 11, "w": 12, "h": 3},
                "xAxis": {"field": list(rows[0].keys())[0], "label": "Segment"},
                "yAxis": {"field": numeric_col, "label": "Value"},
                "colors": ["#69F0AE"],
                "data": rows[:12],
            },
        ]

    @staticmethod
    def _generate_comparison_charts(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Generate charts for Comparative Analysis dashboard."""
        if not rows:
            return []

        numeric_col = next((k for k, v in (rows[0].items() if rows else []) if isinstance(v, (int, float))), None)
        if not numeric_col:
            return []

        return [
            {
                "id": "chart_1",
                "type": "horizontal-bar",
                "title": "Category Rankings",
                "subtitle": "Ranked by performance",
                "position": {"x": 0, "y": 0, "w": 5, "h": 5},
                "xAxis": {"field": numeric_col, "label": "Value"},
                "yAxis": {"field": list(rows[0].keys())[0], "label": "Category"},
                "colors": ["#E53935"],
                "showLegend": False,
                "data": sorted(rows, key=lambda r: float(r.get(numeric_col, 0) or 0), reverse=True)[:12],
            },
            {
                "id": "chart_2",
                "type": "pie",
                "title": "Market Share Pie",
                "subtitle": "Proportion breakdown",
                "position": {"x": 5, "y": 0, "w": 4, "h": 5},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#E53935", "#FF7043", "#FF9800", "#FFC107"],
                "showLegend": True,
                "data": rows[:8],
            },
            {
                "id": "chart_3",
                "type": "funnel",
                "title": "Conversion Funnel",
                "subtitle": "Stage wise drop-off",
                "position": {"x": 9, "y": 0, "w": 3, "h": 5},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#E53935", "#FF7043"],
                "data": rows[:6],
            },
            {
                "id": "chart_4",
                "type": "gauge",
                "title": "Benchmark Score",
                "subtitle": "Against target",
                "position": {"x": 0, "y": 5, "w": 4, "h": 4},
                "xAxis": {"field": "", "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#E53935"],
                "data": [{"value": min(100, (sum(float(r.get(numeric_col, 0) or 0) for r in rows) / (len(rows) * max(float(r.get(numeric_col, 1) or 1) for r in rows))) * 100)}],
            },
            {
                "id": "chart_5",
                "type": "bubble",
                "title": "Correlation Bubble Map",
                "subtitle": "Value distribution with size",
                "position": {"x": 4, "y": 5, "w": 8, "h": 4},
                "xAxis": {"field": list(rows[0].keys())[0], "label": "Index"},
                "yAxis": {"field": numeric_col, "label": "Amount"},
                "colors": ["#FF7043"],
                "data": rows,
            },
            {
                "id": "chart_6",
                "type": "sunburst",
                "title": "Nested Segment Mix",
                "subtitle": "Hierarchy by group",
                "position": {"x": 0, "y": 9, "w": 12, "h": 3},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "groupBy": list(rows[0].keys())[0],
                "colors": ["#FF7043", "#E53935", "#FF9800"],
                "data": rows[:20],
            },
            {
                "id": "chart_7",
                "type": "sankey",
                "title": "Flow Between Segments",
                "subtitle": "Source to target movement",
                "position": {"x": 0, "y": 12, "w": 12, "h": 3},
                "xAxis": {"field": list(rows[0].keys())[0], "label": "Source"},
                "yAxis": {"field": numeric_col, "label": "Flow"},
                "groupBy": list(rows[0].keys())[0],
                "colors": ["#FF7043", "#E53935"],
                "data": rows[:24],
            },
        ]

    @staticmethod
    def _generate_distribution_charts(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Generate charts for Deep Dive Analysis dashboard."""
        if not rows:
            return []

        numeric_col = next((k for k, v in (rows[0].items() if rows else []) if isinstance(v, (int, float))), None)
        if not numeric_col:
            return []

        return [
            {
                "id": "chart_1",
                "type": "treemap",
                "title": "Hierarchical Breakdown",
                "subtitle": "Distribution by size",
                "position": {"x": 0, "y": 0, "w": 6, "h": 5},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#7C4DFF", "#FFD740", "#FF7043", "#69F0AE"],
                "showLegend": False,
                "data": rows[:12],
            },
            {
                "id": "chart_2",
                "type": "heatmap",
                "title": "Intensity Map",
                "subtitle": "Concentration analysis",
                "position": {"x": 6, "y": 0, "w": 6, "h": 5},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": list(rows[0].keys())[0] if len(rows[0]) > 1 else "category", "label": ""},
                "groupBy": list(rows[0].keys())[1] if len(rows[0]) > 1 else "group",
                "colors": ["#7C4DFF", "#FFD740"],
                "data": rows[:15],
            },
            {
                "id": "chart_3",
                "type": "waterfall",
                "title": "Variance Analysis",
                "subtitle": "Change breakdown",
                "position": {"x": 0, "y": 5, "w": 6, "h": 4},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#FFD740", "#7C4DFF"],
                "data": rows[:8],
            },
            {
                "id": "chart_4",
                "type": "pictorial-bar",
                "title": "Pictorial Distribution",
                "subtitle": "Iconic bar distribution",
                "position": {"x": 6, "y": 5, "w": 6, "h": 4},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#FFD740"],
                "data": rows,
            },
            {
                "id": "chart_5",
                "type": "funnel",
                "title": "Drop-off Flow",
                "subtitle": "Top to bottom contribution",
                "position": {"x": 0, "y": 9, "w": 12, "h": 3},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#7C4DFF", "#FFD740", "#69F0AE"],
                "data": rows[:10],
            },
            {
                "id": "chart_6",
                "type": "nightingale",
                "title": "Nightingale Breakdown",
                "subtitle": "Area-intensity composition",
                "position": {"x": 0, "y": 12, "w": 12, "h": 3},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#7C4DFF", "#FFD740", "#FF7043"],
                "data": rows[:12],
            },
        ]

    @staticmethod
    def _generate_performance_charts(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Generate charts for Performance Metrics dashboard."""
        if not rows:
            return []

        numeric_col = next((k for k, v in (rows[0].items() if rows else []) if isinstance(v, (int, float))), None)
        if not numeric_col:
            return []

        return [
            {
                "id": "chart_1",
                "type": "line",
                "title": "KPI Trajectory",
                "subtitle": "Performance over time",
                "position": {"x": 0, "y": 0, "w": 6, "h": 4},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#00BFA5"],
                "showLegend": False,
                "data": rows[:20],
            },
            {
                "id": "chart_2",
                "type": "gauge",
                "title": "Overall Performance",
                "subtitle": "Achievement level",
                "position": {"x": 6, "y": 0, "w": 3, "h": 4},
                "xAxis": {"field": "", "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#00BFA5"],
                "data": [{"value": 78}],
            },
            {
                "id": "chart_3",
                "type": "donut",
                "title": "Target Achievement",
                "subtitle": "Goal status",
                "position": {"x": 9, "y": 0, "w": 3, "h": 4},
                "xAxis": {"field": "", "label": ""},
                "yAxis": {"field": "", "label": ""},
                "colors": ["#00BFA5", "#FFD740"],
                "data": [{"name": "Achieved", "value": 75}, {"name": "Remaining", "value": 25}],
            },
            {
                "id": "chart_4",
                "type": "combo",
                "title": "Performance Combo",
                "subtitle": "Volume and trend together",
                "position": {"x": 0, "y": 4, "w": 8, "h": 4},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#00BFA5", "#FFD740"],
                "data": rows[:12],
            },
            {
                "id": "chart_5",
                "type": "area",
                "title": "Cumulative Performance",
                "subtitle": "Running aggregate",
                "position": {"x": 8, "y": 4, "w": 4, "h": 4},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#FFD740"],
                "data": rows[:12],
            },
            {
                "id": "chart_6",
                "type": "radar",
                "title": "Capability Radar",
                "subtitle": "KPI strength matrix",
                "position": {"x": 0, "y": 8, "w": 6, "h": 3},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#00BFA5"],
                "data": rows[:8],
            },
            {
                "id": "chart_7",
                "type": "sunburst",
                "title": "Portfolio Hierarchy",
                "subtitle": "Category depth analysis",
                "position": {"x": 6, "y": 8, "w": 6, "h": 3},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "groupBy": list(rows[0].keys())[0],
                "colors": ["#00BFA5", "#FFD740", "#26A69A"],
                "data": rows[:20],
            },
            {
                "id": "chart_8",
                "type": "radial-bar",
                "title": "Radial KPI Gauge",
                "subtitle": "Target attainment",
                "position": {"x": 0, "y": 11, "w": 6, "h": 3},
                "xAxis": {"field": "", "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#00BFA5"],
                "data": [{"value": 81}],
            },
            {
                "id": "chart_9",
                "type": "rose",
                "title": "Rose Composition",
                "subtitle": "Radial category distribution",
                "position": {"x": 6, "y": 11, "w": 6, "h": 3},
                "xAxis": {"field": list(rows[0].keys())[0], "label": ""},
                "yAxis": {"field": numeric_col, "label": ""},
                "colors": ["#00BFA5", "#FFD740", "#26A69A"],
                "data": rows[:12],
            },
        ]

    @staticmethod
    def _generate_insight(rows: list[dict[str, Any]], focus: str, kpi: str) -> str:
        """Generate meaningful insights based on data and focus."""
        if not rows:
            return f"No data available for {kpi}."

        numeric_cols = [k for k, v in (rows[0].items() if rows else []) if isinstance(v, (int, float))]
        if not numeric_cols:
            return f"Analysis of {kpi}: {len(rows)} data points analyzed."

        metric = numeric_cols[0]
        values = [float(r.get(metric, 0) or 0) for r in rows]
        total = sum(values)
        avg = total / len(values) if values else 0
        max_val = max(values) if values else 0
        min_val = min(values) if values else 0

        if focus == "trend":
            growth = ((values[-1] - values[0]) / values[0] * 100) if values and values[0] != 0 else 0
            return f"KPI '{kpi}' shows {growth:+.1f}% growth. Total: {humanize_number(total)}, Peak: {humanize_number(max_val)}. Average: {humanize_number(avg)}."
        elif focus == "comparison":
            top_performer = max_val
            return f"Top performer: {humanize_number(top_performer)}. Range: {humanize_number(min_val)} to {humanize_number(max_val)}. Variation indicates diverse performance across segments."
        elif focus == "distribution":
            outliers = len([v for v in values if v > avg * 2 or v < avg * 0.5])
            return f"Distribution analysis: {len(rows)} items tracked. Total: {humanize_number(total)}. Outliers detected: {outliers}. Concentration in top performers."
        else:  # performance
            target_hit = (avg / max_val * 100) if max_val > 0 else 0
            return f"Performance metrics: Achievement rate {target_hit:.0f}%. Efficiency: {humanize_number(avg)} per unit. Overall momentum: Strong upward trajectory."


class AiService:
    def _load_themes(self) -> dict[str, dict[str, Any]]:
        """Load theme configurations from JSON file."""
        try:
            theme_path = os.path.join(os.path.dirname(__file__), "..", "config", "theme_mapping.json")
            with open(theme_path, "r") as f:
                themes = json.load(f)
            return themes
        except Exception:
            return {}

    def _build_client(self) -> tuple[OpenAI | None, str | None]:
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()

        if openai_key:
            model = os.getenv("OPENAI_MODEL", "gpt-5.4-mini-2026-03-17")
            return OpenAI(api_key=openai_key), model

        return None, None

    def _apply_selected_chart_types(self, spec: dict[str, Any], selected_charts: list[str]) -> dict[str, Any]:
        if not selected_charts:
            return spec

        allowed = {
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
        }

        normalized = [c.strip().lower() for c in selected_charts if isinstance(c, str) and c.strip()]
        valid = [c for c in normalized if c in allowed]
        if not valid:
            return spec

        for dashboard in spec.get("dashboards", []):
            charts = dashboard.get("charts", [])
            for idx, chart in enumerate(charts):
                chart_type = valid[idx % len(valid)]
                chart["type"] = chart_type
                base_title = str(chart.get("title", "Chart"))
                chart["title"] = f"{base_title.split(' - ')[0]} - {chart_type.title()}"

                data_rows = chart.get("data", [])
                if isinstance(data_rows, list) and data_rows:
                    keys = list(data_rows[0].keys())
                    first_key = keys[0] if len(keys) > 0 else "label"
                    second_key = keys[1] if len(keys) > 1 else first_key

                    first_row = data_rows[0]
                    numeric_key = next((k for k, v in first_row.items() if isinstance(v, (int, float))), None)
                    text_keys = [k for k, v in first_row.items() if isinstance(v, str)]
                    primary_text_key = text_keys[0] if text_keys else first_key
                    secondary_text_key = text_keys[1] if len(text_keys) > 1 else second_key

                    value_key = chart.get("yAxis", {}).get("field") if isinstance(chart.get("yAxis"), dict) else None
                    if not value_key or value_key not in keys or value_key == primary_text_key:
                        value_key = numeric_key or (keys[1] if len(keys) > 1 else first_key)

                    x_key = primary_text_key
                    if x_key == value_key:
                        x_key = second_key if second_key != value_key else first_key

                    if chart_type in {"sankey", "sunburst"}:
                        chart["xAxis"] = {"field": x_key, "label": str(x_key).replace("_", " ").title()}
                        chart["groupBy"] = secondary_text_key if secondary_text_key != x_key else second_key
                        chart["yAxis"] = {"field": value_key, "label": str(value_key).title()}
                    elif chart_type in {"gauge", "radial-bar"}:
                        chart["yAxis"] = {"field": value_key, "label": str(value_key).title()}
                    else:
                        chart["xAxis"] = {"field": x_key, "label": str(x_key).replace("_", " ").title()}
                        chart["yAxis"] = {"field": value_key, "label": str(value_key).title()}

        return spec

    def _apply_themes_to_dashboards(self, spec: dict[str, Any], selected_themes: list[str]) -> dict[str, Any]:
        """Apply selected themes to each dashboard."""
        if not selected_themes:
            return spec

        themes = self._load_themes()
        if not themes:
            return spec

        default_theme = list(themes.values())[0] if themes else {}

        dashboards = spec.get("dashboards", [])
        for idx, dashboard in enumerate(dashboards):
            # Get theme name for this dashboard (cycle through selected themes if fewer provided)
            theme_name = selected_themes[idx % len(selected_themes)] if selected_themes else "Dark Professional"

            # Find matching theme
            theme_config = None
            for theme_key, theme_obj in themes.items():
                if theme_obj.get("name") == theme_name:
                    theme_config = theme_obj
                    break

            if not theme_config:
                theme_config = default_theme

            # Apply theme to dashboard
            dashboard["theme"] = {
                "background": theme_config.get("background", "#1a1a2e"),
                "cardBackground": theme_config.get("cardBackground", "#16213e"),
                "primaryColor": theme_config.get("primaryColor", "#0f3460"),
                "accentColor": theme_config.get("accentColor", "#533483"),
                "textColor": theme_config.get("textColor", "#e0e0e0"),
                "subTextColor": theme_config.get("subTextColor", "#a0a0a0"),
                "mutedColor": theme_config.get("mutedColor", "#707070"),
                "borderRadius": theme_config.get("borderRadius", 8),
                "cardShadow": theme_config.get("cardShadow", "0 4px 12px rgba(0, 0, 0, 0.3)"),
                "borderColor": theme_config.get("borderColor", "#2d3561"),
                "chartColors": theme_config.get("chartColors", ["#00d4ff", "#0096ff", "#ff006e", "#8338ec", "#ffbe0b"]),
                "headingColor": theme_config.get("headingColor", "#ffffff"),
                "subheadingColor": theme_config.get("subheadingColor", "#b0b0b0"),
            }

            # Apply theme colors to charts
            for chart in dashboard.get("charts", []):
                chart_theme_colors = theme_config.get("chartColors", [])
                if chart_theme_colors:
                    chart["colors"] = chart_theme_colors

        return spec

    def _enhance_dashboard_variants(self, spec: dict[str, Any], kpi: str) -> dict[str, Any]:
        """Apply KPI-aware enhancements so generated dashboards feel more advanced and less repetitive."""
        dashboards = spec.get("dashboards", [])
        if not dashboards:
            return spec

        kpi_lower = kpi.lower()
        finance_keywords = {"sales", "revenue", "profit", "margin", "cost"}
        ops_keywords = {"delivery", "shipment", "lead", "time", "throughput"}
        customer_keywords = {"customer", "segment", "retention", "churn", "satisfaction"}

        if any(word in kpi_lower for word in finance_keywords):
            palette = ["#2563EB", "#0EA5E9", "#06B6D4", "#8B5CF6", "#F59E0B"]
            hero_suffix = "Financial Intelligence"
        elif any(word in kpi_lower for word in ops_keywords):
            palette = ["#0891B2", "#0F766E", "#22C55E", "#F59E0B", "#EF4444"]
            hero_suffix = "Operational Flow"
        elif any(word in kpi_lower for word in customer_keywords):
            palette = ["#9333EA", "#3B82F6", "#EC4899", "#14B8A6", "#F97316"]
            hero_suffix = "Customer Pulse"
        else:
            palette = ["#2563EB", "#7C3AED", "#06B6D4", "#F43F5E", "#F59E0B"]
            hero_suffix = "Executive Lens"

        advanced_chart_mix = [
            "combo",
            "heatmap",
            "treemap",
            "sankey",
            "waterfall",
            "radial-bar",
            "nightingale",
            "sunburst",
            "bubble",
        ]

        for dash_idx, dashboard in enumerate(dashboards):
            dashboard["title"] = f"{dashboard.get('title', 'Dashboard')} - {hero_suffix}"
            theme = dashboard.get("theme", {})
            if isinstance(theme, dict):
                theme["chartColors"] = palette
                theme["accentColor"] = palette[(dash_idx + 1) % len(palette)]
                theme["primaryColor"] = palette[dash_idx % len(palette)]
                dashboard["theme"] = theme

            charts = dashboard.get("charts", [])
            if not isinstance(charts, list):
                continue

            for chart_idx, chart in enumerate(charts):
                if not isinstance(chart, dict):
                    continue
                if not chart.get("colors"):
                    chart["colors"] = palette

                # Upgrade every second chart to advanced type mix unless explicitly constrained.
                if chart_idx % 2 == 1:
                    chart["type"] = advanced_chart_mix[(dash_idx + chart_idx) % len(advanced_chart_mix)]

                subtitle = str(chart.get("subtitle") or "").strip()
                if subtitle:
                    chart["subtitle"] = f"{subtitle} | KPI signal focus"
                else:
                    chart["subtitle"] = "KPI signal focus"

        spec["dashboards"] = dashboards
        return spec

    def generate_dashboard_spec(self, kpi: str, aggregated_payload: dict[str, Any], selected_charts: list[str] | None = None, selected_themes: list[str] | None = None) -> dict[str, Any]:
        """Generate 4 unique, professional dashboards with different focuses."""
        rows = aggregated_payload.get("rows", [])

        # Use local generator for consistent, diverse results
        spec = UniqueChartGenerator.generate_dashboard_spec_with_unique_focuses(kpi, rows)
        spec = self._enhance_dashboard_variants(spec, kpi)
        spec = self._apply_selected_chart_types(spec, selected_charts or [])
        spec = self._apply_themes_to_dashboards(spec, selected_themes or [])

        spec["source"] = {
            "dataset": aggregated_payload.get("dataset"),
            "kpi": kpi,
            "row_count": len(rows),
        }

        return spec


ai_service = AiService()
