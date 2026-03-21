import { DashboardSpec } from "@/lib/types";

import ChartRenderer from "@/components/ChartRenderer";
import KpiCard from "@/components/KpiCard";

type Props = {
  dashboard: DashboardSpec;
};

export default function DashboardRenderer({ dashboard }: Props) {
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

  return (
    <section
      className="rounded-2xl p-4 md:p-6"
      style={{
        background: safeTheme.background,
        color: safeTheme.textColor,
      }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl" style={{ color: dashboard.theme?.headingColor || safeTheme.textColor }}>
          {dashboard.title}
        </h1>
        {dashboard.insightText && (
          <p className="mt-1 text-sm" style={{ color: dashboard.theme?.subheadingColor || safeTheme.subTextColor }}>
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
            <div className="mb-2">
              <h3 className="text-sm font-semibold" style={{ color: safeTheme.textColor }}>
                {chart.title}
              </h3>
              {chart.subtitle && (
                <p className="text-xs" style={{ color: safeTheme.subTextColor }}>
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
