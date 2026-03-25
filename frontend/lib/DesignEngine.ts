import type { DashboardSpec, KpiCard } from "@/lib/types";

type ThemeId =
  | "dark-professional"
  | "light-minimal"
  | "vibrant-sunset"
  | "ocean-blue"
  | "forest-green"
  | "purple-gradient"
  | "corporate-slate";

type LayoutId = "executive" | "compact" | "magazine";

export type UserPreferences = {
  theme: ThemeId;
  selectedCharts: string[];
  layout: LayoutId;
  accentOverride: string | null;
};

type ThemeConfig = {
  background: string;
  cardBackground: string;
  accent: string;
  accentSecondary: string;
  text: string;
  subText: string;
  muted: string;
  border: string;
  shadow: string;
  gridLine: string;
  borderRadius: number;
  palette: string[];
};

type LayoutConfig = {
  kpiRow: boolean;
  gridCols: number;
  gridRowHeight: number;
  chartPositions: Array<{ x: number; y: number; w: number; h: number }>;
};

type ChartSlot = {
  slot: number;
  recommended_type: string;
  reason?: string;
  x_field?: string;
  y_field?: string;
  group_field?: string | null;
  data?: Array<Record<string, unknown>>;
};

type Doc2ChartResponse = {
  kpi_summary?: {
    total?: number;
    average?: number;
    maximum?: number;
    minimum?: number;
    count?: number;
    top_dimension_value?: string;
    top_dimension_label?: string;
  };
  chart_slots?: ChartSlot[];
  insight?: string;
};

type InsightsResponse = {
  top_insight?: string;
  voice_narration?: string;
};

const THEMES: Record<ThemeId, ThemeConfig> = {
  "dark-professional": {
    background: "#0A0E1A",
    cardBackground: "#0F1624",
    accent: "#2979FF",
    accentSecondary: "#00E5FF",
    text: "#FFFFFF",
    subText: "#8899AA",
    muted: "#3A4A5A",
    border: "rgba(41,121,255,0.15)",
    shadow: "0 8px 32px rgba(0,0,0,0.5)",
    gridLine: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    palette: ["#2979FF", "#00E5FF", "#69F0AE", "#FFD740", "#FF6D6D", "#AB47BC", "#FF9100", "#00BCD4"],
  },
  "light-minimal": {
    background: "#F8F9FC",
    cardBackground: "#FFFFFF",
    accent: "#3D5AFE",
    accentSecondary: "#00BFA5",
    text: "#1A1A2E",
    subText: "#6B7280",
    muted: "#D1D5DB",
    border: "#E5E7EB",
    shadow: "0 2px 16px rgba(0,0,0,0.06)",
    gridLine: "#F3F4F6",
    borderRadius: 10,
    palette: ["#3D5AFE", "#00BFA5", "#F59E0B", "#EF4444", "#8B5CF6", "#10B981", "#F97316", "#06B6D4"],
  },
  "vibrant-sunset": {
    background: "#1A0A00",
    cardBackground: "#261200",
    accent: "#FF6D00",
    accentSecondary: "#FFD600",
    text: "#FFFFFF",
    subText: "#FFCCBC",
    muted: "#6D4C41",
    border: "rgba(255,109,0,0.25)",
    shadow: "0 8px 32px rgba(255,109,0,0.15)",
    gridLine: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    palette: ["#FF6D00", "#FFD600", "#FF3D00", "#FFAB40", "#FF8A65", "#FFA000", "#BF360C", "#FF6F00"],
  },
  "ocean-blue": {
    background: "#020B18",
    cardBackground: "#041428",
    accent: "#00B0FF",
    accentSecondary: "#00E5FF",
    text: "#E3F2FD",
    subText: "#64B5F6",
    muted: "#1A3A5C",
    border: "rgba(0,176,255,0.2)",
    shadow: "0 8px 40px rgba(0,176,255,0.12)",
    gridLine: "rgba(0,176,255,0.06)",
    borderRadius: 14,
    palette: ["#00B0FF", "#00E5FF", "#1DE9B6", "#40C4FF", "#80D8FF", "#18FFFF", "#00BCD4", "#0091EA"],
  },
  "forest-green": {
    background: "#061A0E",
    cardBackground: "#0A2414",
    accent: "#00C853",
    accentSecondary: "#76FF03",
    text: "#F1F8E9",
    subText: "#A5D6A7",
    muted: "#2E7D32",
    border: "rgba(0,200,83,0.2)",
    shadow: "0 8px 32px rgba(0,200,83,0.12)",
    gridLine: "rgba(0,200,83,0.06)",
    borderRadius: 12,
    palette: ["#00C853", "#76FF03", "#1DE9B6", "#FFD600", "#69F0AE", "#B9F6CA", "#00BFA5", "#CCFF90"],
  },
  "purple-gradient": {
    background: "#0D001A",
    cardBackground: "#160026",
    accent: "#AA00FF",
    accentSecondary: "#D500F9",
    text: "#FFFFFF",
    subText: "#CE93D8",
    muted: "#4A148C",
    border: "rgba(170,0,255,0.2)",
    shadow: "0 8px 40px rgba(170,0,255,0.2)",
    gridLine: "rgba(170,0,255,0.06)",
    borderRadius: 16,
    palette: ["#AA00FF", "#D500F9", "#651FFF", "#E040FB", "#7C4DFF", "#FF4081", "#FF6D00", "#00E5FF"],
  },
  "corporate-slate": {
    background: "#0C1322",
    cardBackground: "#1A2236",
    accent: "#4FC3F7",
    accentSecondary: "#81D4FA",
    text: "#ECF0F1",
    subText: "#90A4AE",
    muted: "#37474F",
    border: "rgba(79,195,247,0.15)",
    shadow: "0 4px 24px rgba(0,0,0,0.4)",
    gridLine: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    palette: ["#4FC3F7", "#81D4FA", "#4DD0E1", "#80CBC4", "#A5D6A7", "#FFF176", "#FFCC80", "#EF9A9A"],
  },
};

