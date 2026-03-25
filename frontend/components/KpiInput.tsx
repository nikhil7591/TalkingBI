"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { AVAILABLE_THEMES, DEFAULT_THEME, THEME_KEYS } from "@/lib/themes";
import { AIVoiceInput } from "@/components/ui/ai-voice-input";

type Props = {
  onSubmit: (kpi: string, selectedCharts: string[], selectedThemes: string[]) => void;
  loading: boolean;
  mode?: "light" | "dark";
};

const CHART_OPTIONS = [
  "line",
  "bar",
  "horizontal-bar",
  "stacked-bar",
  "donut",
  "area",
  "gauge",
  "treemap",
  "heatmap",
  "scatter",
  "waterfall",
  "sparkline",
  "funnel",
  "radar",
  "sunburst",
  "pie",
  "bubble",
  "polar-bar",
  "sankey",
  "pictorial-bar",
  "rose",
  "combo",
  "radial-bar",
  "step-line",
  "nightingale",
];

const DEFAULT_SELECTED = ["line", "bar", "area", "donut", "scatter", "pie"];

const PAID_CHARTS = new Set([
  "sankey",
  "sunburst",
  "nightingale",
  "pictorial-bar",
  "polar-bar",
  "radial-bar",
  "rose",
  "waterfall",
  "heatmap",
  "treemap",
  "bubble",
  "combo",
  "step-line",
  "funnel",
  "gauge",
]);

const LOCKED_THEME_SLOTS = [
  { title: "Dashboard 5 (Premium)", subtitle: "Executive Signal Room" },
  { title: "Dashboard 6 (Premium)", subtitle: "Forecast Mission Control" },
];

