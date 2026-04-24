"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, History, LayoutDashboard, LogIn, MessageSquarePlus, RotateCcw, Sun, Moon, UserPlus, Crown } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import DatasetUrlInput from "@/components/DatasetUrlInput";
import KpiInput from "@/components/KpiInput";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { generateDashboards, listConversations } from "@/lib/api";
import { ChatConversationSummary, DashboardSpec } from "@/lib/types";

const DashboardPreviewGallery = dynamic(() => import("@/components/DashboardPreviewGallery"), {
  ssr: false,
  loading: () => <LoadingSkeleton />,
});

const CreditsResetTimer = dynamic(() => import("@/components/CreditsResetTimer"), {
  ssr: false,
  loading: () => <span>--:--</span>,
});

const ContainerScroll = dynamic(() => import("@/components/ui/container-scroll-animation").then((mod) => mod.ContainerScroll), {
  ssr: false,
  loading: () => <div className="h-[420px] rounded-2xl bg-slate-200/60" />,
});

const DisplayCards = dynamic(() => import("@/components/ui/display-cards"), {
  ssr: false,
  loading: () => <div className="h-40 rounded-2xl bg-slate-200/60" />,
});

const UniqueLoading = dynamic(() => import("@/components/ui/morph-loading"), {
  ssr: false,
  loading: () => <div className="h-10 w-10 rounded-full bg-slate-500/40" />,
});

