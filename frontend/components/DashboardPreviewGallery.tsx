"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Lock } from "lucide-react";

import DashboardRenderer from "@/components/DashboardRenderer";
import { DashboardSpec } from "@/lib/types";
import VoicePlayer from "@/components/VoicePlayer";
import TextTranscript from "@/components/TextTranscript";
import { generateVoiceExplanation } from "@/lib/api";

type LangMode = "english" | "hindi" | "hinglish";

type Props = {
  dashboards: DashboardSpec[];
  kpi: string;
};

function DashboardThumb({ dashboard, onClick, locked }: { dashboard: DashboardSpec; onClick: () => void; locked?: boolean }) {
  const theme = dashboard.theme;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative overflow-hidden rounded-xl border text-left transition hover:scale-[1.01]"
      style={{ borderColor: theme.borderColor, background: theme.cardBackground }}
    >
      <div className="p-2" style={{ background: theme.background }}>
        <div className="text-xs font-bold" style={{ color: theme.textColor }}>
          {dashboard.title}
        </div>
        <div className="text-[10px]" style={{ color: theme.subTextColor }}>
          Click for full preview
        </div>
      </div>

      <div className="h-56 overflow-hidden bg-slate-100 p-2">
        <div
          className="pointer-events-none origin-top-left"
          style={{
            width: "1200px",
            transform: "scale(0.22)",
            transformOrigin: "top left",
            filter: locked ? "blur(4px) saturate(1.15)" : "none",
          }}
        >
          <DashboardRenderer dashboard={dashboard} />
        </div>
      </div>

      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45">
          <div className="rounded-xl border border-white/35 bg-white/20 px-4 py-2 text-center backdrop-blur-sm">
            <Lock className="mx-auto h-5 w-5 text-white" />
            <p className="mt-1 text-xs font-semibold text-white">Premium Dashboard</p>
          </div>
        </div>
      )}
    </button>
  );
}

