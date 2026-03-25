"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

import BIChatbot from "@/components/BIChatbot";
import DashboardRenderer from "@/components/DashboardRenderer";
import { DashboardSpec } from "@/lib/types";

type ChatFlowState = {
  dashboards: DashboardSpec[];
  selectedDashboardId?: string;
  selectedDashboard?: DashboardSpec;
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
      </motion.section>

      <section className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Selected Dashboard Frame
        </div>
        <div className="max-h-[70vh] overflow-auto p-3">
          <DashboardRenderer dashboard={selectedDashboard} />
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Related Multi Queries</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {RELATED_QUERIES.map((q, idx) => (
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
        suggestions={RELATED_QUERIES}
        userId={session?.user?.id || undefined}
      />
    </main>
  );
}
