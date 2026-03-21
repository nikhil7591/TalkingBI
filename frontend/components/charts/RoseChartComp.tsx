"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function RoseChartComp({ chart, theme }: Props) {
  const rows = chart.data ?? [];
  const nameField = chart.xAxis?.field ?? Object.keys(rows[0] ?? {})[0] ?? "name";
  const valueField = chart.yAxis?.field ?? Object.keys(rows[0] ?? {})[1] ?? "value";
  const subTextColor = theme?.subTextColor || "#94a3b8";
  const fallbackColors = chart.colors?.length ? chart.colors : [theme?.primaryColor || "#2563eb", theme?.accentColor || "#22d3ee", "#f59e0b", "#22c55e", "#ef4444"];

  const option = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { color: subTextColor } },
    series: [
      {
        type: "pie",
        roseType: "radius",
        radius: [20, 88],
        data: rows.slice(0, 12).map((r, i) => ({
          name: String(r[nameField] ?? `Item ${i + 1}`),
          value: Number(r[valueField] ?? 0),
          itemStyle: { color: fallbackColors[i % fallbackColors.length] },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
