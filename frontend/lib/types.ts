export interface Theme {
  background: string;
  cardBackground: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  subTextColor: string;
  mutedColor: string;
  borderRadius: number;
  cardShadow: string;
  borderColor: string;
  chartColors?: string[];
  headingColor?: string;
  subheadingColor?: string;
}

export interface KpiCard {
  id: string;
  label: string;
  value: number;
  formattedValue: string;
  prefix?: string;
  suffix?: string;
  delta?: number;
  deltaDirection?: "up" | "down";
  deltaLabel?: string;
}

export interface ChartPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Chart {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  position: ChartPosition;
  xAxis?: { field: string; label?: string; prefix?: string };
  yAxis?: { field: string; label?: string; prefix?: string };
  groupBy?: string;
  colors?: string[];
  showLegend?: boolean;
  legendPosition?: "top" | "bottom" | "left" | "right";
  showGrid?: boolean;
  data: Record<string, unknown>[];
}

export interface DashboardSpec {
  id: string;
  title: string;
  theme: Theme;
  kpiCards: KpiCard[];
  charts: Chart[];
  insightText: string;
  layout?: string;
}

export interface ApiResponse {
  dashboards: DashboardSpec[];
  source?: {
    dataset?: string;
    meta?: Record<string, unknown>;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

export interface ChatConversationSummary {
  id: string;
  title: string;
  kpi?: string | null;
  dashboards?: string[];
  createdAt: string;
  updatedAt?: string;
  preview: string;
}

export interface ChatConversationDetail {
  id: string;
  title: string;
  kpi?: string | null;
  dashboards?: string[];
  createdAt: string;
  messages: ChatMessage[];
}
