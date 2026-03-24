"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Database, Loader2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

import { cleanupDataset, ingestDataset } from "@/lib/api";

type DatasetState = {
  sessionId: string | null;
  useUrlDataset: boolean;
  columns: Array<{ name: string; dtype: string }>;
  rowCount: number;
};

type Props = {
  userId?: string;
  onDatasetStateChange: (state: DatasetState) => void;
};

export default function DatasetUrlInput({ userId, onDatasetStateChange }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Array<{ name: string; dtype: string }>>([]);
  const [rowCount, setRowCount] = useState(0);
  const cleanupRef = useRef<string | null>(null);

  const statusText = useMemo(() => {
    if (!sessionId || !columns.length) {
      return "";
    }
    return `${columns.length} columns, ${rowCount} rows loaded`;
  }, [columns.length, rowCount, sessionId]);

  const clearDatasetState = async (idToCleanup?: string) => {
    const target = idToCleanup || sessionId;
    if (target) {
      try {
        await cleanupDataset(target);
      } catch {
        // Cleanup errors should not block the user flow.
      }
    }
    setSessionId(null);
    setColumns([]);
    setRowCount(0);
    onDatasetStateChange({ sessionId: null, useUrlDataset: false, columns: [], rowCount: 0 });
  };

  const handleLoad = async () => {
    if (!url.trim()) {
      setError("Please provide a CSV or JSON URL.");
      return;
    }
    if (!userId) {
      setError("Please log in before loading a dataset URL.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextSessionId = crypto.randomUUID();
      const result = await ingestDataset({
        url: url.trim(),
        userId,
        sessionId: nextSessionId,
      });

      setSessionId(result.session_id);
      cleanupRef.current = result.session_id;
      setColumns(result.columns || []);
      setRowCount(result.row_count || 0);
      onDatasetStateChange({
        sessionId: result.session_id,
        useUrlDataset: true,
        columns: result.columns || [],
        rowCount: result.row_count || 0,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to ingest dataset URL.";
      setError(message);
      await clearDatasetState();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      const pending = cleanupRef.current;
      if (pending) {
        void cleanupDataset(pending);
      }
    };
  }, []);

  useEffect(() => {
    if (url.trim()) {
      return;
    }
    if (!sessionId) {
      return;
    }
    void clearDatasetState(sessionId);
  }, [url, sessionId]);

  return (
    <div className="w-full">
      <div className="px-2 pb-3">
        <h3 className="text-lg font-bold text-slate-900">Connect Your Dataset</h3>
      </div>

      <div className="relative pb-6 pt-3">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
          <motion.div
            initial={{ opacity: 0.82 }}
            animate={{ opacity: [0.8, 1, 0.82] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="h-1.5 w-[min(620px,65vw)] rounded-full bg-violet-400 shadow-[0_0_28px_rgba(167,139,250,0.92)]"
          />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1 z-10 h-[280px] w-[min(1120px,95vw)] -translate-x-1/2 overflow-hidden">
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: [0.78, 0.96, 0.8] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-1/2 top-0 h-[270px] w-[min(980px,92vw)] -translate-x-1/2 bg-[radial-gradient(54%_85%_at_50%_0%,rgba(139,92,246,0.42)_0%,rgba(139,92,246,0.22)_36%,rgba(139,92,246,0.10)_56%,rgba(139,92,246,0)_82%)]"
          />
          <div className="absolute left-1/2 top-3 h-[240px] w-[min(820px,78vw)] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_top,rgba(216,180,254,0.35)_0%,rgba(216,180,254,0.14)_40%,rgba(216,180,254,0)_78%)] blur-xl" />
        </div>

        <div className="relative z-20 mx-auto mt-14 w-[min(960px,94%)] px-2">
          <div className="mb-3 flex items-center justify-center gap-2 text-violet-700">
            <Database className="h-4 w-4" />
            <p className="text-sm font-semibold">Enter Your Database URL</p>
          </div>

          <div className="mx-auto max-w-4xl rounded-2xl bg-white/96 p-3 shadow-[0_24px_65px_rgba(139,92,246,0.2)] backdrop-blur-sm">
            <div className="flex flex-col gap-2 md:flex-row">
              <input
                value={url}
                onChange={(e) => {
                  setError("");
                  setUrl(e.target.value);
                }}
                placeholder="Paste CSV or JSON API URL..."
                className="w-full rounded-xl bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-violet-300/45 transition placeholder:text-slate-400 focus:ring"
              />
              <button
                type="button"
                onClick={() => void handleLoad()}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-violet-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading
                  </span>
                ) : (
                  "Load Dataset"
                )}
              </button>
            </div>
          </div>

          <div className="mt-3 min-h-6 text-center text-sm">
            {loading && (
              <span className="inline-flex items-center gap-2 text-violet-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching and validating dataset...
              </span>
            )}
            {!loading && statusText && (
              <span className="inline-flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {statusText}
              </span>
            )}
            {!loading && error && (
              <span className="inline-flex items-center gap-2 text-rose-500">
                <XCircle className="h-4 w-4" />
                {error}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
