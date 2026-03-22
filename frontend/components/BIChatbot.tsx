"use client";

import { useState } from "react";

import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { askBiChat } from "@/lib/api";
import { ChatMessage, DashboardSpec } from "@/lib/types";

type Props = {
  kpi: string;
  dashboardContext: DashboardSpec | null;
  onHistoryEntry?: (entry: { id: string; title: string; preview: string; createdAt: string; messages: ChatMessage[] }) => void;
};

export default function BIChatbot({ kpi, dashboardContext, onHistoryEntry }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I am your BI chatbot. Ask me anything about this dashboard and KPI context, like why a trend changed or which segment is underperforming.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sanitizeAssistantText = (raw: string): string =>
    raw
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^\s*[-*]\s+/gm, "")
      .trim();

  const onSend = async (message: string) => {
    if (!message.trim() || !dashboardContext) {
      return;
    }

    const userMessage: ChatMessage = { role: "user", content: message };
    const pendingMessages = [...messages, userMessage];
    setMessages(pendingMessages);
    setLoading(true);

    try {
      const response = await askBiChat({
        question: message,
        kpi,
        dashboardSpec: dashboardContext,
      });

      const cleanedAnswer = sanitizeAssistantText(
        response.answer || "I could not derive an answer from the current dashboard context."
      );

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: cleanedAnswer,
      };
      const fullMessages: ChatMessage[] = [...pendingMessages, assistantMessage];
      setMessages(fullMessages);

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

      <div className="mb-3 max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${
              msg.role === "assistant"
                ? "bg-white text-slate-800 shadow-sm"
                : "ml-auto bg-slate-900 text-white"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      <PromptInputBox
        isLoading={loading}
        placeholder="Ask: Why did sales drop in March?"
        onSend={(message) => void onSend(message)}
      />
    </section>
  );
}
