import React, { useState, useEffect } from "react";
import {
  Activity,
  Database,
  Layers,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { getHealth, getSearchLogs } from "../api/client";
import type { HealthResponse, LogsResponse, SearchLogItem } from "../types";

export const AnalyticsPage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [logsData, setLogsData] = useState<LogsResponse | null>(null);
  const [page, setPage] = useState<number>(1);
  const [selectedMode, setSelectedMode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async (pageNum: number = 1, modeFilter: string = selectedMode) => {
    setLoading(true);
    try {
      const [h, l] = await Promise.all([
        getHealth(),
        getSearchLogs(pageNum, 15, modeFilter || undefined),
      ]);
      setHealth(h);
      setLogsData(l);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, selectedMode);
    const interval = setInterval(() => fetchData(page, selectedMode), 10000);
    return () => clearInterval(interval);
  }, [selectedMode]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400 mb-2">
            <Activity className="h-3.5 w-3.5" />
            <span>Search Telemetry & Audit Logs</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            System Health & Search Logs
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time query execution telemetry, latency profiling, and corpus state.
          </p>
        </div>

        <button
          onClick={() => fetchData(page, selectedMode)}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold flex items-center space-x-2 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Health Overview Cards */}
      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Database Corpus</span>
              <Database className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {health.database.product_count}
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>SQLite Connected & Active</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Inverted Index Size</span>
              <Layers className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-cyan-300 font-mono">
              {health.index.document_count}
            </div>
            <div className="text-xs text-slate-400">
              100% of products indexed in memory
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Vocabulary Size</span>
              <Cpu className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-3xl font-extrabold text-purple-300 font-mono">
              {health.index.vocabulary_size}
            </div>
            <div className="text-xs text-slate-400">
              Unique stemmed terms in vocabulary
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Engine Status</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono flex items-center space-x-2">
              <span>READY</span>
            </div>
            <div className="text-xs text-slate-400">
              v{health.version} • FastAPI Core
            </div>
          </div>
        </div>
      )}

      {/* 6-Stage Search Architecture Flow */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="font-bold text-base text-white flex items-center space-x-2">
          <Layers className="h-4 w-4 text-indigo-400" />
          <span>SearchForge 6-Stage Query Execution Pipeline</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2 text-xs">
          {[
            { step: "1. NL Parsing", desc: "Extract price phrases ('under 2000') & category hints" },
            { step: "2. Preprocessing", desc: "Lowercase, tokenize, stopword filter, Snowball stem" },
            { step: "3. Pre-Filtering", desc: "SQL constraint pruning (Active, Price, Category)" },
            { step: "4. Scorer / Ranker", desc: "BM25 / Hybrid / TF-IDF / Keyword candidate scoring" },
            { step: "5. Fallback Check", desc: "Zero match detection → lowest-IDF relaxation" },
            { step: "6. Async Logging", desc: "Persist latency & telemetry to search_logs" },
          ].map(({ step, desc }, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1"
            >
              <div className="font-bold text-indigo-300 font-mono">{step}</div>
              <p className="text-[11px] text-slate-400 leading-tight">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Search Logs Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-white">
              Live Search Query Logs (Audit Trail)
            </h3>
            <p className="text-xs text-slate-400">
              Every search request is asynchronously logged with execution latency and candidate counts.
            </p>
          </div>

          {/* Filter by Mode */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Filter Mode:</span>
            <select
              value={selectedMode}
              onChange={(e) => {
                setSelectedMode(e.target.value);
                fetchData(1, e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Modes</option>
              <option value="bm25">BM25</option>
              <option value="hybrid">Hybrid</option>
              <option value="tfidf">TF-IDF</option>
              <option value="keyword">Keyword</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-mono w-16">Log ID</th>
                <th className="py-3 px-4">Query String</th>
                <th className="py-3 px-4 font-mono">Ranking Mode</th>
                <th className="py-3 px-4 font-mono">Results</th>
                <th className="py-3 px-4 font-mono">Latency</th>
                <th className="py-3 px-4">Fallback</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono">
              {logsData && logsData.logs.length > 0 ? (
                logsData.logs.map((log: SearchLogItem) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500">#{log.id}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                      "{log.query_text}"
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 text-[11px]">
                        {log.mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{log.result_count} items</td>
                    <td className="py-2.5 px-4 text-cyan-400 font-bold">
                      {log.latency_ms.toFixed(2)} ms
                    </td>
                    <td className="py-2.5 px-4">
                      {log.fallback ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                          Fallback
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-right text-[11px]">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No search logs recorded yet. Run a search to see live telemetry!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Logs Pagination */}
        {logsData && logsData.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs text-slate-400">
            <div>
              Showing page <span className="font-mono text-white">{page}</span> of{" "}
              <span className="font-mono text-white">{logsData.pagination.total_pages}</span> (
              {logsData.pagination.total_results} total logs)
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchData(page - 1)}
                disabled={!logsData.pagination.has_prev}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => fetchData(page + 1)}
                disabled={!logsData.pagination.has_next}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
