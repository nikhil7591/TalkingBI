"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function BubbleChartComp({ chart, theme }: Props) {
  const rows = chart.data ?? [];
  const keys = Object.keys(rows[0] ?? {});
  const xField = chart.xAxis?.field ?? keys[0] ?? "x";
  const yField = chart.yAxis?.field ?? keys[1] ?? "y";
  const sizeField = keys[2] ?? yField;
  const color = chart.colors?.[0] || theme?.primaryColor || "#2563eb";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const option = {
    tooltip: { trigger: "item" },
    grid: { left: 24, right: 16, top: 12, bottom: 24, containLabel: true },
    xAxis: { type: "value", axisLabel: { color: subTextColor } },
    yAxis: { type: "value", axisLabel: { color: subTextColor } },
    series: [
      {
        type: "scatter",
        data: rows.map((r) => [Number(r[xField] ?? 0), Number(r[yField] ?? 0), Number(r[sizeField] ?? 10)]),
        symbolSize: (v: number[]) => Math.max(8, Math.min(40, Number(v[2] ?? 10))),
        itemStyle: { color },
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
