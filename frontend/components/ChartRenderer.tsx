import { Chart, Theme } from "@/lib/types";

import AreaChartComp from "@/components/charts/AreaChartComp";
import BarChartComp from "@/components/charts/BarChartComp";
import DonutChartComp from "@/components/charts/DonutChartComp";
import GaugeComp from "@/components/charts/GaugeComp";
import HeatmapComp from "@/components/charts/HeatmapComp";
import LineChartComp from "@/components/charts/LineChartComp";
import ScatterComp from "@/components/charts/ScatterComp";
import SparklineComp from "@/components/charts/SparklineComp";
import FunnelChartComp from "@/components/charts/FunnelChartComp";
import RadarChartComp from "@/components/charts/RadarChartComp";
import SunburstChartComp from "@/components/charts/SunburstChartComp";
import PieChartComp from "@/components/charts/PieChartComp";
import BubbleChartComp from "@/components/charts/BubbleChartComp";
import PolarBarChartComp from "@/components/charts/PolarBarChartComp";
import SankeyChartComp from "@/components/charts/SankeyChartComp";
import PictorialBarChartComp from "@/components/charts/PictorialBarChartComp";
import RoseChartComp from "@/components/charts/RoseChartComp";
import ComboChartComp from "@/components/charts/ComboChartComp";
import RadialBarChartComp from "@/components/charts/RadialBarChartComp";
import StepLineChartComp from "@/components/charts/StepLineChartComp";
import NightingaleChartComp from "@/components/charts/NightingaleChartComp";
import TreemapComp from "@/components/charts/TreemapComp";
import WaterfallComp from "@/components/charts/WaterfallComp";

type Props = {
  chart: Chart;
  theme: Theme;
};

export default function ChartRenderer({ chart, theme }: Props) {
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

  const isLikelyCssColor = (value: string): boolean => {
    const v = (value || "").trim();
    if (!v) return false;
    if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) return true;
    if (/^rgba?\(/i.test(v)) return true;
    if (/^hsla?\(/i.test(v)) return true;
    if (/^[a-z]+$/i.test(v)) return true;
    return false;
  };

  const safeColor = (value: string | undefined, fallback: string): string => {
    if (typeof value !== "string") return fallback;
    return isLikelyCssColor(value) ? value : fallback;
  };

  const contrastColor = (bg: string, preferred: string, fallbackDark = "#67e8f9", fallbackLight = "#1d4ed8") => {
    const bgHex = normalizeHex(bg);
    const prefHex = normalizeHex(preferred);
    if (!prefHex) {
      return fallbackLight;
    }
    if (!bgHex) {
      return preferred;
    }

    const ch = (hex: string, idx: number) => parseInt(hex.slice(idx, idx + 2), 16);
    const delta =
      Math.abs(ch(bgHex, 1) - ch(prefHex, 1)) +
      Math.abs(ch(bgHex, 3) - ch(prefHex, 3)) +
      Math.abs(ch(bgHex, 5) - ch(prefHex, 5));

    if (delta >= 140) {
      return preferred;
    }

    const bgLuma = (0.2126 * ch(bgHex, 1) + 0.7152 * ch(bgHex, 3) + 0.0722 * ch(bgHex, 5)) / 255;
    return bgLuma < 0.5 ? fallbackDark : fallbackLight;
  };

  const hasData = Array.isArray(chart.data) && chart.data.length > 0;
  const fallbackPalette = ["#2563eb", "#0891b2", "#7c3aed", "#f97316", "#16a34a", "#e11d48"];
  const rawPalette =
    chart.colors?.filter(Boolean) || theme.chartColors?.filter(Boolean) || [theme.primaryColor, theme.accentColor].filter(Boolean);
  const palette = (rawPalette.length ? rawPalette : fallbackPalette).map((c, i) =>
    safeColor(
      contrastColor(theme.cardBackground || "#ffffff", c, fallbackPalette[i % fallbackPalette.length], fallbackPalette[i % fallbackPalette.length]),
      fallbackPalette[i % fallbackPalette.length]
    )
  );

  const normalizedTheme: Theme = {
    ...theme,
    primaryColor: palette[0] || contrastColor(theme.cardBackground || "#ffffff", theme.primaryColor || "#2563eb"),
    accentColor: palette[1] || contrastColor(theme.cardBackground || "#ffffff", theme.accentColor || "#0891b2"),
    chartColors: palette,
  };

  const sourceType = (chart.type || "bar").toLowerCase();
  const safeChartBase = hasData
    ? chart
    : sourceType === "gauge" || sourceType === "radial-bar"
      ? {
          ...chart,
          type: sourceType,
          title: `${chart.title || "Chart"} (No Data)`,
          yAxis: { field: "value", label: "Value" },
          data: [{ value: 0 }],
        }
      : {
          ...chart,
          type: "bar",
          title: `${chart.title || "Chart"} (No Data)` ,
          xAxis: { field: "label", label: "Status" },
          yAxis: { field: "value", label: "Value" },
          data: [{ label: "No Data", value: 0 }],
        };
  const safeChart = {
    ...safeChartBase,
    colors: palette,
  };
  const type = (safeChart.type || "bar").toLowerCase();

  if (type === "line") return <LineChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "bar") return <BarChartComp chart={safeChart} theme={normalizedTheme} horizontal={false} />;
  if (type === "horizontal-bar") return <BarChartComp chart={safeChart} theme={normalizedTheme} horizontal />;
  if (type === "stacked-bar") return <BarChartComp chart={safeChart} theme={normalizedTheme} stacked />;
  if (type === "donut") return <DonutChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "area") return <AreaChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "gauge") return <GaugeComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "treemap") return <TreemapComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "heatmap") return <HeatmapComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "scatter") return <ScatterComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "waterfall") return <WaterfallComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "sparkline") return <SparklineComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "funnel") return <FunnelChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "radar") return <RadarChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "sunburst") return <SunburstChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "pie") return <PieChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "bubble") return <BubbleChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "polar-bar") return <PolarBarChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "sankey") return <SankeyChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "pictorial-bar") return <PictorialBarChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "rose") return <RoseChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "combo") return <ComboChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "radial-bar") return <RadialBarChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "step-line") return <StepLineChartComp chart={safeChart} theme={normalizedTheme} />;
  if (type === "nightingale") return <NightingaleChartComp chart={safeChart} theme={normalizedTheme} />;

  // Fallback for unsupported chart types.
  return <BarChartComp chart={safeChart} theme={normalizedTheme} horizontal={false} />;
}
