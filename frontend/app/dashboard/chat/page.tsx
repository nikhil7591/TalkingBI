"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

import BIChatbot from "@/components/BIChatbot";
import { getCreditsStatus } from "@/lib/api";
import { DashboardSpec } from "@/lib/types";

const DashboardRenderer = dynamic(() => import("@/components/DashboardRenderer"), {
  ssr: false,
  loading: () => <div className="h-[420px] rounded-2xl bg-slate-200/60" />,
});

type ChatFlowState = {
  dashboards: DashboardSpec[];
  selectedDashboardId?: string;
  currentKpi?: string;
  mode?: "light" | "dark";
};

const RELATED_QUERIES = [
  "Which region is best performing?",
  "Show top 5 contributors with numbers",
  "Why did we see a dip in the latest period?",
  "What anomaly should leadership care about?",
  "What action should business take next?",
];

export default function DashboardChatPage() {
  const { data: session } = useSession();
  const [flowState, setFlowState] = useState<ChatFlowState | null>(null);
  const [selectedIdFromQuery, setSelectedIdFromQuery] = useState<string | undefined>(undefined);
  const [creditInfo, setCreditInfo] = useState<{ remaining: number; limit: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dashboardId = params.get("dashboardId") || undefined;
    setSelectedIdFromQuery(dashboardId);

    const raw = sessionStorage.getItem("talkingbi_chat_flow");
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as ChatFlowState;
      if (Array.isArray(parsed.dashboards) && parsed.dashboards.length) {
        setFlowState(parsed);
      }
    } catch {
      setFlowState(null);
    }
  }, []);

  const selectedDashboard = useMemo(() => {
    if (!flowState?.dashboards?.length) {
      return null;
    }
    const selectedId = selectedIdFromQuery || flowState.selectedDashboardId;
    return flowState.dashboards.find((d) => d.id === selectedId) || flowState.dashboards[0];
  }, [flowState, selectedIdFromQuery]);

  const relatedQueries = useMemo(() => {
    if (!selectedDashboard) {
      return RELATED_QUERIES;
    }
    const chartTitles = selectedDashboard.charts.slice(0, 3).map((c) => c.title).filter(Boolean);
    const dynamic = [
      `What changed most in ${selectedDashboard.title}?`,
      `Give decision summary for ${selectedDashboard.title}.`,
      chartTitles[0] ? `Drill into ${chartTitles[0]} with exact numbers.` : "Drill into the strongest chart with exact numbers.",
      chartTitles[1] ? `Compare ${chartTitles[1]} with previous period.` : "Compare this dashboard with previous period.",
      chartTitles[2] ? `What action should I take based on ${chartTitles[2]}?` : "What action should I take based on this dashboard?",
    ];
    return dynamic;
  }, [selectedDashboard]);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!session?.user?.id) {
        setCreditInfo(null);
        return;
      }
      try {
        const credit = await getCreditsStatus({ userId: session.user.id, userEmail: session.user.email || undefined });
        setCreditInfo({ remaining: credit.tokensRemaining, limit: credit.dailyLimit });
      } catch {
        // Keep chat working even if credits status endpoint fails.
      }
    };
    void fetchCredits();
  }, [session?.user?.id, session?.user?.email]);

  if (!flowState?.dashboards?.length || !selectedDashboard) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-bold text-slate-900">No dashboard context found</h1>
          <p className="mt-2 text-sm text-slate-600">Generate dashboards first, then open dashboard-specific chat.</p>
          <Link href="/dashboard" className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white">
            Go Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-6">
      {creditInfo ? (
        <div className="mb-3 inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-800 shadow-sm">
          Credits: {creditInfo.remaining}/{creditInfo.limit}
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between">
        <Link href="/dashboard" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800">
          Back to Dashboard Selection
        </Link>
        <h1 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Dashboard Specific Chat</h1>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 26, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-5 rounded-3xl border border-cyan-200 bg-[linear-gradient(120deg,#ecfeff_0%,#f0f9ff_50%,#eef2ff_100%)] p-5 shadow-[0_20px_55px_rgba(6,182,212,0.14)]"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Selected Dashboard Context</div>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">{selectedDashboard.title}</h2>
        <p className="mt-2 line-clamp-2 text-sm text-slate-700">{selectedDashboard.insightText || "Chatbot will answer based on this dashboard charts and KPI cards."}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {flowState.dashboards.map((dash) => {
            const isActive = dash.id === selectedDashboard.id;
            return (
              <button
                key={dash.id}
                type="button"
                onClick={() => setSelectedIdFromQuery(dash.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${isActive ? "border-cyan-500 bg-cyan-100 text-cyan-800" : "border-slate-300 bg-white text-slate-700"}`}
              >
                {dash.title}
              </button>
            );
          })}
        </div>
      </motion.section>

      <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_34px_rgba(15,23,42,0.09)]">
        <button
          type="button"
          onClick={() => setShowPreview((prev) => !prev)}
          className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-3 text-left"
        >
          <span className="text-sm font-semibold text-slate-800">Selected Dashboard Preview</span>
          <span className="text-xs font-semibold text-slate-600">{showPreview ? "Hide" : "Show"}</span>
        </button>
        {showPreview ? (
          <div className="max-h-[520px] overflow-auto p-3">
            <DashboardRenderer dashboard={selectedDashboard} />
          </div>
        ) : null}
      </section>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Related Multi Queries</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {relatedQueries.map((q, idx) => (
            <motion.span
              key={q}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {q}
            </motion.span>
          ))}
        </div>
      </section>

      <BIChatbot
        kpi={flowState.currentKpi || "Business KPI"}
        dashboardContext={selectedDashboard}
        suggestions={relatedQueries}
        userId={session?.user?.id || undefined}
        userEmail={session?.user?.email || undefined}
        userName={session?.user?.name || session?.user?.email || "You"}
        onCreditsUpdate={(credits) => setCreditInfo(credits)}
      />
    </main>
  );
}
