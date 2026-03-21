"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function FunnelChartComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "stage";
  const yField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "value";
  const primaryColor = theme?.primaryColor || "#2563eb";
  const accentColor = theme?.accentColor || "#22d3ee";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const palette = chart.colors?.length ? chart.colors : [primaryColor, accentColor, "#f59e0b", "#22c55e", "#ef4444"];

  const option = {
    tooltip: { trigger: "item", formatter: "{b}: {c}" },
    series: [
      {
        type: "funnel",
        left: "8%",
        width: "84%",
        top: 10,
        bottom: 10,
        sort: "descending",
        gap: 4,
        label: { show: true, position: "inside", color: "#fff", fontWeight: 600 },
        labelLine: { show: false },
        itemStyle: { borderColor: "#fff", borderWidth: 1 },
        data: data
          .map((d, i) => ({
            name: String(d[xField] ?? `Stage ${i + 1}`),
            value: Number(d[yField] ?? 0),
            itemStyle: { color: palette[i % palette.length] },
          }))
          .sort((a, b) => b.value - a.value),
      },
    ],
    textStyle: { color: subTextColor },
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
