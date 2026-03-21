"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  audioUrl?: string | null;
  transcript: string;
  spokenVariants?: { english: string; hindi: string; hinglish: string };
  useWebSpeech?: boolean;
  disabled?: boolean;
  autoPlay?: boolean;
  onLanguageChange?: (lang: LangMode) => void;
};

type LangMode = "english" | "hindi" | "hinglish";

const LANGUAGE_OPTIONS: Array<{ value: LangMode; label: string; langTag: string }> = [
  { value: "english", label: "English - United States (USA)", langTag: "en-US" },
  { value: "hindi", label: "Hindi - India (IND)", langTag: "hi-IN" },
  { value: "hinglish", label: "Hinglish - India (IND)", langTag: "en-IN" },
];

export default function VoicePlayer({
  audioUrl,
  transcript,
  spokenVariants,
  useWebSpeech = false,
  disabled = false,
  autoPlay = false,
  onLanguageChange,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [spokenSegments, setSpokenSegments] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [languageMode, setLanguageMode] = useState<LangMode>("english");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const webSpeechStartedRef = useRef(false);
  const speechQueueRef = useRef<string[]>([]);
  const speechIndexRef = useRef(0);
  const pauseTimeoutRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  const splitSpeechSegments = useCallback((text: string) => {
    const normalized = text.replace(/\s+\n/g, "\n").trim();
    if (!normalized) {
      return [] as string[];
    }
    // Build smaller speech blocks so pauses feel human.
    // Step lines are split into sub-parts (What it shows, What changed, etc.).
    const lines = normalized
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const blocks = lines.flatMap((line) => {
      const isChartLine = /^(chart\s*\d+|चार्ट\s*\d+)/i.test(line);
      if (isChartLine) {
        const stepParts = line
          .split(
            /(?=\bWhat it shows:|\bWhat changed:|\bWhy it matters:|\bAction:|\bयह क्या दिखाता है:|\bक्या बदला है:|\bयह क्यों महत्वपूर्ण है:|\bकार्रवाई:|\bKya dikh raha hai:|\bKya change hua:|\bYeh kyun important hai:|\bAction lena hai:)/i
          )
          .map((part) => part.trim())
          .filter(Boolean);
        return stepParts.length ? stepParts : [line];
      }
      return line.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
    });
    return blocks.length ? blocks : [normalized];
  }, []);

  const getPauseMs = (spokenText: string) => {
    const trimmed = spokenText.trim();
    const isHeading = /:$/.test(trimmed);
    const isSentenceEnd = /[.!?]$/.test(trimmed);

    // User-requested natural gap: keep core breaks in 300-500ms range.
    if (isSentenceEnd) {
      return 300 + Math.floor(Math.random() * 201);
    }
    if (isHeading) {
      return 320 + Math.floor(Math.random() * 181);
    }
    return 280 + Math.floor(Math.random() * 181);
  };

  const getVoiceForMode = useCallback(
    (mode: LangMode) => {
      if (!voices.length) {
        return null;
      }

      const byLangPrefix = (prefix: string) => voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      const byContains = (parts: string[]) =>
        voices.find((v) => {
          const hay = `${v.name} ${v.lang}`.toLowerCase();
          return parts.every((p) => hay.includes(p));
        });

      if (mode === "hindi") {
        return byLangPrefix("hi") || byContains(["hindi"]) || byContains(["india"]) || voices[0];
      }
      if (mode === "hinglish") {
        return byContains(["india", "english"]) || byLangPrefix("en-in") || byContains(["india"]) || voices[0];
      }
      return byContains(["english"]) || byLangPrefix("en") || voices[0];
    },
    [voices]
  );

  const getSpeechText = useCallback(
    (mode: LangMode) => {
      if (!spokenVariants) {
        return transcript;
      }
      const candidate = spokenVariants[mode];
      return candidate && candidate.trim() ? candidate : transcript;
    },
    [spokenVariants, transcript]
  );

  const stopWebSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    if (pauseTimeoutRef.current) {
      window.clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    webSpeechStartedRef.current = false;
    pausedRef.current = false;
  }, []);

  const speakNext = useCallback(() => {
    if (pausedRef.current) {
      return;
    }

    const queue = speechQueueRef.current;
    const idx = speechIndexRef.current;
    if (idx >= queue.length) {
      setIsPlaying(false);
      webSpeechStartedRef.current = false;
      return;
    }

    const utterance = new SpeechSynthesisUtterance(queue[idx]);
    utterance.rate = speed;
    // Small pitch variation makes voice less robotic.
    utterance.pitch = 0.96 + Math.random() * 0.1;
    utterance.volume = 1.0;

    const selectedVoice = getVoiceForMode(languageMode);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    } else {
      const langTag = LANGUAGE_OPTIONS.find((l) => l.value === languageMode)?.langTag || "en-US";
      utterance.lang = langTag;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setSpokenSegments((prev) => prev + 1);
      speechIndexRef.current += 1;
      pauseTimeoutRef.current = window.setTimeout(() => {
        speakNext();
      }, getPauseMs(queue[idx] || ""));
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      webSpeechStartedRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  }, [getVoiceForMode, languageMode, speed]);

  const startPlayback = useCallback(() => {
    if (disabled) {
      return;
    }

    if (useWebSpeech) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
        return;
      }

      if (webSpeechStartedRef.current && pausedRef.current) {
        pausedRef.current = false;
        speakNext();
        return;
      }

      if (!webSpeechStartedRef.current) {
        const segments = splitSpeechSegments(getSpeechText(languageMode));
        setTotalSegments(segments.length);
        setSpokenSegments(0);
        if (!segments.length) {
          return;
        }

        speechQueueRef.current = segments;
        speechIndexRef.current = 0;
        webSpeechStartedRef.current = true;
        pausedRef.current = false;
        window.speechSynthesis.cancel();
        speakNext();
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [disabled, getSpeechText, languageMode, speakNext, speed, splitSpeechSegments, useWebSpeech]);

  const pausePlayback = useCallback(() => {
    if (useWebSpeech) {
      window.speechSynthesis.cancel();
      if (pauseTimeoutRef.current) {
        window.clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      pausedRef.current = true;
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [useWebSpeech]);

  const replayPlayback = useCallback(() => {
    if (disabled) {
      return;
    }

    if (useWebSpeech) {
      stopWebSpeech();
      const segments = splitSpeechSegments(getSpeechText(languageMode));
      speechQueueRef.current = segments;
      speechIndexRef.current = 0;
      setTotalSegments(segments.length);
      setSpokenSegments(0);
      if (!segments.length) {
        return;
      }
      webSpeechStartedRef.current = true;
      pausedRef.current = false;
      speakNext();
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = speed;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [disabled, getSpeechText, languageMode, speakNext, speed, splitSpeechSegments, stopWebSpeech, useWebSpeech]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
      return;
    }
    startPlayback();
  }, [isPlaying, pausePlayback, startPlayback]);

  useEffect(() => {
    if (!audioUrl || useWebSpeech) {
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.playbackRate = speed;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl, speed, useWebSpeech]);

  useEffect(() => {
    if (audioRef.current && !useWebSpeech) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed, useWebSpeech]);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    // Language change should affect only voice, not transcript.
    // If currently playing WebSpeech, restart from current progress with new voice mode/text.
    if (!useWebSpeech || !webSpeechStartedRef.current) {
      return;
    }
    const currentIdx = speechIndexRef.current;
    stopWebSpeech();
    webSpeechStartedRef.current = true;
    pausedRef.current = false;
    speechIndexRef.current = Math.max(0, currentIdx);
    speakNext();
  }, [languageMode, speakNext, stopWebSpeech, useWebSpeech]);

  useEffect(() => {
    setHasAutoStarted(false);
    setSpokenSegments(0);
    setTotalSegments(0);
    webSpeechStartedRef.current = false;
    pausedRef.current = false;
    speechQueueRef.current = [];
    speechIndexRef.current = 0;
  }, [audioUrl, useWebSpeech]);

  useEffect(() => {
    if (!autoPlay || hasAutoStarted || disabled) {
      return;
    }
    const timer = window.setTimeout(() => {
      startPlayback();
      setHasAutoStarted(true);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [autoPlay, disabled, hasAutoStarted, startPlayback]);

  useEffect(() => {
    return () => {
      stopWebSpeech();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [stopWebSpeech]);

  const formatTime = (seconds: number) => {
    if (!seconds || Number.isNaN(seconds)) {
      return "0:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const estimatedWebDuration = Math.max(0, transcript.trim().split(/\s+/).length / 2.7);
  const webProgressPercent = totalSegments > 0 ? (spokenSegments / totalSegments) * 100 : 0;
  const progressPercent = useWebSpeech ? webProgressPercent : duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayCurrent = useWebSpeech ? estimatedWebDuration * (progressPercent / 100) : currentTime;
  const displayDuration = useWebSpeech ? estimatedWebDuration : duration;

  return (
    <div className="min-w-[360px] rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={disabled}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={replayPlayback}
          disabled={disabled}
          className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 disabled:cursor-not-allowed"
        >
          Replay
        </button>

        <select
          value={String(speed)}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
          title="Speech speed"
        >
          <option value="0.8">0.8x</option>
          <option value="1">1.0x</option>
          <option value="1.2">1.2x</option>
          <option value="1.4">1.4x</option>
        </select>

        <select
          value={languageMode}
          onChange={(e) => {
            const nextLang = e.target.value as LangMode;
            setLanguageMode(nextLang);
            onLanguageChange?.(nextLang);
          }}
          className="min-w-[220px] rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
          title="Language"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700">
          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="w-16 flex-shrink-0 text-right text-xs text-slate-400">
          {`${formatTime(displayCurrent)}/${formatTime(displayDuration)}`}
        </span>
      </div>
    </div>
  );
}
