"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function TreemapComp({ chart, theme }: Props) {
  const data = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "name";
  const yField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "value";
  const primaryColor = theme?.primaryColor || "#2563eb";
  const textColor = theme?.textColor || "#ffffff";

  const option = {
    series: [
      {
        type: "treemap",
        roam: false,
        breadcrumb: { show: false },
        label: { show: true, color: textColor, formatter: "{b}" },
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
