"use client";

import { useMemo } from "react";

import type { UserPreferences } from "@/lib/DesignEngine";

type Props = {
  preferences: UserPreferences;
  onChange: (next: UserPreferences) => void;
};

const THEMES = [
  { id: "dark-professional", label: "Dark Professional", color: "#2979FF" },
  { id: "light-minimal", label: "Light Minimal", color: "#3D5AFE" },
  { id: "vibrant-sunset", label: "Vibrant Sunset", color: "#FF6D00" },
  { id: "ocean-blue", label: "Ocean Blue", color: "#00B0FF" },
  { id: "forest-green", label: "Forest Green", color: "#00C853" },
  { id: "purple-gradient", label: "Purple Gradient", color: "#AA00FF" },
  { id: "corporate-slate", label: "Corporate Slate", color: "#4FC3F7" },
] as const;

const ALL_CHARTS = [
  { id: "line", label: "Line" },
  { id: "bar", label: "Bar" },
  { id: "horizontal-bar", label: "Horizontal Bar" },
  { id: "stacked-bar", label: "Stacked Bar" },
  { id: "donut", label: "Donut" },
  { id: "area", label: "Area" },
  { id: "gauge", label: "Gauge" },
  { id: "treemap", label: "Treemap" },
  { id: "heatmap", label: "Heatmap" },
  { id: "scatter", label: "Scatter" },
  { id: "waterfall", label: "Waterfall" },
  { id: "sparkline", label: "Sparkline" },
  { id: "funnel", label: "Funnel" },
  { id: "radar", label: "Radar" },
  { id: "sunburst", label: "Sunburst" },
  { id: "pie", label: "Pie" },
  { id: "bubble", label: "Bubble" },
  { id: "polar-bar", label: "Polar Bar" },
  { id: "sankey", label: "Sankey" },
  { id: "pictorial-bar", label: "Pictorial Bar" },
  { id: "rose", label: "Rose" },
  { id: "combo", label: "Combo" },
  { id: "radial-bar", label: "Radial Bar" },
  { id: "step-line", label: "Step Line" },
  { id: "nightingale", label: "Nightingale" },
] as const;

const LAYOUTS = [
  { id: "executive", label: "Executive" },
  { id: "compact", label: "Compact" },
  { id: "magazine", label: "Magazine" },
] as const;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "dark-professional",
  selectedCharts: ["line", "bar", "donut", "area"],
  layout: "executive",
  accentOverride: null,
};

export default function UserPreferencePanel({ preferences, onChange }: Props) {
  const selectionError = useMemo(() => preferences.selectedCharts.length < 3, [preferences.selectedCharts.length]);

  const toggleChart = (id: string) => {
    const exists = preferences.selectedCharts.includes(id);
    const nextCharts = exists
      ? preferences.selectedCharts.filter((item) => item !== id)
      : [...preferences.selectedCharts, id];

    onChange({
      ...preferences,
      selectedCharts: nextCharts,
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="grid gap-4 lg:grid-cols-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">Theme Palette</p>
          <div className="space-y-2">
            {THEMES.map((theme) => {
              const selected = preferences.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onChange({ ...preferences, theme: theme.id })}
                  className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition ${
                    selected ? "border-slate-900 ring-2 ring-slate-300" : "border-slate-200"
                  }`}
                >
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.color }} />
                  {theme.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Chart Types</p>
            <span className="text-xs text-slate-500">{preferences.selectedCharts.length}/25 selected</span>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {ALL_CHARTS.map((chart) => {
              const selected = preferences.selectedCharts.includes(chart.id);
              return (
                <button
                  key={chart.id}
                  type="button"
                  onClick={() => toggleChart(chart.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    selected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                  }`}
                >
                  {chart.label}
                </button>
              );
            })}
          </div>
          {selectionError ? <p className="mt-2 text-xs font-medium text-rose-600">Select at least 3 chart types.</p> : null}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">Layout Style</p>
          <div className="space-y-2">
            {LAYOUTS.map((layout) => {
              const selected = preferences.layout === layout.id;
              return (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => onChange({ ...preferences, layout: layout.id })}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                    selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {layout.label}
                </button>
              );
            })}
          </div>
          <label className="mt-3 block text-xs font-semibold text-slate-700">Custom Accent (optional)</label>
          <input
            type="color"
            value={preferences.accentOverride || "#2979FF"}
            onChange={(e) => onChange({ ...preferences, accentOverride: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded border border-slate-300 bg-white"
          />
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-slate-500 underline"
            onClick={() => onChange({ ...preferences, accentOverride: null })}
          >
            Clear Accent Override
          </button>
        </div>
      </div>
    </section>
  );
}
