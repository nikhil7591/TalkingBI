"use client";

import ReactECharts from "echarts-for-react";

import { Chart, Theme } from "@/lib/types";

type Props = { chart: Chart; theme: Theme };

export default function LineChartComp({ chart, theme }: Props) {
  const normalizeHex = (input: string): string | null => {
    const value = (input || "").trim();
    const short = /^#([0-9a-f]{3})$/i.exec(value);
    if (short) {
      const [, hex] = short;
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
    }
    const full = /^#([0-9a-f]{6})$/i.exec(value);
    return full ? `#${full[1].toLowerCase()}` : null;
  };

  const contrastColor = (bg: string, preferred: string): string => {
    const bgHex = normalizeHex(bg);
    const prefHex = normalizeHex(preferred);
    if (!bgHex || !prefHex) {
      return preferred;
    }
    const ch = (hex: string, idx: number) => parseInt(hex.slice(idx, idx + 2), 16);
    const dr = Math.abs(ch(bgHex, 1) - ch(prefHex, 1));
    const dg = Math.abs(ch(bgHex, 3) - ch(prefHex, 3));
    const db = Math.abs(ch(bgHex, 5) - ch(prefHex, 5));
    const delta = dr + dg + db;
    if (delta < 140) {
      const bgLuma = (0.2126 * ch(bgHex, 1) + 0.7152 * ch(bgHex, 3) + 0.0722 * ch(bgHex, 5)) / 255;
      return bgLuma > 0.5 ? "#1d4ed8" : "#67e8f9";
    }
    return preferred;
  };

  const data = chart.data ?? [];
  const xField = chart.xAxis?.field ?? Object.keys(data[0] ?? {})[0] ?? "x";
  const yField = chart.yAxis?.field ?? Object.keys(data[0] ?? {})[1] ?? "y";
  const palette = chart.colors?.length ? chart.colors : theme?.chartColors?.length ? theme.chartColors : [theme?.primaryColor || "#2563eb"];
  const primaryColor = contrastColor(theme?.cardBackground || "#ffffff", palette[0] || theme?.primaryColor || "#2563eb");
  const subTextColor = theme?.subTextColor || "#94a3b8";
  const borderColor = theme?.borderColor || "rgba(148,163,184,0.25)";

  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, textStyle: { color: subTextColor } },
    grid: { left: 24, right: 16, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: "category",
      data: data.map((d) => String(d[xField] ?? "")),
      axisLabel: { color: subTextColor },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: subTextColor },
      splitLine: { lineStyle: { color: borderColor } },
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: data.map((d) => Number(d[yField] ?? 0)),
        lineStyle: { width: 3.5, color: primaryColor },
        areaStyle: { opacity: 0.18, color: primaryColor },
        symbolSize: 7,
        itemStyle: {
          color: (params: { dataIndex: number }) => palette[params.dataIndex % palette.length] || primaryColor,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "100%" }} />;
}
