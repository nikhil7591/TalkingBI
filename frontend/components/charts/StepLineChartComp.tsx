"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function StepLineChartComp({ chart, theme }: Props) {
  const rows = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(rows[0] ?? {})[0] ?? "x";
  const yField = chart.yAxis?.field ?? Object.keys(rows[0] ?? {})[1] ?? "y";
  const primaryColor = chart.colors?.[0] || theme?.primaryColor || "#2563eb";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const option = {
    tooltip: { trigger: "axis" },
    grid: { left: 24, right: 16, top: 12, bottom: 24, containLabel: true },
    xAxis: { type: "category", data: rows.slice(0, 20).map((r) => String(r[xField] ?? "N/A")), axisLabel: { color: subTextColor } },
    yAxis: { type: "value", axisLabel: { color: subTextColor } },
    series: [
      {
        type: "line",
        step: "middle",
        data: rows.slice(0, 20).map((r) => Number(r[yField] ?? 0)),
        lineStyle: { color: primaryColor, width: 2 },
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
