"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function SparklineComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const yField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? Object.keys(data[0] ?? {})[0] ?? "value";
  const accentColor = theme?.accentColor || "#22d3ee";

  const option = {
    grid: { left: 0, right: 0, top: 4, bottom: 4 },
    xAxis: { type: "category", show: false, data: data.map((_, i) => i) },
    yAxis: { type: "value", show: false },
    series: [
      {
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: accentColor },
        data: data.map((d) => Number(d[yField] ?? 0)),
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