const DASHBOARD_NAMES = [
  "Trend Analysis & Performance",
  "Comparative Analysis",
  "Deep Dive Analysis",
  "Performance Metrics",
];

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
  const router = useRouter();
  const isAdmin = (session?.user?.email || "").toLowerCase() === "admin@gmail.com";
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
  const [datasetSessionId, setDatasetSessionId] = useState<string | null>(null);
  const [useUrlDataset, setUseUrlDataset] = useState(false);
  const [creditInfo, setCreditInfo] = useState<{
    remaining: number;
    limit: number;
    plan?: string;
    activeSubscriptionName?: string;
  } | null>(null);
  const [localSubscriptionName, setLocalSubscriptionName] = useState("Starter");
  const [selectedDashboardForChat, setSelectedDashboardForChat] = useState<string | null>(null);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);
  const dashboardCacheKey = useMemo(
    () => `talkingbi_dashboard_state_${session?.user?.id || "guest"}`,
    [session?.user?.id]
  );

  const enrichedDashboardsForAdmin = useMemo(() => {
    if (dashboards.length === 0) {
      return dashboards;
    }

    const base = dashboards[0];
    const sourceA = dashboards[1] || base;
    const sourceB = dashboards[2] || dashboards[3] || base;

    const premiumThemeA = {
      ...sourceA.theme,
      background: "linear-gradient(145deg,#0b1220 0%,#12233d 45%,#1d4ed8 100%)",
      cardBackground: "rgba(7,18,44,0.88)",
      textColor: "#e0f2fe",
      subTextColor: "#bae6fd",
      borderColor: "rgba(34,211,238,0.34)",
      primaryColor: "#38bdf8",
      accentColor: "#22d3ee",
      chartColors: ["#38bdf8", "#22d3ee", "#34d399", "#f59e0b", "#f472b6"],
      headingColor: "#f0f9ff",
      subheadingColor: "#a5f3fc",
    };

    const premiumThemeB = {
      ...sourceB.theme,
      background: "linear-gradient(145deg,#2b0b1f 0%,#3b0d2f 42%,#7a1f4a 100%)",
      cardBackground: "rgba(54,10,38,0.88)",
      textColor: "#ffe4ef",
      subTextColor: "#fbcfe8",
      borderColor: "rgba(244,114,182,0.34)",
      primaryColor: "#f472b6",
      accentColor: "#fb7185",
      chartColors: ["#f472b6", "#fb7185", "#c084fc", "#f59e0b", "#22d3ee"],
      headingColor: "#fff1f2",
      subheadingColor: "#fbcfe8",
    };

    const premiumATypePack = ["line", "area", "bar", "combo"];
    const premiumBTypePack = ["horizontal-bar", "stacked-bar", "donut", "line"];

    const premiumA: DashboardSpec = {
      ...sourceA,
      id: "admin-premium-5",
      title: "Executive Signal Room",
      insightText: "Leadership-focused view with momentum, anomaly, and risk drilldowns.",
      theme: premiumThemeA,
      charts: sourceA.charts.map((chart, idx) => ({
        ...chart,
        id: `admin-premium-5-chart-${idx + 1}`,
        type: premiumATypePack[idx % premiumATypePack.length],
        colors: premiumThemeA.chartColors,
        title: idx % 2 === 0 ? `${chart.title} - Momentum Signal` : `${chart.title} - Risk Lens`,
        subtitle: `Premium View 5 | ${idx % 2 === 0 ? "Leadership Momentum" : "Anomaly Tracking"}`,
        data: idx % 2 === 0 ? chart.data : [...chart.data].reverse(),
      })),
    };

    const premiumB: DashboardSpec = {
      ...sourceB,
      id: "admin-premium-6",
      title: "Forecast Mission Control",
      insightText: "Scenario and forecast dashboard for next-best-action planning.",
      theme: premiumThemeB,
      charts: sourceB.charts.map((chart, idx) => ({
        ...chart,
        id: `admin-premium-6-chart-${idx + 1}`,
        type: premiumBTypePack[idx % premiumBTypePack.length],
        colors: premiumThemeB.chartColors,
        title: idx % 2 === 0 ? `${chart.title} - Forecast Pulse` : `${chart.title} - Scenario Planner`,
        subtitle: `Premium View 6 | ${idx % 2 === 0 ? "Forward Outlook" : "Decision Simulation"}`,
        data: idx % 2 === 0 ? [...chart.data].slice(0, 16) : [...chart.data],
      })),
    };

    return [...dashboards.slice(0, 4), premiumA, premiumB];
  }, [dashboards, isAdmin]);

  const selectedDashboard = useMemo(() => {
    if (!enrichedDashboardsForAdmin.length) {
      return null;
    }
    return (
      enrichedDashboardsForAdmin.find((d) => d.id === selectedDashboardForChat) || enrichedDashboardsForAdmin[0]
    );
  }, [enrichedDashboardsForAdmin, selectedDashboardForChat]);

  const planKey = (creditInfo?.plan || "").toLowerCase();
  const hasPremiumAccess = isAdmin || planKey === "pro" || planKey === "enterprise";
  const activeSubscriptionName =
    creditInfo?.activeSubscriptionName || (isAdmin ? "Admin Enterprise" : localSubscriptionName || "Starter");

  const dashboardScopedSuggestions = useMemo(() => {
    if (!selectedDashboard) {
      return [] as string[];
    }

    const topChartNames = (selectedDashboard.charts || [])
      .slice(0, 3)
      .map((c) => c.title)
      .filter(Boolean);

    return [
      `What is driving ${selectedDashboard.title} trends this week?`,
      `Which KPI in ${selectedDashboard.title} needs immediate action?`,
      topChartNames[0] ? `Explain the key pattern in ${topChartNames[0]}.` : "Explain the strongest pattern in this dashboard.",
      topChartNames[1] ? `Compare movement between ${topChartNames[1]} and overall KPI.` : "Compare top two metrics with exact values.",
    ];
  }, [selectedDashboard]);

  useEffect(() => {
    const localSubscriptionRaw = localStorage.getItem("talkingbi_active_subscription");
    if (localSubscriptionRaw) {
      try {
        const parsed = JSON.parse(localSubscriptionRaw) as { activeSubscriptionName?: string };
        if (parsed?.activeSubscriptionName) {
          setLocalSubscriptionName(parsed.activeSubscriptionName);
        }
      } catch {
        // Ignore invalid local subscription cache.
      }
    }

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

  useEffect(() => {
    const fetchCredits = async () => {
      if (!session?.user?.id) {
        setCreditInfo(null);
        return;
      }
      try {
        const response = await fetch("/api/credits/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: session.user.id, userEmail: session.user.email }),
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as {
          tokensRemaining?: number;
          dailyLimit?: number;
          plan?: string;
          activeSubscriptionName?: string;
        };
        setCreditInfo({
          remaining: Number(data.tokensRemaining || 0),
          limit: Number(data.dailyLimit || 30),
          plan: data.plan,
          activeSubscriptionName: data.activeSubscriptionName,
        });
        if (data.activeSubscriptionName) {
          setLocalSubscriptionName(data.activeSubscriptionName);
        }
      } catch {
        // Silent fail for non-blocking badge.
      }
    };
    void fetchCredits();
  }, [session?.user?.id]);

  useEffect(() => {
    const raw = localStorage.getItem(dashboardCacheKey);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { dashboards?: DashboardSpec[]; kpi?: string };
      if (parsed?.dashboards?.length) {
        setDashboards(parsed.dashboards);
        if (parsed.kpi) {
          setCurrentKpi(parsed.kpi);
        }
      }
    } catch {
      // Ignore invalid local cache.
    }
  }, [dashboardCacheKey]);

  useEffect(() => {
    if (!dashboards.length) {
      return;
    }
    localStorage.setItem(
      dashboardCacheKey,
      JSON.stringify({
        dashboards,
        kpi: currentKpi,
      })
    );
  }, [dashboards, currentKpi, dashboardCacheKey]);

  const submitKpi = async (kpi: string, selectedCharts: string[], selectedThemes: string[]) => {
    setCurrentKpi(kpi);
    setLoading(true);
    setGenerationStep(0);
    setError("");
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1200));
    const stepInterval = setInterval(() => {
      setGenerationStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 800);

    try {
      const [data] = await Promise.all([
        generateDashboards(kpi, selectedCharts, selectedThemes, {
          userId: session?.user?.id,
          userEmail: session?.user?.email || undefined,
          sessionId: datasetSessionId || undefined,
          useUrlDataset,
        }),
        minDelay,
      ]);

      setGenerationStep(3);
      setDashboards(data);
      if (data.length > 0) {
        setSelectedDashboardForChat(data[0].id);
      }

      if (session?.user?.id) {
        try {
          const res = await fetch("/api/credits/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: session.user.id, userEmail: session.user.email }),
          });
          if (res.ok) {
            const c = (await res.json()) as {
              tokensRemaining?: number;
              dailyLimit?: number;
              plan?: string;
              activeSubscriptionName?: string;
            };
            setCreditInfo({
              remaining: Number(c.tokensRemaining || 0),
              limit: Number(c.dailyLimit || 30),
              plan: c.plan,
              activeSubscriptionName: c.activeSubscriptionName,
            });
            if (c.activeSubscriptionName) {
              setLocalSubscriptionName(c.activeSubscriptionName);
            }
          }
        } catch {
          // Ignore credit badge refresh failures.
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const launchDashboardChat = () => {
    if (!enrichedDashboardsForAdmin.length) {
      return;
    }

    const selectedId = selectedDashboardForChat || enrichedDashboardsForAdmin[0]?.id;
    const selectedIdx = enrichedDashboardsForAdmin.findIndex((d) => d.id === selectedId);
    if (!hasPremiumAccess && selectedIdx >= 4) {
      setShowPremiumPopup(true);
      return;
    }

    const payload = {
      dashboards: enrichedDashboardsForAdmin,
      selectedDashboardId: selectedId,
      currentKpi,
      mode,
    };
    sessionStorage.setItem("talkingbi_chat_flow", JSON.stringify(payload));
    router.push(`/dashboard/chat?dashboardId=${encodeURIComponent(selectedId || "")}`);
  };

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
            localStorage.removeItem(dashboardCacheKey);
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
              <div className={`absolute right-0 mt-2 w-56 rounded-xl border p-2 shadow-xl ${mode === "dark" ? "border-slate-600/70 bg-slate-900/95" : "border-slate-200 bg-white"}`}>
                <div className={`mb-2 rounded-lg px-3 py-2 text-xs font-semibold ${mode === "dark" ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700"}`}>
                  Active Subscription: <span className="font-bold">{activeSubscriptionName}</span>
                </div>
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

      {creditInfo ? (
        <div className="-mt-2 mb-1 flex justify-start md:-mt-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm md:px-3">
            <span>Credits: {creditInfo.remaining}/{creditInfo.limit}</span>
            <span className="text-emerald-500">|</span>
            <CreditsResetTimer />
          </div>
        </div>
      ) : null}

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

      <section className="mt-4">
        <DatasetUrlInput
          mode={mode}
          userId={session?.user?.id || undefined}
          onDatasetStateChange={(state) => {
            setDatasetSessionId(state.sessionId);
            setUseUrlDataset(state.useUrlDataset && Boolean(state.sessionId));
          }}
        />
      </section>

      <section
        className={`mt-4 rounded-3xl border p-4 shadow-[0_14px_50px_rgba(15,23,42,0.10)] backdrop-blur lg:p-6 ${
          mode === "dark" ? "border-slate-700 bg-slate-900/75" : "border-slate-200 bg-white/70"
        }`}
      >
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.9fr_1fr]">
          <KpiInput onSubmit={submitKpi} loading={loading} mode={mode} isAdmin={hasPremiumAccess} />
          <div
            className={`hidden rounded-2xl border p-4 lg:block ${
              mode === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white/80"
            }`}
          >
            <div className={`mb-2 text-sm font-semibold ${mode === "dark" ? "text-slate-100" : "text-slate-700"}`}>Quick Dashboard Highlights</div>
            {isAdmin ? <div className="mb-2 text-xs font-semibold text-emerald-700">Admin mode: all paid charts and premium theme slots are unlocked.</div> : null}
            {!isAdmin && hasPremiumAccess ? <div className="mb-2 text-xs font-semibold text-emerald-700">{activeSubscriptionName} plan active: premium charts and dashboard slots unlocked.</div> : null}
            <DisplayCards />
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>
      )}

      <section className="mt-6 space-y-4">
        {loading && <LoadingSkeleton />}

        {!loading && dashboards.length > 0 && <DashboardPreviewGallery dashboards={enrichedDashboardsForAdmin} kpi={currentKpi} isAdmin={hasPremiumAccess} />}
      </section>

      {!loading && dashboards.length > 0 && (
        <section
          className={`mt-6 rounded-3xl border p-4 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm ${
            mode === "dark" ? "border-slate-700 bg-slate-900/80" : "border-slate-200 bg-white/80"
          }`}
        >
          <h3 className={`text-lg font-bold ${mode === "dark" ? "text-slate-100" : "text-slate-900"}`}>Choose Dashboard For Chat</h3>
          <p className={`mt-1 text-sm ${mode === "dark" ? "text-slate-300" : "text-slate-600"}`}>Select a dashboard and continue to the dedicated chat page with animated handoff.</p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {enrichedDashboardsForAdmin.map((dash, idx) => {
              const active = selectedDashboardForChat === dash.id;
              const locked = !hasPremiumAccess && idx >= 4;
              return (
                <button
                  key={dash.id}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      setShowPremiumPopup(true);
                      return;
                    }
                    setSelectedDashboardForChat(dash.id);
                  }}
                  className={`rounded-2xl border p-3 text-left transition-all duration-500 ${active ? "border-cyan-500 bg-cyan-50 shadow-[0_0_0_1px_rgba(6,182,212,0.45),0_18px_40px_rgba(6,182,212,0.18)] -translate-y-1" : mode === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}
                  style={{ animationDelay: `${idx * 90}ms` }}
                >
                  <div className={`text-xs font-semibold uppercase tracking-wide ${mode === "dark" ? "text-slate-300" : "text-slate-500"}`}>
                    Dashboard {idx + 1}{locked ? " - Premium" : ""}
                  </div>
                  <div className={`mt-1 text-sm font-bold ${mode === "dark" ? "text-slate-100" : "text-slate-900"}`}>{dash.title}</div>
                  <div className={`mt-1 text-xs ${mode === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    {locked ? "Locked: click to view plans" : "Tap to activate chat context"}
                  </div>
                </button>
              );
            })}
          </div>

          <div className={`mt-4 rounded-2xl border p-3 ${mode === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
            <div className={`text-xs font-semibold uppercase tracking-wide ${mode === "dark" ? "text-slate-300" : "text-slate-500"}`}>Related Multi Query Suggestions</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {dashboardScopedSuggestions
                .map((q) => (
                  <span key={q} className={`rounded-full border px-3 py-1 text-xs font-medium ${mode === "dark" ? "border-slate-600 bg-slate-900 text-slate-200" : "border-slate-300 bg-white text-slate-700"}`}>
                    {q}
                  </span>
                ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className={`text-sm ${mode === "dark" ? "text-slate-300" : "text-slate-600"}`}>Selected: <span className={`font-semibold ${mode === "dark" ? "text-slate-100" : "text-slate-900"}`}>{selectedDashboard?.title || "Dashboard"}</span></p>
            <button
              type="button"
              onClick={launchDashboardChat}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:scale-[1.02]"
            >
              Continue to Dashboard Chat
            </button>
          </div>
        </section>
      )}

      {loading && <GenerationOverlay step={generationStep} />}

      {showPremiumPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Premium Dashboard Locked</h3>
            <p className="mt-2 text-sm text-slate-600">
              Premium dashboard visible hai. Unlock karne ke liye Professional ya Enterprise plan activate karein.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPremiumPopup(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
              <Link
                href="/plans"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setShowPremiumPopup(false)}
              >
                View Plans
              </Link>
            </div>
          </div>
        </div>
      )}

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
