"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function PieChartComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const nameField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "name";
  const valueField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "value";
  const subTextColor = theme?.subTextColor || "#94a3b8";
  const fallbackColors = chart.colors?.length ? chart.colors : [theme?.primaryColor || "#2563eb", theme?.accentColor || "#22d3ee", "#f59e0b", "#22c55e"];

  const option = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { bottom: 0, textStyle: { color: subTextColor } },
    series: [
      {
        type: "pie",
        radius: "68%",
        data: data.slice(0, 12).map((row, i) => ({
          name: String(row[nameField] ?? `Item ${i + 1}`),
          value: Number(row[valueField] ?? 0),
          itemStyle: { color: fallbackColors[i % fallbackColors.length] },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
