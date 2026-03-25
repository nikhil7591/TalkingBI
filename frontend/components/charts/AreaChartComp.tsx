"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function AreaChartComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "x";
  const yField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "y";
  const palette = chart.colors?.length ? chart.colors : theme?.chartColors?.length ? theme.chartColors : [theme?.primaryColor || "#2563eb"];
  const primaryColor = palette[0] || theme?.primaryColor || "#2563eb";
  const secondaryColor = palette[1] || theme?.accentColor || primaryColor;
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const option = {
    tooltip: { trigger: "axis" },
    grid: { left: 24, right: 16, top: 16, bottom: 30, containLabel: true },
    xAxis: { type: "category", data: data.map((d) => String(d[xField] ?? "")), axisLabel: { color: subTextColor } },
    yAxis: { type: "value", axisLabel: { color: subTextColor } },
    series: [
      {
        type: "line",
        smooth: true,
        data: data.map((d) => Number(d[yField] ?? 0)),
        lineStyle: { color: primaryColor, width: 2 },
        areaStyle: {
          color: secondaryColor,
          opacity: 0.25,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
