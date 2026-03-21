"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = {
  chart: Chart;
  theme: Theme;
  horizontal?: boolean;
  stacked?: boolean;
};

export default function BarChartComp({ chart, theme, horizontal = false, stacked = false }: Props) {
  const data = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "x";
  const yField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "y";
  const primaryColor = chart.colors?.[0] || theme?.primaryColor || "#2563eb";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const category = data.map((d) => String(d[xField] ?? ""));
  const values = data.map((d) => Number(d[yField] ?? 0));

  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    grid: { left: 30, right: 16, top: 16, bottom: 30, containLabel: true },
    xAxis: horizontal
      ? { type: "value", axisLabel: { color: subTextColor } }
      : { type: "category", data: category, axisLabel: { color: subTextColor } },
    yAxis: horizontal
      ? { type: "category", data: category, axisLabel: { color: subTextColor } }
      : { type: "value", axisLabel: { color: subTextColor } },
    series: [
      {
        type: "bar",
        stack: stacked ? "total" : undefined,
        data: values,
        itemStyle: {
          color: primaryColor,
          borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: horizontal ? "right" : "top",
          color: subTextColor,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
