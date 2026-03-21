"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function HeatmapComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "x";
  const yField = chart.groupBy ?? Object.keys(data[0] ?? {})[1] ?? "y";
  const vField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[2] ?? Object.keys(data[0] ?? {})[1] ?? "value";
  const cardBackground = theme?.cardBackground || "#0f172a";
  const primaryColor = theme?.primaryColor || "#2563eb";
  const accentColor = theme?.accentColor || "#22d3ee";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const xCats = Array.from(new Set(data.map((d) => String(d[xField] ?? ""))));
  const yCats = Array.from(new Set(data.map((d) => String(d[yField] ?? ""))));

  const points = data.map((d) => [
    xCats.indexOf(String(d[xField] ?? "")),
    yCats.indexOf(String(d[yField] ?? "")),
    Number(d[vField] ?? 0),
  ]);

  const option = {
    grid: { left: 40, right: 16, top: 16, bottom: 30, containLabel: true },
    tooltip: { position: "top" },
    xAxis: { type: "category", data: xCats, axisLabel: { color: subTextColor } },
    yAxis: { type: "category", data: yCats, axisLabel: { color: subTextColor } },
    visualMap: {
      min: 0,
      max: Math.max(...points.map((p) => Number(p[2])), 100),
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: { color: [cardBackground, primaryColor, accentColor] },
    },
    series: [{ type: "heatmap", data: points, label: { show: false } }],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
