"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function ScatterComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const keys = Object.keys(data[0] ?? {});
  const xField = chart.xAxis?.field ?? keys[0] ?? "x";
  const yField = chart.yAxis?.field ?? keys[1] ?? "y";
  const sizeField = keys[2];
  const primaryColor = chart.colors?.[0] || theme?.primaryColor || "#2563eb";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const option = {
    tooltip: { trigger: "item" },
    grid: { left: 32, right: 16, top: 16, bottom: 30, containLabel: true },
    xAxis: { type: "value", axisLabel: { color: subTextColor } },
    yAxis: { type: "value", axisLabel: { color: subTextColor } },
    series: [
      {
        type: "scatter",
        itemStyle: { color: primaryColor },
        data: data.map((d) => [
          Number(d[xField] ?? 0),
          Number(d[yField] ?? 0),
          sizeField ? Number(d[sizeField] ?? 8) : 8,
        ]),
        symbolSize: (val: number[]) => Math.max(6, Math.min(30, Number(val[2] ?? 8))),
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
