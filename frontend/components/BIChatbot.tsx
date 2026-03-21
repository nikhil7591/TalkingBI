"use client";

import { useState } from "react";

import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { askBiChat } from "@/lib/api";
import { DashboardSpec } from "@/lib/types";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  kpi: string;
  dashboardContext: DashboardSpec | null;
  onHistoryEntry?: (entry: { id: string; title: string; createdAt: string; messages: Message[] }) => void;
};

export default function BIChatbot({ kpi, dashboardContext, onHistoryEntry }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I am your BI chatbot. Ask me anything about this dashboard and KPI context, like why a trend changed or which segment is underperforming.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const onSend = async (message: string) => {
    if (!message.trim() || !dashboardContext) {
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);

    try {
      const response = await askBiChat({
        question: message,
        kpi,
        dashboardSpec: dashboardContext,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer || "I could not derive an answer from the current dashboard context.",
        },
      ]);

      const fullMessages: Message[] = [
        ...messages,
        { role: "user", content: message },
        {
          role: "assistant",
          content: response.answer || "I could not derive an answer from the current dashboard context.",
        },
      ];
      onHistoryEntry?.({
        id: `${Date.now()}`,
        title: `${kpi} - ${message.slice(0, 40)}`,
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
