"use client";

import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";

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

function DashboardThumb({ dashboard, onClick }: { dashboard: DashboardSpec; onClick: () => void }) {
  const theme = dashboard.theme;

  return (
    <button
      type="button"
      onClick={onClick}
      className="overflow-hidden rounded-xl border text-left transition hover:scale-[1.01]"
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
          }}
        >
          <DashboardRenderer dashboard={dashboard} />
        </div>
      </div>
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboards.slice(0, 4).map((dashboard) => (
          <DashboardThumb key={dashboard.id} dashboard={dashboard} onClick={() => setSelected(dashboard)} />
        ))}
      </div>

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
