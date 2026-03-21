"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function SunburstChartComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const labelField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "name";
  const valueField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "value";
  const groupField = chart.groupBy ?? Object.keys(data[0] ?? {})[2] ?? labelField;
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const grouped = new Map<string, { name: string; children: Array<{ name: string; value: number }> }>();

  data.slice(0, 40).forEach((row, idx) => {
    const group = String(row[groupField] ?? "Group");
    const label = String(row[labelField] ?? `Item ${idx + 1}`);
    const value = Number(row[valueField] ?? 0);

    if (!grouped.has(group)) {
      grouped.set(group, { name: group, children: [] });
    }
    grouped.get(group)?.children.push({ name: label, value });
  });

  const seriesData = Array.from(grouped.values());

  const option = {
    tooltip: { trigger: "item", formatter: "{b}: {c}" },
    series: [
      {
        type: "sunburst",
        radius: ["15%", "90%"],
        sort: null,
        emphasis: { focus: "ancestor" },
        data: seriesData,
        label: { rotate: "radial", color: subTextColor },
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