export default function DashboardPreviewGallery({ dashboards, kpi }: Props) {
  const [selected, setSelected] = useState<DashboardSpec | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<"dashboard" | "text">("dashboard");
  const [voiceData, setVoiceData] = useState<{
    transcript: string;
    spokenVariants: { english: string; hindi: string; hinglish: string };
    audio: string | null;
    useWebSpeech: boolean;
  } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LangMode>("english");
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);

  const base = dashboards[0];
  const premiumDashboards: DashboardSpec[] = !base
    ? []
    : [
        {
          ...base,
          id: "premium-1",
          title: "Executive Fusion Premium",
          insightText: "Premium blend of scenario and flow analysis with strategic lock-in visuals.",
          theme: {
            ...base.theme,
            background: "linear-gradient(135deg,#2e1065 0%,#4c1d95 42%,#831843 100%)",
            cardBackground: "rgba(52,21,84,0.56)",
            textColor: "#fdf4ff",
            subTextColor: "#e9d5ff",
            borderColor: "rgba(244,114,182,0.42)",
            chartColors: ["#f472b6", "#c084fc", "#fb7185", "#a78bfa", "#f9a8d4"],
            headingColor: "#fdf4ff",
            subheadingColor: "#fbcfe8",
          },
          charts: [
            {
              id: "premium1-combo",
              type: "combo",
              title: "Revenue vs Profit Momentum",
              position: { x: 0, y: 0, w: 6, h: 2 },
              xAxis: { field: "month" },
              yAxis: { field: "revenue" },
              data: [
                { month: "Jan", revenue: 120, profit: 28 },
                { month: "Feb", revenue: 140, profit: 32 },
                { month: "Mar", revenue: 165, profit: 39 },
                { month: "Apr", revenue: 182, profit: 44 },
                { month: "May", revenue: 210, profit: 52 },
              ],
            },
            {
              id: "premium1-sankey",
              type: "sankey",
              title: "Channel-to-Segment Flow",
              position: { x: 6, y: 0, w: 6, h: 2 },
              data: [
                { source: "Ads", target: "SMB", value: 40 },
                { source: "Ads", target: "Enterprise", value: 22 },
                { source: "Organic", target: "SMB", value: 30 },
                { source: "Referral", target: "Enterprise", value: 18 },
              ],
            },
            {
              id: "premium1-sunburst",
              type: "sunburst",
              title: "Hierarchy Profit Share",
              position: { x: 0, y: 2, w: 4, h: 2 },
              data: [
                { name: "All", value: 100 },
                { name: "North", parent: "All", value: 42 },
                { name: "South", parent: "All", value: 58 },
              ],
            },
            {
              id: "premium1-radar",
              type: "radar",
              title: "Capability Index",
              position: { x: 4, y: 2, w: 4, h: 2 },
              data: [
                { metric: "Speed", value: 84 },
                { metric: "Quality", value: 88 },
                { metric: "Scale", value: 91 },
                { metric: "Retention", value: 80 },
                { metric: "NPS", value: 86 },
              ],
            },
            {
              id: "premium1-waterfall",
              type: "waterfall",
              title: "Margin Bridge",
              position: { x: 8, y: 2, w: 4, h: 2 },
              data: [
                { step: "Base", value: 100 },
                { step: "Price", value: 20 },
                { step: "Discount", value: -14 },
                { step: "Ops", value: 16 },
                { step: "Net", value: 122 },
              ],
            },
          ],
        },
        {
          ...base,
          id: "premium-2",
          title: "AI Growth Matrix Premium",
          insightText: "Advanced predictive and distribution charts designed for decision-makers.",
          theme: {
            ...base.theme,
            background: "linear-gradient(135deg,#082f49 0%,#0f172a 40%,#164e63 100%)",
            cardBackground: "rgba(10,43,62,0.58)",
            textColor: "#ecfeff",
            subTextColor: "#bae6fd",
            borderColor: "rgba(34,211,238,0.45)",
            chartColors: ["#22d3ee", "#38bdf8", "#0ea5e9", "#14b8a6", "#67e8f9"],
            headingColor: "#ecfeff",
            subheadingColor: "#a5f3fc",
          },
          charts: [
            {
              id: "premium2-bubble",
              type: "bubble",
              title: "Opportunity Clusters",
              position: { x: 0, y: 0, w: 6, h: 2 },
              xAxis: { field: "impact" },
              yAxis: { field: "effort" },
              data: [
                { segment: "A", impact: 82, effort: 22, size: 42 },
                { segment: "B", impact: 70, effort: 40, size: 32 },
                { segment: "C", impact: 58, effort: 30, size: 26 },
              ],
            },
            {
              id: "premium2-treemap",
              type: "treemap",
              title: "Portfolio Value Blocks",
              position: { x: 6, y: 0, w: 6, h: 2 },
              data: [
                { name: "Core", value: 44 },
                { name: "Expansion", value: 30 },
                { name: "Emerging", value: 26 },
              ],
            },
            {
              id: "premium2-radial",
              type: "radial-bar",
              title: "Utilization Gauge",
              position: { x: 0, y: 2, w: 4, h: 2 },
              data: [
                { label: "Utilization", value: 86 },
              ],
            },
            {
              id: "premium2-step",
              type: "step-line",
              title: "Milestone Progress",
              position: { x: 4, y: 2, w: 4, h: 2 },
              xAxis: { field: "stage" },
              yAxis: { field: "completion" },
              data: [
                { stage: "S1", completion: 20 },
                { stage: "S2", completion: 38 },
                { stage: "S3", completion: 57 },
                { stage: "S4", completion: 79 },
                { stage: "S5", completion: 92 },
              ],
            },
            {
              id: "premium2-heatmap",
              type: "heatmap",
              title: "Weekly Density Matrix",
              position: { x: 8, y: 2, w: 4, h: 2 },
              data: [
                { day: "Mon", slot: "AM", value: 68 },
                { day: "Tue", slot: "AM", value: 74 },
                { day: "Wed", slot: "PM", value: 86 },
                { day: "Thu", slot: "PM", value: 80 },
                { day: "Fri", slot: "AM", value: 62 },
              ],
            },
          ],
        },
      ];

  const displayDashboards = [...dashboards.slice(0, 4), ...premiumDashboards];

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    if (selected && !voiceData) {
      const loadVoice = async () => {
        setIsLoadingVoice(true);
        try {
          const result = await generateVoiceExplanation(selected, kpi || selected.title);
          setVoiceData(result);
        } finally {
          setIsLoadingVoice(false);
        }
      };
      loadVoice();
    }
  }, [selected, voiceData]);

  useEffect(() => {
    if (!selected) {
      setViewMode("dashboard");
      setSelectedLanguage("english");
      setVoiceData(null);
      window.speechSynthesis.cancel();
    }
  }, [selected]);

  const selectedTranscript =
    voiceData?.spokenVariants?.[selectedLanguage] || voiceData?.transcript || "";

  const handleDownload = async () => {
    if (!previewRef.current || !selected) {
      return;
    }

    const canvas = await html2canvas(previewRef.current, {
      backgroundColor: null,
      useCORS: true,
      scale: 2,
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${selected.id || "dashboard"}.png`;
    link.click();
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayDashboards.map((dashboard, idx) => (
          <DashboardThumb
            key={dashboard.id}
            dashboard={dashboard}
            locked={idx >= 4}
            onClick={() => {
              if (idx >= 4) {
                setShowPremiumPopup(true);
                return;
              }
              setSelected(dashboard);
            }}
          />
        ))}
      </div>

      {showPremiumPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Access all dashboards</h3>
            <p className="mt-2 text-sm text-slate-600">
              Premium dashboards are available in paid plans. Upgrade to unlock all 6 dashboard experiences.
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
                Try Plans
              </Link>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-[1200px] overflow-auto rounded-2xl bg-slate-900 p-3">
            <div className="mb-3 rounded-xl border border-slate-700/80 bg-slate-900/70 p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                {voiceData && (
                  <>
                    <VoicePlayer
                      audioUrl={voiceData.audio}
                      transcript={voiceData.transcript}
                      spokenVariants={voiceData.spokenVariants}
                      useWebSpeech={true}
                      disabled={isLoadingVoice}
                      autoPlay={true}
                      onLanguageChange={setSelectedLanguage}
                    />
                  </>
                )}
                {!voiceData && isLoadingVoice && (
                  <div className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300">Preparing voice explanation...</div>
                )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === "dashboard" ? "text" : "dashboard")}
                    className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600"
                  >
                    {viewMode === "dashboard" ? "📄 View Text" : "🎨 View Dashboard"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

            {viewMode === "dashboard" ? (
              <div ref={previewRef}>
                <DashboardRenderer dashboard={selected} />
              </div>
            ) : (
              voiceData && <TextTranscript transcript={selectedTranscript} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
