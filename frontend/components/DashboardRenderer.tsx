import { DashboardSpec } from "@/lib/types";

import ChartRenderer from "@/components/ChartRenderer";
import KpiCard from "@/components/KpiCard";

type Props = {
  dashboard: DashboardSpec;
};

export default function DashboardRenderer({ dashboard }: Props) {
  const normalizeHex = (input: string): string | null => {
    const value = (input || "").trim();
    const short = /^#([0-9a-f]{3})$/i.exec(value);
    if (short) {
      const [, hex] = short;
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
    }
    const full = /^#([0-9a-f]{6})$/i.exec(value);
    if (full) {
      return `#${full[1].toLowerCase()}`;
    }
    return null;
  };

  const readableText = (bg: string, preferred: string, fallbackDark = "#e2e8f0", fallbackLight = "#0f172a") => {
    const hex = normalizeHex(bg);
    if (!hex) return preferred;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.45 ? fallbackDark : fallbackLight;
  };

  const safeTheme = {
    background: dashboard.theme?.background || "#0f172a",
    cardBackground: dashboard.theme?.cardBackground || "#111827",
    primaryColor: dashboard.theme?.primaryColor || "#2563eb",
    accentColor: dashboard.theme?.accentColor || "#22d3ee",
    textColor: dashboard.theme?.textColor || "#ffffff",
    subTextColor: dashboard.theme?.subTextColor || "#94a3b8",
    mutedColor: dashboard.theme?.mutedColor || "#64748b",
    borderRadius: dashboard.theme?.borderRadius ?? 12,
    cardShadow: dashboard.theme?.cardShadow || "0 4px 20px rgba(0,0,0,0.3)",
    borderColor: dashboard.theme?.borderColor || "rgba(255,255,255,0.1)",
  };

  const titleColor = dashboard.theme?.headingColor || readableText(safeTheme.background, safeTheme.textColor);
  const subtitleColor = dashboard.theme?.subheadingColor || readableText(safeTheme.background, safeTheme.subTextColor, "#cbd5e1", "#475569");
  const chartTitleColor = readableText(safeTheme.cardBackground, safeTheme.textColor);
  const chartSubtitleColor = readableText(safeTheme.cardBackground, safeTheme.subTextColor, "#cbd5e1", "#64748b");

  return (
    <section
      className="rounded-2xl p-4 md:p-6"
      style={{
        background: safeTheme.background,
        color: safeTheme.textColor,
      }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl" style={{ color: titleColor }}>
          {dashboard.title}
        </h1>
        {dashboard.insightText && (
          <p className="mt-1 text-sm" style={{ color: subtitleColor }}>
            {dashboard.insightText}
          </p>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        {dashboard.kpiCards.slice(0, 4).map((card) => (
          <KpiCard key={card.id} card={card} theme={safeTheme} />
        ))}
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridAutoRows: "80px",
          gap: "16px",
        }}
      >
        {dashboard.charts.map((chart) => (
          <div
            key={chart.id}
            className="group relative overflow-hidden transition-transform duration-300 hover:-translate-y-1"
            style={{
              gridColumn: `${chart.position.x + 1} / span ${chart.position.w}`,
              gridRow: `${chart.position.y + 1} / span ${chart.position.h}`,
              background: safeTheme.cardBackground,
              border: `1px solid ${safeTheme.borderColor}`,
              borderRadius: `${safeTheme.borderRadius}px`,
              boxShadow: safeTheme.cardShadow,
              padding: "12px",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(circle at 15% 15%, rgba(34,211,238,0.16), rgba(0,0,0,0) 55%)",
              }}
            />
            <div className="mb-2">
              <h3 className="text-sm font-semibold" style={{ color: chartTitleColor }}>
                {chart.title}
              </h3>
              {chart.subtitle && (
                <p className="text-xs" style={{ color: chartSubtitleColor }}>
                  {chart.subtitle}
                </p>
              )}
            </div>
            <div style={{ width: "100%", height: "calc(100% - 36px)" }}>
              <ChartRenderer chart={chart} theme={safeTheme} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
