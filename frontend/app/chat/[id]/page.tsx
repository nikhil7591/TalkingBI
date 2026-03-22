"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getConversation } from "@/lib/api";
import { ChatConversationDetail } from "@/lib/types";

export default function ChatDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [conversation, setConversation] = useState<ChatConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      if (id.startsWith("local-")) {
        const raw = localStorage.getItem("talkingbi_chat_history_details");
        if (!raw) {
          setConversation(null);
          setLoading(false);
          return;
        }

        try {
          const parsed = JSON.parse(raw) as Array<{
            id: string;
            title: string;
            createdAt: string;
            dashboards?: string[];
            messages: Array<{ role: "user" | "assistant"; content: string }>;
          }>;
          const found = parsed.find((item) => item.id === id);
          setConversation(
            found
              ? {
                  id: found.id,
                  title: found.title,
                  createdAt: found.createdAt,
                  dashboards: found.dashboards,
                  messages: found.messages,
                }
              : null
          );
        } catch {
          setConversation(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const row = await getConversation(id);
        setConversation(row);
      } catch {
        setConversation(null);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl p-4 md:p-8">
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.10)] backdrop-blur-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{conversation?.title || "Conversation"}</h1>
            <p className="text-xs text-slate-500">{conversation?.createdAt ? new Date(conversation.createdAt).toLocaleString() : ""}</p>
            {conversation?.dashboards?.length ? (
              <p className="mt-1 text-xs text-slate-500">Dashboards: {conversation.dashboards.join(", ")}</p>
            ) : null}
          </div>
          <Link href="/history" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700">
            Back to History
          </Link>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {loading && <p className="text-sm text-slate-500">Loading conversation...</p>}
          {!loading && !conversation && <p className="text-sm text-slate-500">Conversation not found.</p>}
          {!loading &&
            conversation?.messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === "assistant" ? "bg-white text-slate-800 shadow-sm" : "ml-auto bg-slate-900 text-white"
                }`}
              >
                {msg.content}
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}
