"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { askBiChat, consumeCredits } from "@/lib/api";
import { ChatMessage, DashboardSpec } from "@/lib/types";

type Props = {
  kpi: string;
  dashboardContext: DashboardSpec | null;
  suggestions?: string[];
  userId?: string;
  userEmail?: string;
  userName?: string;
  onCreditsUpdate?: (credits: { remaining: number; limit: number }) => void;
  onHistoryEntry?: (entry: { id: string; title: string; preview: string; createdAt: string; messages: ChatMessage[] }) => void;
};

export default function BIChatbot({ kpi, dashboardContext, suggestions = [], userId, userEmail, userName, onCreditsUpdate, onHistoryEntry }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I am your BI chatbot. Ask me anything about this dashboard and KPI context, like why a trend changed or which segment is underperforming.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const displayUserName = userName?.trim() || "You";

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`Unable to read ${file.name}`));
      reader.readAsDataURL(file);
    });

  const normalizeAssistantText = (raw: string): string =>
    raw
      .replace(/\r\n/g, "\n")
      .replace(/\s+###\s+/g, "\n### ")
      .replace(/\s+(\d+)\.\s+/g, "\n$1. ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const renderImportantInline = (text: string): ReactNode[] => {
    const tokenRegex = /(\*\*[^*]+\*\*|[A-Za-z][A-Za-z0-9\s/&()-]{1,40}:)/g;
    const parts = text.split(tokenRegex).filter(Boolean);

    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`inline-md-${index}`}>{part.slice(2, -2)}</strong>;
      }
      if (/^[A-Za-z][A-Za-z0-9\s/&()-]{1,40}:$/.test(part)) {
        return <strong key={`inline-label-${index}`}>{part}</strong>;
      }
      return <span key={`inline-text-${index}`}>{part}</span>;
    });
  };

  const renderAssistantMessage = (raw: string) => {
    const text = normalizeAssistantText(raw);
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const nodes: ReactNode[] = [];
    const listBuffer: string[] = [];

    const flushList = () => {
      if (!listBuffer.length) {
        return;
      }
      nodes.push(
        <ol key={`list-${nodes.length}`} className="mt-1 list-decimal space-y-1 pl-5">
          {listBuffer.map((item, idx) => (
            <li key={`list-item-${idx}`} className="leading-relaxed text-slate-800">
              {renderImportantInline(item)}
            </li>
          ))}
        </ol>
      );
      listBuffer.length = 0;
    };

    lines.forEach((line) => {
      if (line.startsWith("###")) {
        flushList();
        nodes.push(
          <h4 key={`heading-${nodes.length}`} className="mt-2 text-sm font-bold text-slate-900">
            {line.replace(/^###\s*/, "")}
          </h4>
        );
        return;
      }

      const numbered = line.match(/^\d+\.\s+(.*)$/);
      if (numbered) {
        listBuffer.push(numbered[1]);
        return;
      }

      flushList();
      nodes.push(
        <p key={`para-${nodes.length}`} className="leading-relaxed text-slate-800">
          {renderImportantInline(line)}
        </p>
      );
    });

    flushList();

    return <div className="space-y-2 text-sm">{nodes}</div>;
  };

  const onSend = async (message: string, files: File[] = []) => {
    if (!message.trim() || !dashboardContext) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: message };
    const pendingMessages = [...messages, userMessage];
    setMessages(pendingMessages);
    setLoading(true);

    const compactDashboardContext = {
      id: dashboardContext.id,
      title: dashboardContext.title,
      insightText: dashboardContext.insightText,
      kpiCards: (dashboardContext.kpiCards || []).slice(0, 6),
      charts: (dashboardContext.charts || []).slice(0, 6).map((chart) => ({
        id: chart.id,
        type: chart.type,
        title: chart.title,
        subtitle: chart.subtitle,
        xAxis: chart.xAxis,
        yAxis: chart.yAxis,
        groupBy: chart.groupBy,
        data: (chart.data || []).slice(0, 8),
      })),
    };

    try {
      const attachments = files.length
        ? await Promise.all(files.filter((file) => file.type.startsWith("image/")).slice(0, 2).map((file) => fileToDataUrl(file)))
        : [];

      const response = await askBiChat({
        question: message,
        kpi,
        dashboardSpec: compactDashboardContext,
        userId,
        userName,
        attachments,
      });

      const cleanedAnswer = normalizeAssistantText(
        response.answer || "I could not derive an answer from the current dashboard context."
      );

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: cleanedAnswer,
      };

      const fullMessages: ChatMessage[] = [...pendingMessages, assistantMessage];
      setMessages(fullMessages);

      if (userId) {
        try {
          const credit = await consumeCredits({ userId, userEmail, eventType: "BI_CHAT_QUERY" });
          onCreditsUpdate?.({ remaining: credit.tokensRemaining, limit: credit.dailyLimit });
        } catch {
          // Keep chat response visible even if credit API is temporarily unavailable.
        }
      }

      const preview = message.trim().replace(/\s+/g, " ").slice(0, 90);
      onHistoryEntry?.({
        id: `${Date.now()}`,
        title: `${kpi} - chat`,
        preview,
        createdAt: new Date().toISOString(),
        messages: fullMessages,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Could not reach BI chatbot.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-[0_10px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
      <div className="mb-3">
        <h3 className="text-xl font-bold text-slate-900">Personalized BI Chatbot</h3>
        <p className="text-sm text-slate-600">
          Context-aware assistant for current KPI and generated dashboards.
        </p>
      </div>

      <div className="mb-3 max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {messages.map((msg, idx) => (
          <div key={`${msg.role}-${idx}`} className={`flex w-full ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[88%] rounded-2xl border px-3 py-2.5 text-sm ${
                msg.role === "assistant"
                  ? "border-slate-200 bg-white text-slate-800 shadow-sm"
                  : "border-slate-800 bg-slate-900 text-white"
              }`}
            >
              <div className={`mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${msg.role === "assistant" ? "text-slate-500" : "text-slate-200"}`}>
                {msg.role === "assistant" ? "Output" : displayUserName}
              </div>
              {msg.role === "assistant" ? (
                renderAssistantMessage(msg.content)
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <PromptInputBox
        isLoading={loading}
        placeholder="Ask: Why did sales drop in March?"
        onSend={(message, files) => void onSend(message, files)}
      />

      {suggestions.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">You can ask</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void onSend(q)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
