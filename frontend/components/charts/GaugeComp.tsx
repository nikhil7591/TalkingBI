"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function GaugeComp({ chart }: Props) {
  const data = chart.data ?? [];
  const yField = chart.yAxis?.field ?? "value";

  const toNumber = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const resolveRawValue = (): number => {
    if (!data.length) {
      return 0;
    }

    // Priority 1: declared y-axis field.
    for (const row of data) {
      const val = toNumber((row as Record<string, unknown>)?.[yField]);
      if (val !== null) {
        return val;
      }
    }

    // Priority 2: any numeric field in first rows.
    for (const row of data) {
      const values = Object.values((row as Record<string, unknown>) ?? {});
      for (const cell of values) {
        const val = toNumber(cell);
        if (val !== null) {
          return val;
        }
      }
    }

    return 0;
  };

  const raw = resolveRawValue();
  const percent = Math.max(0, Math.min(100, raw));

  const option = {
    series: [
      {
        type: "gauge",
        min: 0,
        max: 100,
        progress: { show: true, width: 14 },
        axisLine: {
          lineStyle: {
            width: 14,
            color: [
              [0.33, "#ef4444"],
              [0.66, "#f59e0b"],
              [1, "#22c55e"],
            ],
          },
        },
        detail: { valueAnimation: true, formatter: "{value}%", fontSize: 22 },
        data: [{ value: percent }],
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
