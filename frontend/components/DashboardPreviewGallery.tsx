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
  isPaidUser?: boolean;
};

const THUMB_BASE_WIDTH = 1200;
const THUMB_BASE_HEIGHT = 760;

function DashboardThumb({ dashboard, onClick, locked }: { dashboard: DashboardSpec; onClick: () => void; locked?: boolean }) {
  const theme = dashboard.theme;
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [thumbScale, setThumbScale] = useState(0.22);

  useEffect(() => {
    const container = previewRef.current;
    if (!container) {
      return;
    }

    const updateScale = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (!width || !height) {
        return;
      }

      const fitByWidth = width / THUMB_BASE_WIDTH;
      const fitByHeight = height / THUMB_BASE_HEIGHT;
      setThumbScale(Math.min(fitByWidth, fitByHeight));
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

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

      <div
        ref={previewRef}
        className="relative aspect-[1200/760] w-full overflow-hidden"
        style={{ background: theme.background }}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{
            width: `${THUMB_BASE_WIDTH}px`,
            height: `${THUMB_BASE_HEIGHT}px`,
            transform: `scale(${thumbScale})`,
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

export default function DashboardPreviewGallery({ dashboards, kpi, isPaidUser = false }: Props) {
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

  const displayDashboards = dashboards;

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
              if (idx >= 4 && !isPaidUser) {
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
