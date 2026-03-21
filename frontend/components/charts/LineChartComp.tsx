"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function LineChartComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "x";
  const yField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "y";
  const primaryColor = chart.colors?.[0] || theme?.primaryColor || "#2563eb";
  const subTextColor = theme?.subTextColor || "#94a3b8";
  const borderColor = theme?.borderColor || "rgba(148,163,184,0.25)";

  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, textStyle: { color: subTextColor } },
    grid: { left: 24, right: 16, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: "category",
      data: data.map((d) => String(d[xField] ?? "")),
      axisLabel: { color: subTextColor },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: subTextColor },
      splitLine: { lineStyle: { color: borderColor } },
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: data.map((d) => Number(d[yField] ?? 0)),
        lineStyle: { width: 3, color: primaryColor },
        areaStyle: { opacity: 0.15, color: primaryColor },
        symbolSize: 7,
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
