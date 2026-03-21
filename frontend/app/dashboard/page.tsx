"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Menu } from "lucide-react";

import BIChatbot from "@/components/BIChatbot";
import DashboardPreviewGallery from "@/components/DashboardPreviewGallery";
import KpiInput from "@/components/KpiInput";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import DisplayCards from "@/components/ui/display-cards";
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [histories, setHistories] = useState<Array<{ id: string; title: string; createdAt: string }>>([]);

  useEffect(() => {
    const raw = localStorage.getItem("talkingbi_chat_histories");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Array<{ id: string; title: string; createdAt: string }>;
      setHistories(parsed.slice(0, 40));
    } catch {
      setHistories([]);
    }
  }, []);

  const pushHistory = (entry: { id: string; title: string; createdAt: string }) => {
    const next = [entry, ...histories].slice(0, 40);
    setHistories(next);
    localStorage.setItem("talkingbi_chat_histories", JSON.stringify(next));
  };

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

      <button
        type="button"
        onClick={() => setHistoryOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-slate-300 bg-white/90 p-2 shadow-md backdrop-blur"
      >
        <Menu className="h-5 w-5 text-slate-800" />
      </button>

      {historyOpen && (
        <div className="fixed inset-0 z-50 bg-black/35" onClick={() => setHistoryOpen(false)}>
          <aside
            className="h-full w-full max-w-sm border-r border-slate-200 bg-white p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Chat Histories</h3>
              <button className="text-sm text-slate-600" onClick={() => setHistoryOpen(false)}>
                Close
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto">
              {histories.length === 0 && <p className="text-sm text-slate-500">No chat history yet.</p>}
              {histories.map((h) => (
                <div key={h.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{h.title}</p>
                  <p className="text-xs text-slate-500">{new Date(h.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl font-semibold text-black">
              Unleash the power of <br />
              <span className="mt-1 text-4xl font-bold leading-none md:text-[5.2rem]">Talking BI</span>
            </h1>
          </>
        }
      >
        <video
          className="h-full w-full rounded-2xl object-cover"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
        >
          <source src="/tab-video.mp4" type="video/mp4" />
        </video>
      </ContainerScroll>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <KpiInput onSubmit={submitKpi} loading={loading} />
        </div>
        <div className="hidden items-start justify-center lg:flex">
          <DisplayCards />
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      )}

      <section className="mt-6 space-y-4">
        {loading && <LoadingSkeleton />}

        {!loading && dashboards.length > 0 && <DashboardPreviewGallery dashboards={dashboards} kpi={currentKpi} />}
      </section>

      {!loading && dashboards.length > 0 && (
        <section className="mt-6">
          <BIChatbot
            kpi={currentKpi}
            dashboardContext={chatbotContext}
            onHistoryEntry={(entry) => pushHistory({ id: entry.id, title: entry.title, createdAt: entry.createdAt })}
          />
        </section>
      )}

      {loading && <GenerationOverlay step={generationStep} />}

      <div className="mt-8 text-center text-xs text-slate-500">
        Need premium charts and account setup? <Link href="/plans" className="font-semibold text-blue-700 underline">Try plans</Link>
      </div>
    </main>
  );
}
