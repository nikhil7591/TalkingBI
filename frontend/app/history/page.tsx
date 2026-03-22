"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { listConversations } from "@/lib/api";
import { ChatConversationSummary } from "@/lib/types";

export default function HistoryPage() {
  const { data: session } = useSession();
  const [items, setItems] = useState<ChatConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (session?.user?.id) {
        try {
          const rows = await listConversations();
          setItems(rows);
          setLoading(false);
          return;
        } catch {
          setItems([]);
          setLoading(false);
          return;
        }
      }

      const raw = localStorage.getItem("talkingbi_chat_history_details");
      if (!raw) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as Array<{ id: string; title: string; preview: string; dashboards?: string[]; createdAt: string }>;
        setItems(
          parsed.map((row) => ({
            id: row.id,
            title: row.title,
            preview: row.preview,
            dashboards: row.dashboards || [],
            createdAt: row.createdAt,
          }))
        );
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [session?.user?.id]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl p-4 md:p-8">
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-[0_16px_50px_rgba(15,23,42,0.10)] backdrop-blur-sm md:p-6">
        <h1 className="text-2xl font-bold text-slate-900">Chat History</h1>
        <p className="mt-1 text-sm text-slate-600">Tap any conversation to open full user/assistant thread.</p>

        <div className="mt-5 space-y-3">
          {loading && <p className="text-sm text-slate-500">Loading history...</p>}
          {!loading && items.length === 0 && <p className="text-sm text-slate-500">No saved chats yet.</p>}
          {!loading &&
            items.map((item) => (
              <Link
                key={item.id}
                href={`/chat/${item.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
              >
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                {item.dashboards?.length ? <p className="line-clamp-1 text-xs font-semibold text-blue-700">Dashboards: {item.dashboards.join(", ")}</p> : null}
                <p className="line-clamp-1 text-sm text-slate-600">{item.preview}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
              </Link>
            ))}
        </div>
      </section>
    </main>
  );
}
