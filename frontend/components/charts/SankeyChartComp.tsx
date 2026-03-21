"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function SankeyChartComp({ chart, theme }: Props) {
  const rows = chart.data ?? [];
  const keys = Object.keys(rows[0] ?? {});
  const sourceField = chart.xAxis?.field ?? keys[0] ?? "source";
  const targetField = chart.groupBy ?? keys[1] ?? "target";
  const valueField = chart.yAxis?.field ?? keys[2] ?? keys[1] ?? "value";
  const subTextColor = theme?.subTextColor || "#94a3b8";

  let links = rows.slice(0, 40).map((r) => ({
    source: String(r[sourceField] ?? "Source"),
    target: String(r[targetField] ?? "Target"),
    value: Math.max(0, Number(r[valueField] ?? 0)),
  }));

  // If mapping is weak (same source/target or empty links), auto-build a valid flow.
  links = links.filter((l) => l.source && l.target && l.source !== l.target && l.value >= 0);
  if (!links.length && keys.length >= 2) {
    links = rows.slice(0, 20).map((r) => ({
      source: String(r[keys[0]] ?? "Source"),
      target: String(r[keys[1]] ?? "Target"),
      value: Math.max(1, Number(r[valueField] ?? 1)),
    }));
    links = links.filter((l) => l.source !== l.target);
  }

  if (!links.length) {
    links = [
      { source: "Input", target: "Process", value: 10 },
      { source: "Process", target: "Output", value: 8 },
    ];
  }

  const nodeSet = new Set<string>();
  links.forEach((l) => {
    nodeSet.add(l.source);
    nodeSet.add(l.target);
  });

  const option = {
    tooltip: { trigger: "item" },
    series: [
      {
        type: "sankey",
        data: Array.from(nodeSet).map((n) => ({ name: n })),
        links,
        lineStyle: { color: "source", curveness: 0.5 },
        label: { color: subTextColor },
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
