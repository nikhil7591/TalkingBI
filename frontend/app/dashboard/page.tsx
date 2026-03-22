"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Home, History, LayoutDashboard, LogIn, MessageSquarePlus, RotateCcw, Sun, Moon, UserPlus, Crown } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import BIChatbot from "@/components/BIChatbot";
import DashboardPreviewGallery from "@/components/DashboardPreviewGallery";
import KpiInput from "@/components/KpiInput";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import DisplayCards from "@/components/ui/display-cards";
import UniqueLoading from "@/components/ui/morph-loading";
import { generateDashboards, listConversations, saveConversation } from "@/lib/api";
import { ChatConversationSummary, ChatMessage, DashboardSpec } from "@/lib/types";

const DASHBOARD_NAMES = [
  "Trend Analysis & Performance",
  "Comparative Analysis",
  "Deep Dive Analysis",
  "Performance Metrics",
];

const PREMIUM_DASHBOARD_NAMES = ["Executive Signal Room", "Forecast Mission Control"];

const PALETTES = [
  { bg: "#f8f9fb", fg: "#0f172a" },
  { bg: "linear-gradient(125deg,#ffe4e6 0%,#fce7f3 45%,#fff1f2 100%)", fg: "#1f2937" },
  { bg: "linear-gradient(125deg,#fee2e2 0%,#ffedd5 50%,#fff7ed 100%)", fg: "#1f2937" },
  { bg: "linear-gradient(125deg,#dcfce7 0%,#d1fae5 48%,#ecfdf5 100%)", fg: "#0f172a" },
  { bg: "linear-gradient(125deg,#dbeafe 0%,#e0e7ff 45%,#eff6ff 100%)", fg: "#0f172a" },
  { bg: "linear-gradient(125deg,#ede9fe 0%,#f5d0fe 45%,#faf5ff 100%)", fg: "#1f2937" },
  { bg: "linear-gradient(125deg,#ecfeff 0%,#cffafe 48%,#f0fdfa 100%)", fg: "#0f172a" },
  { bg: "linear-gradient(125deg,#e0f2fe 0%,#bae6fd 45%,#f0f9ff 100%)", fg: "#0f172a" },
  { bg: "linear-gradient(125deg,#fef3c7 0%,#fde68a 45%,#fffbeb 100%)", fg: "#1f2937" },
  { bg: "linear-gradient(125deg,#f0abfc 0%,#e9d5ff 45%,#fdf4ff 100%)", fg: "#1f2937" },
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
  const { data: session } = useSession();
  const [dashboards, setDashboards] = useState<DashboardSpec[]>([]);
  const [currentKpi, setCurrentKpi] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [generationStep, setGenerationStep] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [histories, setHistories] = useState<ChatConversationSummary[]>([]);
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const storedIdx = Number(localStorage.getItem("talkingbi_palette_idx") || "0");
    const safeIdx = Number.isFinite(storedIdx) ? Math.max(0, Math.min(PALETTES.length - 1, storedIdx)) : 0;
    setPaletteIdx(safeIdx);

    const storedMode = localStorage.getItem("talkingbi_mode");
    if (storedMode === "dark" || storedMode === "light") {
      setMode(storedMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("talkingbi_palette_idx", String(paletteIdx));
    localStorage.setItem("talkingbi_mode", mode);
    document.documentElement.setAttribute("data-mode", mode);

    if (mode === "dark") {
      document.documentElement.style.setProperty("--page-bg", "linear-gradient(180deg,#020617 0%,#0f172a 55%,#111827 100%)");
      document.documentElement.style.setProperty("--page-fg", "#f8fafc");
      return;
    }

    document.documentElement.style.setProperty("--page-bg", PALETTES[paletteIdx].bg);
    document.documentElement.style.setProperty("--page-fg", PALETTES[paletteIdx].fg);
  }, [paletteIdx, mode]);

  const navItems = useMemo(
    () => [
      { name: "Home", url: "/", icon: Home },
      { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { name: "New Chat", url: "/dashboard", icon: MessageSquarePlus },
      { name: "Chat History", url: "#history", icon: History },
      { name: "Plans", url: "/plans", icon: Crown },
    ],
    []
  );

  const refreshHistory = async () => {
    if (session?.user?.id) {
      try {
        const serverConversations = await listConversations();
        setHistories(serverConversations);
        return;
      } catch {
        setHistories([]);
        return;
      }
    }

    const raw = localStorage.getItem("talkingbi_chat_history_details");
    if (!raw) {
      setHistories([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Array<{
        id: string;
        title: string;
        preview: string;
        createdAt: string;
        dashboards?: string[];
      }>;
      setHistories(
        parsed.slice(0, 60).map((item) => ({
          id: item.id,
          title: item.title,
          preview: item.preview,
          createdAt: item.createdAt,
          dashboards: item.dashboards,
        }))
      );
    } catch {
      setHistories([]);
    }
  };

  useEffect(() => {
    void refreshHistory();
  }, [session?.user?.id]);

  const pushHistory = async (entry: {
    id: string;
    title: string;
    preview: string;
    createdAt: string;
    messages: ChatMessage[];
    dashboards?: string[];
  }) => {
    if (session?.user?.id) {
      try {
        await saveConversation({
          title: entry.title,
          kpi: currentKpi,
          messages: entry.messages,
          dashboardTitles: entry.dashboards,
        });
        await refreshHistory();
      } catch {
        // Keep dashboard flow smooth even if history save fails.
      }
      return;
    }

    const raw = localStorage.getItem("talkingbi_chat_history_details");
    let existing: Array<{
      id: string;
      title: string;
      preview: string;
      createdAt: string;
      messages: ChatMessage[];
      dashboards?: string[];
    }> = [];

    if (raw) {
      try {
        existing = JSON.parse(raw);
      } catch {
        existing = [];
      }
    }

    const localId = `local-${Date.now()}`;
    const next = [{ ...entry, id: localId }, ...existing].slice(0, 60);
    localStorage.setItem("talkingbi_chat_history_details", JSON.stringify(next));
    setHistories(
      next.map((item) => ({
        id: item.id,
        title: item.title,
        preview: item.preview,
        createdAt: item.createdAt,
        dashboards: item.dashboards,
      }))
    );
  };

  const submitKpi = async (kpi: string, selectedCharts: string[], selectedThemes: string[]) => {
    setCurrentKpi(kpi);
    setLoading(true);
    setGenerationStep(0);
    setError("");
    const minDelay = new Promise((resolve) => setTimeout(resolve, 5000));
    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    try {
      const [data] = await Promise.all([generateDashboards(kpi, selectedCharts, selectedThemes), minDelay]);

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
    <main className="relative mx-auto min-h-screen w-full max-w-[1600px] overflow-hidden px-4 pb-6 pt-20 md:px-8 md:pt-24">
      <NavBar
        items={navItems}
        className="top-9 md:top-10"
        mode={mode}
        onItemSelect={(item) => {
          if (item.name === "Chat History") {
            setHistoryOpen(true);
          }
          if (item.name === "New Chat") {
            setCurrentKpi("");
            setDashboards([]);
            setError("");
          }
        }}
      />

      <div className="fixed right-4 top-3 z-50 flex items-center gap-2 md:right-8 md:top-4">
        <button
          type="button"
          onClick={() => setMode((prev) => (prev === "light" ? "dark" : "light"))}
          className={`inline-flex h-11 w-16 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition hover:scale-[1.03] ${
            mode === "dark" ? "border-slate-600/70 bg-slate-900/60 text-white" : "border-white/50 bg-white/45 text-slate-900"
          }`}
          title="Toggle dark or light mode"
        >
          {mode === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-white" />}
        </button>

        <button
          type="button"
          onClick={() => setPaletteIdx((prev) => (prev + 1) % PALETTES.length)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition hover:scale-[1.03] ${
            mode === "dark" ? "border-slate-600/70 bg-slate-900/60" : "border-white/50 bg-white/45"
          }`}
          title="Next color palette"
        >
          <span className="h-7 w-7 rounded-full bg-[conic-gradient(from_0deg,#ef4444,#f59e0b,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444)]" />
        </button>

        <button
          type="button"
          onClick={() => {
            setPaletteIdx(0);
            setMode("light");
          }}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-xl transition hover:scale-[1.03] ${
            mode === "dark" ? "border-slate-600/70 bg-slate-900/60 text-white" : "border-white/50 bg-white/45 text-slate-900"
          }`}
          title="Reset to default"
        >
          <RotateCcw className="h-5 w-5" />
        </button>

        {!session?.user ? (
          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login" className={`rounded-full border px-3 py-2 text-sm font-semibold backdrop-blur-xl ${mode === "dark" ? "border-slate-600/70 bg-slate-900/60 text-white" : "border-white/50 bg-white/45 text-slate-900"}`}>Login</Link>
            <Link href="/signup" className={`rounded-full border px-3 py-2 text-sm font-semibold backdrop-blur-xl ${mode === "dark" ? "border-slate-600/70 bg-slate-900/60 text-white" : "border-white/50 bg-white/45 text-slate-900"}`}>Sign up</Link>
          </div>
        ) : (
          <div className="relative hidden md:block">
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className={`max-w-[220px] truncate rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-xl ${mode === "dark" ? "border-slate-600/70 bg-slate-900/60 text-white" : "border-white/50 bg-white/45 text-slate-900"}`}
            >
              {session.user?.name || session.user?.email || "Profile"}
            </button>

            {profileOpen && (
              <div className={`absolute right-0 mt-2 w-44 rounded-xl border p-2 shadow-xl ${mode === "dark" ? "border-slate-600/70 bg-slate-900/95" : "border-slate-200 bg-white"}`}>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${mode === "dark" ? "text-white hover:bg-slate-800" : "text-slate-900 hover:bg-slate-100"}`}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>

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
                <Link href={`/chat/${h.id}`} key={h.id} className="block rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50">
                  <p className="text-sm font-semibold text-slate-900">{h.title}</p>
                  <p className="line-clamp-1 text-xs text-slate-600">{h.preview}</p>
                  {h.dashboards?.length ? (
                    <p className="line-clamp-2 text-[11px] text-slate-500">Dashboards: {h.dashboards.join(", ")}</p>
                  ) : null}
                  <p className="text-xs text-slate-500">{new Date(h.createdAt).toLocaleString()}</p>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      )}

      <ContainerScroll
        titleComponent={
          <>
            <h1 className={`text-4xl font-semibold ${mode === "dark" ? "text-white" : "text-black"}`}>
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

      <section className="mt-4 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-[0_14px_50px_rgba(15,23,42,0.10)] backdrop-blur lg:p-6">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.9fr_1fr]">
          <KpiInput onSubmit={submitKpi} loading={loading} />
          <div className="hidden rounded-2xl border border-slate-200 bg-white/80 p-4 lg:block">
            <div className="mb-2 text-sm font-semibold text-slate-700">Quick Dashboard Highlights</div>
            <DisplayCards />
          </div>
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
            onHistoryEntry={(entry) =>
              void pushHistory({
                ...entry,
                dashboards: [...dashboards.map((d) => d.title), ...PREMIUM_DASHBOARD_NAMES],
              })
            }
          />
        </section>
      )}

      {loading && <GenerationOverlay step={generationStep} />}

      <div className="mt-8 text-center text-xs text-slate-500">
        Need premium charts and account setup? <Link href="/plans" className="font-semibold text-blue-700 underline">Try plans</Link>
        <div className="mt-2">
          Contact support: <a className="font-semibold text-blue-700 underline" href="mailto:madhavkalra2005@gmail.com">madhavkalra2005@gmail.com</a>, {" "}
          <a className="font-semibold text-blue-700 underline" href="mailto:nikhil759100@gmail.com">nikhil759100@gmail.com</a>
        </div>
      </div>

      <div className="fixed bottom-6 right-4 z-50 flex gap-2 md:hidden">
        {!session?.user ? (
          <>
            <Link href="/login" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/45 backdrop-blur-xl">
              <LogIn className="h-5 w-5 text-slate-900" />
            </Link>
            <Link href="/signup" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/45 backdrop-blur-xl">
              <UserPlus className="h-5 w-5 text-slate-900" />
            </Link>
          </>
        ) : null}
      </div>
    </main>
  );
}
