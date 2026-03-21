"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function RadarChartComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const keyField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "metric";
  const valueField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "value";
  const primaryColor = theme?.primaryColor || "#2563eb";
  const subTextColor = theme?.subTextColor || "#94a3b8";
  const borderColor = theme?.borderColor || "rgba(148,163,184,0.25)";

  const points = data.slice(0, 8).map((d, i) => ({
    name: String(d[keyField] ?? `M${i + 1}`),
    value: Number(d[valueField] ?? 0),
  }));

  const maxValue = Math.max(100, ...points.map((p) => p.value));

  const option = {
    tooltip: { trigger: "item" },
    radar: {
      indicator: points.map((p) => ({ name: p.name, max: maxValue })),
      splitLine: { lineStyle: { color: borderColor } },
      splitArea: { areaStyle: { color: ["transparent"] } },
      axisName: { color: subTextColor },
    },
    series: [
      {
        type: "radar",
        data: [
          {
            value: points.map((p) => p.value),
            name: chart.title,
            areaStyle: { color: `${primaryColor}55` },
            lineStyle: { color: primaryColor, width: 2 },
            itemStyle: { color: primaryColor },
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
