"use client";

import { useState } from "react";

import DashboardPreviewGallery from "@/components/DashboardPreviewGallery";
import KpiInput from "@/components/KpiInput";
import { generateDashboards } from "@/lib/api";
import { DashboardSpec } from "@/lib/types";

const DASHBOARD_NAMES = [
  "Trend Analysis & Performance",
  "Comparative Analysis",
  "Deep Dive Analysis",
  "Performance Metrics",
];

const MIN_LOADING_MS = 65000;

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
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-600 border-t-cyan-400" />
          <div>
            <h3 className="text-lg font-bold">Generating Dashboards...</h3>
            <p className="text-sm text-slate-300">Please wait while all 4 dashboards are being prepared.</p>
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

        <p className="mt-4 text-xs text-slate-400">Estimated time: 60-70 seconds</p>
      </div>
    </div>
  );
}

export default function HomePage() {
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
      const delayed = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS));
      const apiResultPromise = generateDashboards(kpi, selectedCharts, selectedThemes)
        .then((data) => ({ ok: true as const, data }))
        .catch((err: unknown) => ({ ok: false as const, err }));

      const [apiResult] = await Promise.all([apiResultPromise, delayed]);

      if (!apiResult.ok) {
        throw apiResult.err;
      }

      setGenerationStep(3);
      setDashboards(apiResult.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Talking BI</h1>
        <p className="mt-1 text-slate-600">Speak a KPI and generate 4 PowerBI-style dashboards instantly.</p>
      </header>

      <KpiInput onSubmit={submitKpi} loading={loading} />

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      )}

      <section className="mt-6 space-y-4">
        {loading && <LoadingSkeleton />}

        {!loading && dashboards.length > 0 && <DashboardPreviewGallery dashboards={dashboards} kpi={currentKpi} />}
      </section>

      {loading && <GenerationOverlay step={generationStep} />}
    </main>
  );
}
