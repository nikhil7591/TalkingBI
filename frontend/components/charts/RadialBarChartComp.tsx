"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function RadialBarChartComp({ chart, theme }: Props) {
  const rows = chart.data ?? [];
  const yField = chart.yAxis?.field ?? Object.keys(rows[0] ?? {})[0] ?? "value";
  const value = Math.max(0, Math.min(100, Number(rows[0]?.[yField] ?? 0)));
  const palette = chart.colors?.length ? chart.colors : theme?.chartColors?.length ? theme.chartColors : [theme?.primaryColor || "#2563eb", theme?.accentColor || "#22d3ee"];
  const primaryColor = palette[0] || theme?.primaryColor || "#2563eb";
  const secondaryColor = palette[1] || theme?.accentColor || "#22d3ee";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const option = {
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        progress: {
          show: true,
          width: 14,
          itemStyle: {
            color: primaryColor,
          },
        },
        axisLine: { lineStyle: { width: 14, color: [[1, "rgba(148,163,184,0.25)"]] } },
        pointer: { show: false },
        detail: { formatter: "{value}%", color: subTextColor, fontSize: 24 },
        data: [{ value }],
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
