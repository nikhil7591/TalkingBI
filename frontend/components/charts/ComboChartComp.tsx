"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function ComboChartComp({ chart, theme }: Props) {
  const rows = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(rows[0] ?? {})[0] ?? "x";
  const yField = chart.yAxis?.field ?? Object.keys(rows[0] ?? {})[1] ?? "value";
  const primaryColor = theme?.primaryColor || "#2563eb";
  const accentColor = theme?.accentColor || "#22d3ee";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const cats = rows.slice(0, 16).map((r) => String(r[xField] ?? "N/A"));
  const vals = rows.slice(0, 16).map((r) => Number(r[yField] ?? 0));

  const option = {
    tooltip: { trigger: "axis" },
    legend: { top: 0, textStyle: { color: subTextColor } },
    grid: { left: 24, right: 16, top: 30, bottom: 24, containLabel: true },
    xAxis: { type: "category", data: cats, axisLabel: { color: subTextColor } },
    yAxis: { type: "value", axisLabel: { color: subTextColor } },
    series: [
      { type: "bar", name: "Volume", data: vals, itemStyle: { color: primaryColor, borderRadius: [4, 4, 0, 0] } },
      { type: "line", name: "Trend", data: vals, smooth: true, lineStyle: { color: accentColor, width: 2 } },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
