"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import BIChatbot from "@/components/BIChatbot";
import DashboardPreviewGallery from "@/components/DashboardPreviewGallery";
import KpiInput from "@/components/KpiInput";
import DisplayCards from "@/components/ui/display-cards";
import { GradualSpacing } from "@/components/ui/gradual-spacing";
import UniqueLoading from "@/components/ui/morph-loading";
import { generateDashboards } from "@/lib/api";
import { DashboardSpec } from "@/lib/types";

const DASHBOARD_NAMES = [
  "Trend Analysis & Performance",
  "Comparative Analysis",
  "Deep Dive Analysis",
  "Performance Metrics",
];

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-28 animate-pulse rounded-xl bg-slate-300/60" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-64 animate-pulse rounded-xl bg-slate-300/50" />
        ))}
      </div>
    </div>
  );
}

function GenerationOverlay({ step }: { step: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-center gap-4">
          <UniqueLoading size="md" />
          <div>
            <h3 className="text-lg font-bold">Generating Dashboards...</h3>
            <p className="text-sm text-slate-300">Please wait while advanced dashboards are being prepared.</p>
          </div>
        </div>

        <div className="space-y-2">
          {DASHBOARD_NAMES.map((name, idx) => {
            const active = idx === step;
            const done = idx < step;
            return (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
                style={{
                  borderColor: active ? "#22d3ee" : "#334155",
                  background: active ? "rgba(34,211,238,0.14)" : "rgba(15,23,42,0.75)",
                }}
              >
                <span className="text-sm font-semibold">{name}</span>
                <span className="text-xs font-bold" style={{ color: done ? "#22c55e" : active ? "#22d3ee" : "#94a3b8" }}>
                  {done ? "Done" : active ? "Generating..." : "Pending"}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-slate-400">Optimizing real-time KPI analysis...</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboards, setDashboards] = useState<DashboardSpec[]>([]);
  const [currentKpi, setCurrentKpi] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [generationStep, setGenerationStep] = useState(0);

  const submitKpi = async (kpi: string, selectedCharts: string[], selectedThemes: string[]) => {
    setCurrentKpi(kpi);
    setLoading(true);
    setGenerationStep(0);
    setError("");
    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 16000);

    try {
      const data = await generateDashboards(kpi, selectedCharts, selectedThemes);

      setGenerationStep(3);
      setDashboards(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const chatbotContext = useMemo<DashboardSpec | null>(() => {
    if (!dashboards.length) {
      return null;
    }

    const mergedCharts = dashboards.flatMap((d) => d.charts || []);
    const mergedCards = dashboards.flatMap((d) => d.kpiCards || []).slice(0, 10);
    const base = dashboards[0];

    return {
      ...base,
      id: "combined-dashboard-context",
      title: "Combined Dashboard Context",
      charts: mergedCharts,
      kpiCards: mergedCards,
      insightText: dashboards.map((d) => d.insightText).filter(Boolean).join(" | "),
    };
  }, [dashboards]);

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-[1600px] overflow-hidden p-4 md:p-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.20),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.18),transparent_38%),radial-gradient(circle_at_30%_90%,rgba(14,165,233,0.17),transparent_40%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]" />

      <header className="mb-6 rounded-3xl border border-white/60 bg-white/65 p-6 shadow-[0_16px_45px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="space-y-3">
            <GradualSpacing
              text="Talking BI"
              className="text-5xl font-black tracking-tight text-slate-900 md:text-6xl"
              delayMultiple={0.02}
            />
            <p className="max-w-2xl text-slate-700">Build interactive dashboards, listen to insights, and ask personalized BI questions.</p>
          </div>
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="hidden lg:block">
            <DisplayCards />
          </motion.div>
        </div>
      </header>

      <KpiInput onSubmit={submitKpi} loading={loading} />

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      )}

      <section className="mt-6 space-y-4">
        {loading && <LoadingSkeleton />}

        {!loading && dashboards.length > 0 && <DashboardPreviewGallery dashboards={dashboards} kpi={currentKpi} />}
      </section>

      {!loading && dashboards.length > 0 && (
        <section className="mt-6">
          <BIChatbot kpi={currentKpi} dashboardContext={chatbotContext} />
        </section>
      )}

      {loading && <GenerationOverlay step={generationStep} />}
    </main>
  );
}
