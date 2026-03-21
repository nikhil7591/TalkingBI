"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function PictorialBarChartComp({ chart, theme }: Props) {
  const rows = chart.data ?? [];
  const catField = chart.xAxis?.field ?? Object.keys(rows[0] ?? {})[0] ?? "category";
  const valField = chart.yAxis?.field ?? Object.keys(rows[0] ?? {})[1] ?? "value";
  const color = chart.colors?.[0] || theme?.primaryColor || "#2563eb";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const categories = rows.slice(0, 12).map((r) => String(r[catField] ?? "N/A"));
  const values = rows.slice(0, 12).map((r) => Number(r[valField] ?? 0));

  const option = {
    tooltip: {},
    grid: { left: 20, right: 10, top: 12, bottom: 24, containLabel: true },
    xAxis: { type: "category", data: categories, axisLabel: { color: subTextColor } },
    yAxis: { type: "value", axisLabel: { color: subTextColor } },
    series: [
      {
        type: "pictorialBar",
        symbol: "rect",
        symbolRepeat: true,
        symbolSize: [12, 4],
        data: values,
        itemStyle: { color },
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
