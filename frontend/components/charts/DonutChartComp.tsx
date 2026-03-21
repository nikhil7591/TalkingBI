"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function DonutChartComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "name";
  const yField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "value";
  const primaryColor = theme?.primaryColor || "#2563eb";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  const option = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { orient: "vertical", right: 0, top: "middle", textStyle: { color: subTextColor } },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        center: ["38%", "50%"],
        label: { color: subTextColor, formatter: "{b}\n{d}%" },
        data: data.map((d, i) => ({
          name: String(d[xField] ?? "N/A"),
          value: Number(d[yField] ?? 0),
          itemStyle: { color: chart.colors?.[i % (chart.colors?.length || 1)] || primaryColor },
        })),
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
