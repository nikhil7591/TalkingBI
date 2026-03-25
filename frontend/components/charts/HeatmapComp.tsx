"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function HeatmapComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "x";
  const yField = chart.groupBy ?? Object.keys(data[0] ?? {})[1] ?? "y";
  const vField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[2] ?? Object.keys(data[0] ?? {})[1] ?? "value";
  const palette = chart.colors?.length ? chart.colors : theme?.chartColors?.length ? theme.chartColors : [theme?.primaryColor || "#2563eb", theme?.accentColor || "#22d3ee", "#f59e0b"];
  const primaryColor = palette[0] || theme?.primaryColor || "#2563eb";
  const accentColor = palette[1] || theme?.accentColor || "#22d3ee";
  const tertiaryColor = palette[2] || "#f59e0b";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const toNumber = (value: unknown): number => {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
    if (typeof value === "string") {
      const parsedTime = Date.parse(value);
      if (Number.isFinite(parsedTime)) return parsedTime;
    }
    return 0;
  };

  const xCats = Array.from(new Set(data.map((d) => String(d[xField] ?? ""))));
  const yCats = Array.from(new Set(data.map((d) => String(d[yField] ?? ""))));

  const points = data.map((d) => [
    xCats.indexOf(String(d[xField] ?? "")),
    yCats.indexOf(String(d[yField] ?? "")),
    toNumber(d[vField]),
  ]);

  const maxValue = Math.max(1, ...points.map((p) => Number(p[2])));

  const option = {
    grid: { left: 40, right: 16, top: 16, bottom: 30, containLabel: true },
    tooltip: { position: "top" },
    xAxis: { type: "category", data: xCats, axisLabel: { color: subTextColor } },
    yAxis: { type: "category", data: yCats, axisLabel: { color: subTextColor } },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      inRange: { color: ["#e2e8f0", primaryColor, accentColor, tertiaryColor] },
    },
    series: [{ type: "heatmap", data: points, label: { show: false } }],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
