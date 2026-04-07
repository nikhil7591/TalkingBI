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

type DatasetOverview = {
  source_type?: string;
  cloud_provider?: string;
  database_engine?: string | null;
  row_count?: number;
  column_count?: number;
  numeric_columns?: string[];
  categorical_columns?: string[];
  date_columns?: string[];
  missing_cells?: number;
  duplicate_rows?: number;
  top_missing_columns?: Array<{ column: string; missing: number }>;
};

type DeepPrepSummary = {
  quality_issues?: string[];
  transformations?: string[];
  cleaned_row_count?: number;
  cleaned_sample_rows?: Array<Record<string, unknown>>;
};

type Props = {
  userId?: string;
  mode?: "light" | "dark";
  onDatasetStateChange: (state: DatasetState) => void;
};

export default function DatasetUrlInput({ userId, mode = "light", onDatasetStateChange }: Props) {
  const isDark = mode === "dark";
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Array<{ name: string; dtype: string }>>([]);
  const [rowCount, setRowCount] = useState(0);
  const [overview, setOverview] = useState<DatasetOverview | null>(null);
  const [deepprep, setDeepprep] = useState<DeepPrepSummary | null>(null);
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
    setOverview(null);
    setDeepprep(null);
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
      setOverview(result.overview || null);
      setDeepprep(result.deepprep || null);
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
        <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Connect Your Dataset</h3>
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
          <div className={`mb-3 flex items-center justify-center gap-2 ${isDark ? "text-white" : "text-violet-700"}`}>
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
                placeholder="Paste CSV/JSON/API/DB URL (Postgres, MongoDB, Neo4j, AWS/GCP/Azure)..."
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

          {!loading && sessionId && overview && (
            <div className={`mt-5 rounded-2xl border p-4 ${isDark ? "border-slate-700 bg-slate-900/80" : "border-violet-100 bg-white/90"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isDark ? "bg-slate-800 text-slate-200" : "bg-violet-50 text-violet-700"}`}>
                  Source: {(overview.source_type || "dataset").toUpperCase()}
                </span>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isDark ? "bg-slate-800 text-slate-200" : "bg-cyan-50 text-cyan-700"}`}>
                  Provider: {(overview.cloud_provider || "local").toUpperCase()}
                </span>
                {overview.database_engine ? (
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isDark ? "bg-slate-800 text-slate-200" : "bg-emerald-50 text-emerald-700"}`}>
                    Engine: {overview.database_engine}
                  </span>
                ) : null}
              </div>

              <h4 className={`mt-3 text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-800"}`}>Dataset Overview</h4>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className={`rounded-xl border p-2 text-center ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-[11px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Rows</p>
                  <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{overview.row_count ?? rowCount}</p>
                </div>
                <div className={`rounded-xl border p-2 text-center ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-[11px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Columns</p>
                  <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{overview.column_count ?? columns.length}</p>
                </div>
                <div className={`rounded-xl border p-2 text-center ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-[11px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Missing</p>
                  <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{overview.missing_cells ?? 0}</p>
                </div>
                <div className={`rounded-xl border p-2 text-center ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}`}>
                  <p className={`text-[11px] font-semibold uppercase ${isDark ? "text-slate-400" : "text-slate-500"}`}>Duplicates</p>
                  <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{overview.duplicate_rows ?? 0}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className={`rounded-xl border p-2 ${isDark ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-slate-50/80"}`}>
                  <p className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Numeric Columns</p>
                  <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {(overview.numeric_columns || []).slice(0, 6).join(", ") || "None"}
                  </p>
                </div>
                <div className={`rounded-xl border p-2 ${isDark ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-slate-50/80"}`}>
                  <p className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Date Columns</p>
                  <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {(overview.date_columns || []).slice(0, 6).join(", ") || "None"}
                  </p>
                </div>
                <div className={`rounded-xl border p-2 ${isDark ? "border-slate-700 bg-slate-800/70" : "border-slate-200 bg-slate-50/80"}`}>
                  <p className={`text-xs font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Category Columns</p>
                  <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {(overview.categorical_columns || []).slice(0, 6).join(", ") || "None"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!loading && sessionId && deepprep && (
            <div className={`mt-4 rounded-2xl border p-4 ${isDark ? "border-emerald-700/40 bg-emerald-950/30" : "border-emerald-100 bg-emerald-50/70"}`}>
              <h4 className={`text-sm font-bold ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>DeepPrep Cleaning Summary</h4>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className={`rounded-xl border p-3 ${isDark ? "border-emerald-800/40 bg-slate-900/60" : "border-emerald-200 bg-white"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>Quality Issues Found</p>
                  <ul className={`mt-2 space-y-1 text-xs ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {(deepprep.quality_issues || []).slice(0, 6).map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                    {!(deepprep.quality_issues || []).length && <li>- No major issue detected in preview.</li>}
                  </ul>
                </div>

                <div className={`rounded-xl border p-3 ${isDark ? "border-emerald-800/40 bg-slate-900/60" : "border-emerald-200 bg-white"}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>Transformations Applied</p>
                  <ul className={`mt-2 space-y-1 text-xs ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {(deepprep.transformations || []).slice(0, 6).map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                    {!(deepprep.transformations || []).length && <li>- Cleaning summary unavailable.</li>}
                  </ul>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className={`text-xs font-semibold ${isDark ? "text-emerald-200" : "text-emerald-700"}`}>
                  Cleaned Rows (preview run): {deepprep.cleaned_row_count ?? 0}
                </p>
              </div>

              {(deepprep.cleaned_sample_rows || []).length > 0 && (
                <div className={`mt-2 overflow-x-auto rounded-xl border ${isDark ? "border-slate-700" : "border-emerald-200"}`}>
                  <table className="min-w-full text-left text-xs">
                    <thead className={isDark ? "bg-slate-900 text-slate-200" : "bg-emerald-100/80 text-emerald-900"}>
                      <tr>
                        {Object.keys((deepprep.cleaned_sample_rows || [])[0] || {}).slice(0, 6).map((key) => (
                          <th key={key} className="px-3 py-2 font-semibold">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={isDark ? "bg-slate-950 text-slate-200" : "bg-white text-slate-700"}>
                      {(deepprep.cleaned_sample_rows || []).slice(0, 5).map((row, idx) => (
                        <tr key={`cleaned-row-${idx}`} className={isDark ? "border-t border-slate-800" : "border-t border-emerald-100"}>
                          {Object.keys((deepprep.cleaned_sample_rows || [])[0] || {}).slice(0, 6).map((key) => (
                            <td key={`${idx}-${key}`} className="max-w-[180px] truncate px-3 py-2">{String(row[key] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
