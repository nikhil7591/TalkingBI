"use client";

import { DashboardSpec } from "@/lib/types";

type Props = {
  dashboards: DashboardSpec[];
  activeId: string;
  onChange: (id: string) => void;
};

export default function DashboardTabs({ dashboards, activeId, onChange }: Props) {
  const active = dashboards.find((d) => d.id === activeId) ?? dashboards[0];

  return (
    <div
      className="rounded-2xl p-2 transition-all duration-300"
      style={{
        background: active?.theme.cardBackground,
        border: `1px solid ${active?.theme.borderColor}`,
      }}
    >
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        {dashboards.map((dash) => {
          const isActive = dash.id === activeId;
          return (
            <button
              key={dash.id}
              onClick={() => onChange(dash.id)}
              className="rounded-xl px-4 py-3 text-left transition-all duration-300"
              style={{
                background: isActive ? dash.theme.primaryColor : "transparent",
                color: isActive ? "#fff" : active.theme.textColor,
                transform: isActive ? "translateY(-1px)" : "none",
              }}
            >
              <div className="text-xs uppercase tracking-wide opacity-75">Dashboard</div>
              <div className="text-sm font-semibold">{dash.title}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
