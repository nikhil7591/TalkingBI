"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function WaterfallComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "x";
  const yField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "y";
  const values = data.map((d) => Number(d[yField] ?? 0));

  let running = 0;
  const base = values.map((v) => {
    const prev = running;
    running += v;
    return prev;
  });

  const option = {
    tooltip: { trigger: "axis" },
    grid: { left: 30, right: 16, top: 16, bottom: 30, containLabel: true },
    xAxis: { type: "category", data: data.map((d) => String(d[xField] ?? "")), axisLabel: { color: theme.subTextColor } },
    yAxis: { type: "value", axisLabel: { color: theme.subTextColor } },
    series: [
      {
        type: "bar",
        stack: "total",
        silent: true,
        itemStyle: { color: "transparent" },
        data: base,
      },
      {
        type: "bar",
        stack: "total",
        data: values,
        itemStyle: {
          color: (params: { value: number }) => (params.value >= 0 ? "#22c55e" : "#ef4444"),
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