function prettyName(type: string): string {
  return type
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function chartThumbnail(type: string): ReactNode {
  const common = "h-full w-full";
  switch (type) {
    case "line":
      return <svg viewBox="0 0 64 24" className={common}><polyline points="2,18 14,10 24,12 36,6 50,8 62,3" fill="none" stroke="#2563eb" strokeWidth="2" /></svg>;
    case "bar":
      return <svg viewBox="0 0 64 24" className={common}><rect x="5" y="11" width="8" height="11" fill="#2563eb" /><rect x="20" y="7" width="8" height="15" fill="#0ea5e9" /><rect x="35" y="4" width="8" height="18" fill="#22d3ee" /><rect x="50" y="9" width="8" height="13" fill="#38bdf8" /></svg>;
    case "horizontal-bar":
      return <svg viewBox="0 0 64 24" className={common}><rect x="4" y="3" width="28" height="4" fill="#2563eb" /><rect x="4" y="10" width="40" height="4" fill="#0ea5e9" /><rect x="4" y="17" width="22" height="4" fill="#22d3ee" /></svg>;
    case "stacked-bar":
      return <svg viewBox="0 0 64 24" className={common}><rect x="8" y="8" width="10" height="14" fill="#1d4ed8" /><rect x="8" y="4" width="10" height="4" fill="#22d3ee" /><rect x="26" y="10" width="10" height="12" fill="#1d4ed8" /><rect x="26" y="6" width="10" height="4" fill="#22d3ee" /><rect x="44" y="12" width="10" height="10" fill="#1d4ed8" /><rect x="44" y="9" width="10" height="3" fill="#22d3ee" /></svg>;
    case "donut":
      return <svg viewBox="0 0 64 24" className={common}><circle cx="22" cy="12" r="8" fill="none" stroke="#2563eb" strokeWidth="6" /><circle cx="42" cy="12" r="6" fill="none" stroke="#22d3ee" strokeWidth="4" /></svg>;
    case "area":
      return <svg viewBox="0 0 64 24" className={common}><polygon points="2,20 2,15 16,9 30,11 44,7 62,4 62,20" fill="#bfdbfe" /><polyline points="2,15 16,9 30,11 44,7 62,4" fill="none" stroke="#2563eb" strokeWidth="2" /></svg>;
    case "gauge":
      return <svg viewBox="0 0 64 24" className={common}><path d="M8 20 A24 24 0 0 1 56 20" fill="none" stroke="#cbd5e1" strokeWidth="5" /><path d="M8 20 A24 24 0 0 1 40 6" fill="none" stroke="#22c55e" strokeWidth="5" /></svg>;
    case "treemap":
      return <svg viewBox="0 0 64 24" className={common}><rect x="2" y="2" width="24" height="20" fill="#2563eb" /><rect x="28" y="2" width="16" height="10" fill="#0ea5e9" /><rect x="46" y="2" width="16" height="20" fill="#22d3ee" /><rect x="28" y="14" width="16" height="8" fill="#38bdf8" /></svg>;
    case "heatmap":
      return <svg viewBox="0 0 64 24" className={common}><rect x="2" y="2" width="10" height="9" fill="#dbeafe" /><rect x="14" y="2" width="10" height="9" fill="#93c5fd" /><rect x="26" y="2" width="10" height="9" fill="#3b82f6" /><rect x="38" y="2" width="10" height="9" fill="#1d4ed8" /><rect x="50" y="2" width="10" height="9" fill="#60a5fa" /><rect x="2" y="13" width="10" height="9" fill="#60a5fa" /><rect x="14" y="13" width="10" height="9" fill="#1d4ed8" /><rect x="26" y="13" width="10" height="9" fill="#93c5fd" /><rect x="38" y="13" width="10" height="9" fill="#3b82f6" /><rect x="50" y="13" width="10" height="9" fill="#dbeafe" /></svg>;
    case "scatter":
      return <svg viewBox="0 0 64 24" className={common}><circle cx="8" cy="16" r="2" fill="#2563eb" /><circle cx="18" cy="10" r="2" fill="#0ea5e9" /><circle cx="30" cy="14" r="2.5" fill="#22d3ee" /><circle cx="42" cy="7" r="3" fill="#2563eb" /><circle cx="55" cy="12" r="2" fill="#38bdf8" /></svg>;
    case "waterfall":
      return <svg viewBox="0 0 64 24" className={common}><rect x="4" y="10" width="8" height="10" fill="#22c55e" /><rect x="16" y="8" width="8" height="12" fill="#22c55e" /><rect x="28" y="12" width="8" height="8" fill="#ef4444" /><rect x="40" y="6" width="8" height="14" fill="#22c55e" /><rect x="52" y="14" width="8" height="6" fill="#ef4444" /></svg>;
    case "sparkline":
      return <svg viewBox="0 0 64 24" className={common}><polyline points="2,15 10,13 18,14 26,9 34,11 42,8 50,10 62,6" fill="none" stroke="#0ea5e9" strokeWidth="2" /></svg>;
    case "funnel":
      return <svg viewBox="0 0 64 24" className={common}><polygon points="6,3 58,3 50,8 14,8" fill="#2563eb" /><polygon points="14,9 50,9 44,14 20,14" fill="#0ea5e9" /><polygon points="20,15 44,15 38,20 26,20" fill="#22d3ee" /></svg>;
    case "radar":
      return <svg viewBox="0 0 64 24" className={common}><polygon points="32,3 44,8 40,19 24,19 20,8" fill="#bfdbfe" /><polygon points="32,5 40,9 37,16 27,16 24,9" fill="#60a5fa" /></svg>;
    case "sunburst":
      return <svg viewBox="0 0 64 24" className={common}><circle cx="32" cy="12" r="4" fill="#2563eb" /><path d="M32 12 L32 2 A10 10 0 0 1 42 12 Z" fill="#0ea5e9" /><path d="M32 12 L42 12 A10 10 0 0 1 32 22 Z" fill="#22d3ee" /><path d="M32 12 L32 22 A10 10 0 0 1 22 12 Z" fill="#38bdf8" /><path d="M32 12 L22 12 A10 10 0 0 1 32 2 Z" fill="#7dd3fc" /></svg>;
    case "pie":
      return <svg viewBox="0 0 64 24" className={common}><path d="M20 12 L20 4 A8 8 0 0 1 27 12 Z" fill="#2563eb" /><path d="M20 12 L27 12 A8 8 0 0 1 20 20 Z" fill="#0ea5e9" /><path d="M20 12 L20 20 A8 8 0 0 1 13 12 Z" fill="#22d3ee" /><path d="M20 12 L13 12 A8 8 0 0 1 20 4 Z" fill="#38bdf8" /></svg>;
    case "bubble":
      return <svg viewBox="0 0 64 24" className={common}><circle cx="12" cy="14" r="5" fill="#93c5fd" /><circle cx="28" cy="11" r="7" fill="#60a5fa" /><circle cx="46" cy="13" r="4" fill="#3b82f6" /><circle cx="56" cy="8" r="3" fill="#1d4ed8" /></svg>;
    case "polar-bar":
      return <svg viewBox="0 0 64 24" className={common}><circle cx="32" cy="12" r="3" fill="#cbd5e1" /><path d="M32 12 L32 3" stroke="#2563eb" strokeWidth="3" /><path d="M32 12 L44 12" stroke="#0ea5e9" strokeWidth="3" /><path d="M32 12 L32 20" stroke="#22d3ee" strokeWidth="3" /><path d="M32 12 L22 12" stroke="#38bdf8" strokeWidth="3" /></svg>;
    case "sankey":
      return <svg viewBox="0 0 64 24" className={common}><rect x="2" y="4" width="10" height="6" fill="#2563eb" /><rect x="2" y="14" width="10" height="6" fill="#0ea5e9" /><rect x="52" y="6" width="10" height="6" fill="#22d3ee" /><rect x="52" y="14" width="10" height="6" fill="#38bdf8" /><path d="M12 7 C28 7, 34 9, 52 9" stroke="#60a5fa" fill="none" strokeWidth="2" /><path d="M12 17 C28 17, 34 17, 52 17" stroke="#2563eb" fill="none" strokeWidth="2" /></svg>;
    case "pictorial-bar":
      return <svg viewBox="0 0 64 24" className={common}><rect x="6" y="18" width="6" height="2" fill="#2563eb" /><rect x="6" y="14" width="6" height="2" fill="#2563eb" /><rect x="6" y="10" width="6" height="2" fill="#2563eb" /><rect x="20" y="18" width="6" height="2" fill="#0ea5e9" /><rect x="20" y="14" width="6" height="2" fill="#0ea5e9" /><rect x="34" y="18" width="6" height="2" fill="#22d3ee" /><rect x="34" y="14" width="6" height="2" fill="#22d3ee" /><rect x="34" y="10" width="6" height="2" fill="#22d3ee" /><rect x="34" y="6" width="6" height="2" fill="#22d3ee" /></svg>;
    case "rose":
      return <svg viewBox="0 0 64 24" className={common}><path d="M32 12 L32 4 A8 8 0 0 1 39 12 Z" fill="#2563eb" /><path d="M32 12 L39 12 A10 10 0 0 1 32 22 Z" fill="#0ea5e9" /><path d="M32 12 L32 22 A6 6 0 0 1 27 12 Z" fill="#22d3ee" /><path d="M32 12 L27 12 A9 9 0 0 1 32 4 Z" fill="#38bdf8" /></svg>;
    case "combo":
      return <svg viewBox="0 0 64 24" className={common}><rect x="4" y="11" width="7" height="11" fill="#93c5fd" /><rect x="16" y="8" width="7" height="14" fill="#60a5fa" /><rect x="28" y="6" width="7" height="16" fill="#3b82f6" /><polyline points="2,16 14,12 26,10 38,7 50,9 62,5" fill="none" stroke="#0f172a" strokeWidth="1.8" /></svg>;
    case "radial-bar":
      return <svg viewBox="0 0 64 24" className={common}><path d="M10 20 A22 22 0 0 1 54 20" fill="none" stroke="#cbd5e1" strokeWidth="4" /><path d="M10 20 A22 22 0 0 1 42 8" fill="none" stroke="#22c55e" strokeWidth="4" /></svg>;
    case "step-line":
      return <svg viewBox="0 0 64 24" className={common}><polyline points="2,18 12,18 12,12 24,12 24,8 36,8 36,14 48,14 48,6 62,6" fill="none" stroke="#2563eb" strokeWidth="2" /></svg>;
    case "nightingale":
      return <svg viewBox="0 0 64 24" className={common}><path d="M32 12 L32 3 A9 9 0 0 1 39 12 Z" fill="#1d4ed8" /><path d="M32 12 L42 12 A10 10 0 0 1 32 22 Z" fill="#2563eb" /><path d="M32 12 L32 20 A8 8 0 0 1 25 12 Z" fill="#0ea5e9" /><path d="M32 12 L23 12 A9 9 0 0 1 32 3 Z" fill="#22d3ee" /></svg>;
    default:
      return <svg viewBox="0 0 64 24" className={common}><rect x="4" y="8" width="8" height="14" fill="#2563eb" /><rect x="18" y="5" width="8" height="17" fill="#0ea5e9" /><rect x="32" y="11" width="8" height="11" fill="#22d3ee" /></svg>;
  }
}

declare global {
  interface Window {
    webkitSpeechRecognition?: {
      new (): {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onstart: (() => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
        onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        start: () => void;
        stop: () => void;
      };
    };
    SpeechRecognition?: {
      new (): {
        lang: string;
        interimResults: boolean;
        continuous: boolean;
        onstart: (() => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
        onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        start: () => void;
        stop: () => void;
      };
    };
  }
}

export default function KpiInput({ onSubmit, loading, mode = "light" }: Props) {
  const isDark = mode === "dark";
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [dotCount, setDotCount] = useState(0);
  const [selectedCharts, setSelectedCharts] = useState<string[]>(DEFAULT_SELECTED);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([
    DEFAULT_THEME.name,
    DEFAULT_THEME.name,
    DEFAULT_THEME.name,
    DEFAULT_THEME.name,
  ]);
  const recognitionRef = useRef<{
    stop: () => void;
  } | null>(null);
  const [showPaidPopup, setShowPaidPopup] = useState(false);
  const [voiceUiResetKey, setVoiceUiResetKey] = useState(0);

  const dots = useMemo(() => ".".repeat(dotCount), [dotCount]);

  useEffect(() => {
    if (!loading) {
      setDotCount(0);
      return;
    }
    stopVoiceCapture();
    setVoiceUiResetKey((prev) => prev + 1);
    const timer = setInterval(() => {
      setDotCount((prev: number) => (prev + 1) % 4);
    }, 500);
    return () => clearInterval(timer);
  }, [loading]);

  const startVoiceCapture = () => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new Rec();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setValue(transcript.trim());
    };

    recognitionRef.current = {
      stop: () => recognition.stop(),
    };
    recognition.start();
  };

  const stopVoiceCapture = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim() || loading || selectedCharts.length === 0) {
      return;
    }
    stopVoiceCapture();
    setVoiceUiResetKey((prev) => prev + 1);
    onSubmit(value.trim(), selectedCharts, selectedThemes);
  };

  const toggleChart = (type: string) => {
    if (PAID_CHARTS.has(type)) {
      setShowPaidPopup(true);
      return;
    }
    setSelectedCharts((prev) => {
      if (prev.includes(type)) {
        return prev.filter((item) => item !== type);
      }
      return [...prev, type];
    });
  };

  const quickSelect = (mode: "all" | "clear") => {
    if (mode === "all") {
      setSelectedCharts(CHART_OPTIONS.filter((chart) => !PAID_CHARTS.has(chart)));
      return;
    }
    setSelectedCharts([]);
  };

  return (
    <form onSubmit={submit} className={`w-full rounded-3xl border p-4 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm md:p-6 ${isDark ? "border-slate-700 bg-slate-900/85" : "border-slate-200 bg-white/85"}`}>
      <div className="grid gap-4 md:grid-cols-[1.2fr_320px]">
        <div className="space-y-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask KPI like: Monthly Revenue by Region"
            rows={3}
            className={`w-full rounded-2xl border px-4 py-3 text-base outline-none transition md:min-h-[96px] ${isDark ? "border-slate-600 bg-slate-950 text-white placeholder:text-slate-400 focus:border-slate-400" : "border-slate-300/80 bg-white text-slate-900 focus:border-slate-500"}`}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generate Dashboards
            </button>
            <span className={`text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>Tip: speak naturally, then fine-tune text before submit.</span>
          </div>
        </div>

        <div className={`rounded-2xl border p-2 ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
          <AIVoiceInput
            key={voiceUiResetKey}
            onStart={startVoiceCapture}
            onStop={() => stopVoiceCapture()}
            visualizerBars={36}
            darkMode={isDark}
          />
          <p className={`pb-2 text-center text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            {listening ? "Recognizing voice in real-time..." : "Use mic to fill KPI prompt"}
          </p>
        </div>
      </div>
      {loading && (
        <p className={`mt-3 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          Analyzing data{dots} <span className="animate-pulse">Please wait</span>
        </p>
      )}

      <div className="mt-4 grid grid-cols-5 gap-4">
        {/* Chart Selector - 60% */}
        <div className={`col-span-3 rounded-xl border p-3 ${isDark ? "border-slate-700 bg-slate-900/65" : "border-slate-200"}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-black"}`}>
              Select chart types ({selectedCharts.length}/25 selected)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => quickSelect("all")}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${isDark ? "bg-slate-700 text-white" : "bg-slate-100 text-black"}`}
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => quickSelect("clear")}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${isDark ? "bg-slate-700 text-white" : "bg-slate-100 text-black"}`}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid max-h-80 grid-cols-2 gap-2 overflow-auto pr-1 md:grid-cols-4 lg:grid-cols-5">
            {CHART_OPTIONS.map((type) => {
              const active = selectedCharts.includes(type);
              const isPaid = PAID_CHARTS.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleChart(type)}
                  className="relative rounded-lg border p-2 text-left transition"
                  style={{
                    borderColor: active ? (isDark ? "#f8fafc" : "#0f172a") : isDark ? "#475569" : "#cbd5e1",
                    background: active ? (isDark ? "#0f172a" : "#f8fafc") : isDark ? "#111827" : "#ffffff",
                  }}
                >
                  {isPaid && (
                    <span className="absolute right-1 top-1 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      PAID
                    </span>
                  )}
                  <div className={`mb-2 h-10 rounded-md p-1 ${isDark ? "bg-gradient-to-br from-slate-700 to-slate-800" : "bg-gradient-to-br from-slate-100 to-slate-200"}`}>
                    <div className={`h-full w-full rounded px-1 py-0.5 ${isDark ? "bg-slate-900" : "bg-white"}`}>
                      {chartThumbnail(type)}
                    </div>
                  </div>
                  <div className={`text-xs font-semibold ${isDark ? "text-white" : "text-black"}`}>{prettyName(type)}</div>
                </button>
              );
            })}
          </div>

          {selectedCharts.length === 0 && (
            <p className="mt-2 text-xs text-rose-600">Please select at least one chart type.</p>
          )}
        </div>

        {/* Theme Selector - 40% */}
        <div className={`col-span-2 rounded-xl border p-3 ${isDark ? "border-slate-700 bg-slate-900/65" : "border-slate-200"}`}>
          <p className={`mb-3 text-sm font-semibold ${isDark ? "text-white" : "text-slate-700"}`}>Select theme for each dashboard</p>
          <div className="space-y-2 overflow-y-auto max-h-80">
            {[0, 1, 2, 3].map((dashIdx) => (
              <div key={dashIdx} className={`rounded-lg border p-2 ${isDark ? "border-slate-600" : "border-slate-300"}`}>
                <label className={`mb-1 block text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-600"}`}>
                  Dashboard {dashIdx + 1}
                </label>
                <select
                  value={selectedThemes[dashIdx]}
                  onChange={(e) => {
                    const newThemes = [...selectedThemes];
                    newThemes[dashIdx] = e.target.value;
                    setSelectedThemes(newThemes);
                  }}
                  className={`mb-2 w-full rounded border px-2 py-1 text-xs outline-none transition ${isDark ? "border-slate-600 bg-slate-800 text-white focus:border-slate-400" : "border-slate-300 bg-white text-slate-700 focus:border-slate-500"}`}
                >
                  {THEME_KEYS.map((themeKey) => (
                    <option key={themeKey} value={AVAILABLE_THEMES[themeKey].name}>
                      {AVAILABLE_THEMES[themeKey].name}
                    </option>
                  ))}
                </select>

                {/* Theme Color Preview */}
                <div className={`rounded border p-1 ${isDark ? "border-slate-600" : "border-slate-200"}`}>
                  <div className="mb-1 flex flex-wrap gap-1">
                    {AVAILABLE_THEMES[Object.keys(AVAILABLE_THEMES).find((k) => AVAILABLE_THEMES[k].name === selectedThemes[dashIdx]) || Object.keys(AVAILABLE_THEMES)[0]].chartColors.slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className={`h-3 w-3 rounded border ${isDark ? "border-slate-500" : "border-slate-300"}`}
                        style={{ background: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className={`text-[9px] ${isDark ? "text-slate-300" : "text-slate-500"}`}>Font: {AVAILABLE_THEMES[Object.keys(AVAILABLE_THEMES).find((k) => AVAILABLE_THEMES[k].name === selectedThemes[dashIdx]) || Object.keys(AVAILABLE_THEMES)[0]].textColor}</div>
                </div>
              </div>
            ))}

            {LOCKED_THEME_SLOTS.map((slot) => (
              <button
                key={slot.title}
                type="button"
                onClick={() => setShowPaidPopup(true)}
                className="w-full rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-left transition hover:bg-amber-100/70"
              >
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold text-amber-800">{slot.title}</p>
                  <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">LOCKED</span>
                </div>
                <p className="text-xs text-amber-700">{slot.subtitle}</p>
                <p className="mt-2 text-[11px] text-amber-700">Upgrade to choose custom premium themes for this dashboard.</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showPaidPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Access all charts</h3>
            <p className="mt-2 text-sm text-slate-600">
              This chart type is available in paid plans. Upgrade to unlock premium visuals.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPaidPopup(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
              <Link
                href="/plans"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setShowPaidPopup(false)}
              >
                Try Plans
              </Link>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