const LAYOUTS: Record<LayoutId, LayoutConfig> = {
  executive: {
    kpiRow: true,
    gridCols: 12,
    gridRowHeight: 90,
    chartPositions: [
      { x: 0, y: 0, w: 8, h: 5 },
      { x: 8, y: 0, w: 4, h: 5 },
      { x: 0, y: 5, w: 6, h: 5 },
      { x: 6, y: 5, w: 6, h: 5 },
    ],
  },
  compact: {
    kpiRow: true,
    gridCols: 12,
    gridRowHeight: 85,
    chartPositions: [
      { x: 0, y: 0, w: 6, h: 4 },
      { x: 6, y: 0, w: 6, h: 4 },
      { x: 0, y: 4, w: 4, h: 4 },
      { x: 4, y: 4, w: 8, h: 4 },
    ],
  },
  magazine: {
    kpiRow: true,
    gridCols: 12,
    gridRowHeight: 90,
    chartPositions: [
      { x: 0, y: 0, w: 12, h: 5 },
      { x: 0, y: 5, w: 4, h: 4 },
      { x: 4, y: 5, w: 4, h: 4 },
      { x: 8, y: 5, w: 4, h: 4 },
    ],
  },
};

function numeric(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function pickField(data: Array<Record<string, unknown>>, preferred?: string): string {
  if (preferred && data.length && preferred in data[0]) return preferred;
  if (!data.length) return "x";
  return Object.keys(data[0])[0] || "x";
}

function pickNumericField(data: Array<Record<string, unknown>>, preferred?: string): string {
  if (preferred && data.length && preferred in data[0]) return preferred;
  if (!data.length) return "value";
  const keys = Object.keys(data[0]);
  const firstNumeric = keys.find((k) => data.some((d) => typeof d[k] === "number"));
  return firstNumeric || keys[1] || keys[0] || "value";
}

function lineTooltip(theme: ThemeConfig) {
  return {
    trigger: "axis",
    backgroundColor: theme.cardBackground,
    borderColor: theme.border,
    borderWidth: 1,
    textStyle: { color: theme.text, fontSize: 13 },
    axisPointer: { type: "cross", lineStyle: { color: theme.accent, opacity: 0.5 } },
  };
}

export function buildEChartsOption(
  chartType: string,
  data: Array<Record<string, unknown>>,
  theme: ThemeConfig,
  xFieldInput?: string,
  yFieldInput?: string,
  groupField?: string | null
): Record<string, unknown> {
  const xField = pickField(data, xFieldInput);
  const yField = pickNumericField(data, yFieldInput);
  const maxValue = Math.max(1, ...data.map((d) => numeric(d[yField])));

  switch ((chartType || "bar").toLowerCase()) {
    case "sunburst":
      return {
        animation: true,
        animationDuration: 1500,
        animationEasing: "cubicOut",
        tooltip: {
          trigger: "item",
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          textStyle: { color: theme.text },
        },
        series: [{
          type: "sunburst",
          radius: ["15%", "90%"],
          center: ["50%", "50%"],
          sort: "desc",
          emphasis: { focus: "ancestor", itemStyle: { shadowBlur: 20, shadowColor: theme.accent } },
          levels: [
            {},
            { r0: "15%", r: "40%", itemStyle: { borderWidth: 2, borderColor: theme.background }, label: { rotate: "tangential", color: theme.text, fontSize: 11 } },
            { r0: "40%", r: "70%", itemStyle: { borderWidth: 2, borderColor: theme.background }, label: { color: theme.text, fontSize: 10 } },
            { r0: "70%", r: "90%", itemStyle: { borderWidth: 2, borderColor: theme.background }, label: { position: "outside", color: theme.subText, fontSize: 9 } },
          ],
          data: data.map((d, i) => ({ name: String(d[xField]), value: numeric(d[yField]), itemStyle: { color: theme.palette[i % theme.palette.length] } })),
        }],
      };
    case "bubble":
      return {
        animation: true,
        animationDuration: 1200,
        tooltip: {
          trigger: "item",
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
          textStyle: { color: theme.text },
          formatter: (params: { data: [number, number, number, string] }) => `${params.data?.[3] || ""}<br/>X: ${params.data?.[0]}<br/>Y: ${params.data?.[1]}<br/>Size: ${params.data?.[2]}`,
        },
        grid: { left: "3%", right: "4%", bottom: "10%", top: "8%", containLabel: true },
        xAxis: { type: "value", axisLabel: { color: theme.subText }, splitLine: { lineStyle: { color: theme.gridLine } } },
        yAxis: { type: "value", axisLabel: { color: theme.subText }, splitLine: { lineStyle: { color: theme.gridLine } } },
        series: [{
          type: "scatter",
          symbolSize: (val: number[]) => Math.sqrt(Math.max(1, val[2])) * 3 + 8,
          data: data.map((d) => [numeric(d[xField]), numeric(d[yField]), numeric(d[groupField || yField]), String(d[xField])]),
          itemStyle: { opacity: 0.85, shadowBlur: 15, shadowColor: `${theme.accent}60` },
          emphasis: { itemStyle: { shadowBlur: 30, shadowColor: theme.accent } },
        }],
      };
    case "polar-bar":
      return {
        animation: true,
        animationDuration: 1400,
        animationEasing: "elasticOut",
        tooltip: { trigger: "item", backgroundColor: theme.cardBackground, borderColor: theme.border, textStyle: { color: theme.text } },
        angleAxis: { type: "category", data: data.map((d) => String(d[xField])), axisLabel: { color: theme.subText, fontSize: 11 }, axisLine: { lineStyle: { color: theme.muted } } },
        radiusAxis: { axisLabel: { color: theme.subText, fontSize: 10 }, splitLine: { lineStyle: { color: theme.gridLine } } },
        polar: { radius: ["15%", "85%"] },
        series: [{
          type: "bar",
          data: data.map((d, i) => ({ value: numeric(d[yField]), itemStyle: { color: theme.palette[i % theme.palette.length], borderRadius: 4, shadowBlur: 8, shadowColor: `${theme.accent}40` } })),
          coordinateSystem: "polar",
          emphasis: { itemStyle: { shadowBlur: 20, shadowColor: theme.accent } },
        }],
      };
    case "sankey": {
      const sankeyNodes: Array<{ name: string; itemStyle?: { color: string } }> = [];
      const sankeyLinks: Array<{ source: string; target: string; value: number }> = [];
      const seen = new Set<string>();
      data.forEach((d, i) => {
        const source = String(d[xField]);
        const target = String((groupField && d[groupField]) || `${source}_out`);
        if (!seen.has(source)) {
          sankeyNodes.push({ name: source, itemStyle: { color: theme.palette[i % theme.palette.length] } });
          seen.add(source);
        }
        if (!seen.has(target)) {
          sankeyNodes.push({ name: target });
          seen.add(target);
        }
        sankeyLinks.push({ source, target, value: numeric(d[yField]) });
      });
      return {
        animation: true,
        tooltip: { trigger: "item", backgroundColor: theme.cardBackground, borderColor: theme.border, textStyle: { color: theme.text }, formatter: "{b}: {c}" },
        series: [{
          type: "sankey",
          layout: "none",
          emphasis: { focus: "adjacency" },
          nodeWidth: 20,
          nodeGap: 12,
          label: { color: theme.text, fontSize: 11 },
          lineStyle: { color: "gradient", opacity: 0.4, curveness: 0.5 },
          data: sankeyNodes,
          links: sankeyLinks,
        }],
      };
    }
    case "pictorial-bar":
      return {
        animation: true,
        animationDuration: 1200,
        animationEasing: "elasticOut",
        tooltip: { trigger: "axis", backgroundColor: theme.cardBackground, borderColor: theme.border, textStyle: { color: theme.text } },
        xAxis: { type: "category", data: data.map((d) => String(d[xField])), axisLabel: { color: theme.subText, fontSize: 11 }, axisLine: { lineStyle: { color: theme.muted } } },
        yAxis: { axisLabel: { color: theme.subText }, splitLine: { lineStyle: { color: theme.gridLine } } },
        series: [{
          type: "pictorialBar",
          symbol: "roundRect",
          symbolRepeat: true,
          symbolSize: [18, 8],
          symbolMargin: "20%",
          data: data.map((d, i) => ({ value: numeric(d[yField]), itemStyle: { color: theme.palette[i % theme.palette.length], opacity: 0.9 } })),
          emphasis: { itemStyle: { opacity: 1, shadowBlur: 15, shadowColor: theme.accent } },
          label: { show: true, position: "top", color: theme.subText, fontSize: 11 },
        }],
      };
    case "rose":
    case "nightingale":
      return {
        animation: true,
        animationDuration: 1500,
        animationEasing: "cubicOut",
        tooltip: { trigger: "item", backgroundColor: theme.cardBackground, borderColor: theme.border, textStyle: { color: theme.text }, formatter: "{b}: {c} ({d}%)" },
        legend: { bottom: "2%", textStyle: { color: theme.subText, fontSize: 11 }, icon: "circle" },
        series: [{
          type: "pie",
          radius: ["15%", "75%"],
          center: ["50%", "48%"],
          roseType: "area",
          itemStyle: { borderRadius: 8, borderColor: theme.background, borderWidth: 2 },
          label: { color: theme.subText, fontSize: 10 },
          emphasis: { itemStyle: { shadowBlur: 20, shadowColor: theme.accent } },
          data: data.map((d, i) => ({ name: String(d[xField]), value: numeric(d[yField]), itemStyle: { color: theme.palette[i % theme.palette.length] } })),
        }],
      };
    case "combo":
      return {
        animation: true,
        animationDuration: 1100,
        tooltip: { trigger: "axis", backgroundColor: theme.cardBackground, borderColor: theme.border, textStyle: { color: theme.text }, axisPointer: { type: "cross" } },
        legend: { bottom: 0, textStyle: { color: theme.subText, fontSize: 11 } },
        grid: { left: "3%", right: "4%", bottom: "12%", top: "8%", containLabel: true },
        xAxis: { type: "category", data: data.map((d) => String(d[xField])), axisLabel: { color: theme.subText, fontSize: 11 }, axisLine: { lineStyle: { color: theme.muted } } },
        yAxis: [
          { type: "value", name: "Volume", axisLabel: { color: theme.subText, fontSize: 10 }, splitLine: { lineStyle: { color: theme.gridLine } } },
          { type: "value", name: "Trend", position: "right", axisLabel: { color: theme.accent, fontSize: 10 }, splitLine: { show: false } },
        ],
        series: [
          {
            name: "Volume",
            type: "bar",
            barMaxWidth: 40,
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
              color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: theme.accent }, { offset: 1, color: `${theme.accent}40` }] },
            },
            data: data.map((d) => numeric(d[yField])),
          },
          {
            name: "Trend",
            type: "line",
            yAxisIndex: 1,
            smooth: true,
            symbol: "circle",
            symbolSize: 6,
            lineStyle: { width: 3, color: theme.accentSecondary },
            itemStyle: { color: theme.accentSecondary },
            data: data.map((d) => numeric((groupField && d[groupField]) || d[yField])),
          },
        ],
      };
    case "radial-bar":
      return {
        animation: true,
        animationDuration: 1500,
        animationEasing: "cubicOut",
        tooltip: { trigger: "item", backgroundColor: theme.cardBackground, borderColor: theme.border, textStyle: { color: theme.text } },
        angleAxis: { max: maxValue * 1.2, startAngle: 90, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, splitLine: { show: false } },
        radiusAxis: { type: "category", data: data.map((d) => String(d[xField])), axisLabel: { color: theme.subText, fontSize: 11 }, axisLine: { show: false }, axisTick: { show: false } },
        polar: { radius: ["20%", "88%"] },
        series: [{
          type: "bar",
          data: data.map((d, i) => ({ value: numeric(d[yField]), itemStyle: { color: theme.palette[i % theme.palette.length], borderRadius: 6, shadowBlur: 10, shadowColor: `${theme.palette[i % theme.palette.length]}60` } })),
          coordinateSystem: "polar",
          roundCap: true,
          emphasis: { itemStyle: { shadowBlur: 25, shadowColor: theme.accent } },
        }],
      };
    case "step-line":
      return {
        animation: true,
        animationDuration: 1200,
        animationEasing: "cubicOut",
        tooltip: { trigger: "axis", backgroundColor: theme.cardBackground, borderColor: theme.border, textStyle: { color: theme.text }, axisPointer: { type: "cross" } },
        grid: { left: "3%", right: "4%", bottom: "10%", top: "5%", containLabel: true },
        xAxis: { type: "category", data: data.map((d) => String(d[xField])), axisLabel: { color: theme.subText, fontSize: 11 }, axisLine: { lineStyle: { color: theme.muted } }, boundaryGap: false },
        yAxis: { axisLabel: { color: theme.subText }, splitLine: { lineStyle: { color: theme.gridLine } } },
        series: [{
          type: "line",
          step: "middle",
          data: data.map((d) => numeric(d[yField])),
          lineStyle: { width: 3, color: theme.accent },
          itemStyle: { color: theme.accent, borderWidth: 2, borderColor: theme.cardBackground },
          areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${theme.accent}50` }, { offset: 1, color: `${theme.accent}05` }] } },
          emphasis: { itemStyle: { shadowBlur: 15, shadowColor: theme.accent } },
          markPoint: {
            data: [
              { type: "max", name: "Max", label: { color: theme.text } },
              { type: "min", name: "Min", label: { color: theme.subText } },
            ],
            symbol: "pin",
            itemStyle: { color: theme.accent },
          },
        }],
      };
    default:
      return {
        animation: true,
        animationDuration: 1000,
        tooltip: lineTooltip(theme),
        grid: { left: "3%", right: "4%", bottom: "10%", top: "5%", containLabel: true },
        xAxis: { type: "category", data: data.map((d) => String(d[xField])), axisLabel: { color: theme.subText, fontSize: 11 }, axisLine: { lineStyle: { color: theme.muted } } },
        yAxis: { type: "value", axisLabel: { color: theme.subText }, splitLine: { lineStyle: { color: theme.gridLine } } },
        series: [{ type: "bar", data: data.map((d) => numeric(d[yField])) }],
      };
  }
}

function buildKpiCards(openaiResponse: Doc2ChartResponse): KpiCard[] {
  const summary = openaiResponse.kpi_summary || {};
  const values = [
    { id: "kpi_total", label: "Total", value: Number(summary.total || 0), deltaDirection: "up" as const },
    { id: "kpi_avg", label: "Average", value: Number(summary.average || 0), deltaDirection: "up" as const },
    { id: "kpi_max", label: "Maximum", value: Number(summary.maximum || 0), deltaDirection: "up" as const },
    { id: "kpi_min", label: "Minimum", value: Number(summary.minimum || 0), deltaDirection: "down" as const },
  ];
  return values.map((k) => ({
    id: k.id,
    label: k.label,
    value: k.value,
    formattedValue: Number.isFinite(k.value) ? k.value.toLocaleString() : "0",
    delta: 0,
    deltaDirection: k.deltaDirection,
    deltaLabel: "vs previous",
    sparklineData: [],
  }));
}

function buildVariant(
  variantId: number,
  openaiResponse: Doc2ChartResponse,
  insightsResponse: InsightsResponse,
  theme: ThemeConfig,
  layout: LayoutConfig,
  mode: "original" | "compact" | "alternate" | "hero"
): DashboardSpec {
  const slots = (openaiResponse.chart_slots || []).slice(0, 4);
  while (slots.length < 4) {
    slots.push({ slot: slots.length + 1, recommended_type: "bar", data: [] });
  }

  const reordered = mode === "alternate" ? [...slots].reverse() : slots;

  const charts = reordered.map((slot, index) => ({
    id: `chart_${variantId}_${index + 1}`,
    type: slot.recommended_type || "bar",
    title: `Chart ${index + 1}`,
    subtitle: slot.reason || "",
    position: layout.chartPositions[index],
    echartsOption: buildEChartsOption(
      slot.recommended_type || "bar",
      (slot.data || []) as Array<Record<string, unknown>>,
      theme,
      slot.x_field,
      slot.y_field,
      slot.group_field
    ),
    data: slot.data || [],
  }));

  return {
    id: `dashboard_${variantId}`,
    title: `Dashboard Variant ${variantId}`,
    theme: {
      background: theme.background,
      cardBackground: theme.cardBackground,
      primaryColor: theme.accent,
      accentColor: theme.accentSecondary,
      textColor: theme.text,
      subTextColor: theme.subText,
      mutedColor: theme.muted,
      borderRadius: theme.borderRadius,
      cardShadow: theme.shadow,
      borderColor: theme.border,
      chartColors: theme.palette,
    },
    layout: mode,
    kpiCards: buildKpiCards(openaiResponse),
    charts,
    insightText: insightsResponse.top_insight || openaiResponse.insight || "Insight unavailable",
    voiceNarration: insightsResponse.voice_narration || "",
  } as DashboardSpec;
}

export function buildDashboards(
  openaiResponse: Doc2ChartResponse,
  insightsResponse: InsightsResponse,
  userPrefs: UserPreferences
): DashboardSpec[] {
  const baseTheme = THEMES[userPrefs.theme] || THEMES["dark-professional"];
  const theme: ThemeConfig = {
    ...baseTheme,
    accent: userPrefs.accentOverride || baseTheme.accent,
  };
  const layout = LAYOUTS[userPrefs.layout] || LAYOUTS.executive;

  return [
    buildVariant(1, openaiResponse, insightsResponse, theme, layout, "original"),
    buildVariant(2, openaiResponse, insightsResponse, theme, LAYOUTS.compact, "compact"),
    buildVariant(3, openaiResponse, insightsResponse, theme, layout, "alternate"),
    buildVariant(4, openaiResponse, insightsResponse, theme, LAYOUTS.magazine, "hero"),
  ];
}
