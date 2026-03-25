export interface ThemeConfig {
  name: string;
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
  chartColors: string[];
  headingColor: string;
  subheadingColor: string;
}

export const AVAILABLE_THEMES: Record<string, ThemeConfig> = {
  "dark-professional": {
    name: "Dark Professional",
    background: "linear-gradient(135deg,#030712 0%,#111827 46%,#0f172a 100%)",
    cardBackground: "linear-gradient(135deg,rgba(30,41,59,0.92) 0%,rgba(15,23,42,0.92) 100%)",
    primaryColor: "#0f3460",
    accentColor: "#533483",
    textColor: "#e0e0e0",
    subTextColor: "#a0a0a0",
    mutedColor: "#707070",
    borderRadius: 12,
    cardShadow: "0 12px 36px rgba(0, 0, 0, 0.35)",
    borderColor: "#2d3561",
    chartColors: ["#00d4ff", "#0096ff", "#ff006e", "#8338ec", "#ffbe0b"],
    headingColor: "#ffffff",
    subheadingColor: "#b0b0b0",
  },
  "light-minimal": {
    name: "Light Minimal",
    background: "linear-gradient(135deg,#f8fbff 0%,#eef4ff 50%,#f5f3ff 100%)",
    cardBackground: "linear-gradient(135deg,rgba(255,255,255,0.95) 0%,rgba(248,250,252,0.96) 100%)",
    primaryColor: "#e9ecef",
    accentColor: "#dee2e6",
    textColor: "#212529",
    subTextColor: "#6c757d",
    mutedColor: "#9ca3af",
    borderRadius: 12,
    cardShadow: "0 10px 30px rgba(37, 99, 235, 0.12)",
    borderColor: "#dee2e6",
    chartColors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
    headingColor: "#111827",
    subheadingColor: "#4b5563",
  },
  "vibrant-sunset": {
    name: "Vibrant Sunset",
    background: "linear-gradient(135deg,#fff1e6 0%,#ffe4d6 45%,#ffe9f0 100%)",
    cardBackground: "linear-gradient(135deg,rgba(255,252,247,0.95) 0%,rgba(255,246,238,0.96) 100%)",
    primaryColor: "#f8c471",
    accentColor: "#f5b041",
    textColor: "#5d4e37",
    subTextColor: "#7d6c5d",
    mutedColor: "#9b8b7e",
    borderRadius: 12,
    cardShadow: "0 10px 30px rgba(249, 115, 22, 0.18)",
    borderColor: "#f9d9b8",
    chartColors: ["#ff6b6b", "#ffa500", "#ffd700", "#ff69b4", "#ff1493"],
    headingColor: "#8b4513",
    subheadingColor: "#a0522d",
  },
  "ocean-blue": {
    name: "Ocean Blue",
    background: "linear-gradient(135deg,#03203f 0%,#0c4a6e 48%,#082f49 100%)",
    cardBackground: "linear-gradient(135deg,rgba(12,74,110,0.88) 0%,rgba(8,47,73,0.9) 100%)",
    primaryColor: "#1f5a96",
    accentColor: "#2a9df4",
    textColor: "#d0e8f2",
    subTextColor: "#90cdf4",
    mutedColor: "#4fd1c5",
    borderRadius: 12,
    cardShadow: "0 12px 34px rgba(3, 105, 161, 0.25)",
    borderColor: "#1f5a96",
    chartColors: ["#00d4ff", "#0096ff", "#1e90ff", "#4169e1", "#87ceeb"],
    headingColor: "#ffffff",
    subheadingColor: "#b0e0e6",
  },
  "forest-green": {
    name: "Forest Green",
    background: "linear-gradient(135deg,#052e16 0%,#14532d 46%,#064e3b 100%)",
    cardBackground: "linear-gradient(135deg,rgba(21,101,52,0.86) 0%,rgba(6,78,59,0.9) 100%)",
    primaryColor: "#2d6a4f",
    accentColor: "#40916c",
    textColor: "#d8f3dc",
    subTextColor: "#95d5b2",
    mutedColor: "#52b788",
    borderRadius: 12,
    cardShadow: "0 12px 34px rgba(22, 163, 74, 0.22)",
    borderColor: "#2d6a4f",
    chartColors: ["#22c55e", "#16a34a", "#15803d", "#84cc16", "#b4e197"],
    headingColor: "#f0fdf4",
    subheadingColor: "#bbf7d0",
  },
  "purple-gradient": {
    name: "Purple Gradient",
    background: "linear-gradient(135deg,#3b0764 0%,#581c87 50%,#7e22ce 100%)",
    cardBackground: "linear-gradient(135deg,rgba(88,28,135,0.86) 0%,rgba(126,34,206,0.8) 100%)",
    primaryColor: "#5b3d9b",
    accentColor: "#6d4bd1",
    textColor: "#e6d9f5",
    subTextColor: "#c8b1e1",
    mutedColor: "#a57dcc",
    borderRadius: 12,
    cardShadow: "0 12px 34px rgba(147, 51, 234, 0.28)",
    borderColor: "#5b3d9b",
    chartColors: ["#a855f7", "#9333ea", "#7c3aed", "#6d28d9", "#c4b5fd"],
    headingColor: "#f3e8ff",
    subheadingColor: "#ddd6fe",
  },
  "corporate-slate": {
    name: "Corporate Slate",
    background: "linear-gradient(135deg,#0f172a 0%,#1e293b 52%,#334155 100%)",
    cardBackground: "linear-gradient(135deg,rgba(51,65,85,0.92) 0%,rgba(30,41,59,0.92) 100%)",
    primaryColor: "#475569",
    accentColor: "#64748b",
    textColor: "#f1f5f9",
    subTextColor: "#cbd5e1",
    mutedColor: "#94a3b8",
    borderRadius: 12,
    cardShadow: "0 12px 32px rgba(15, 23, 42, 0.45)",
    borderColor: "#475569",
    chartColors: ["#0ea5e9", "#06b6d4", "#14b8a6", "#10b981", "#34d399"],
    headingColor: "#f8fafc",
    subheadingColor: "#e2e8f0",
  },
};

export const DEFAULT_THEME: ThemeConfig = AVAILABLE_THEMES["dark-professional"];

export const THEME_KEYS = Object.keys(AVAILABLE_THEMES);

export function getThemeByName(name: string): ThemeConfig {
  return AVAILABLE_THEMES[name] || DEFAULT_THEME;
}
