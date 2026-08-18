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
  Terminal,
  Radio,
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

  const pageRef = React.useRef(page);
  pageRef.current = page;

  useEffect(() => {
    fetchData(1, selectedMode);
    const interval = setInterval(() => fetchData(pageRef.current, selectedMode), 10000);
    return () => clearInterval(interval);
  }, [selectedMode]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-xs font-mono font-semibold text-indigo-300 mb-2">
            <Activity className="h-3.5 w-3.5" />
            <span>Search Observability & Audit Telemetry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
            System Observability & Query Logs
          </h1>
          <p className="text-sm text-slate-300 mt-1 font-sans">
            Real-time query execution telemetry, latency profiling, and corpus state metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-surface-muted border border-border text-xs font-mono text-slate-300">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>Live (10s Polling)</span>
          </div>

          <button
            onClick={() => fetchData(page, selectedMode)}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-surface-muted hover:bg-surface-subtle border border-border text-slate-200 text-xs font-display font-semibold flex items-center space-x-2 transition-all shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Health Overview Cards */}
      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="glass-panel p-5 rounded-3xl border border-border shadow-glass space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Database Corpus</span>
              <Database className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
              {health.database.product_count}
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium font-sans">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>SQLite Connected & Synced</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-border shadow-glass space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Inverted Index Size</span>
              <Layers className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-cyan-300 font-mono tracking-tight">
              {health.index.document_count}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              100% of product corpus loaded in RAM
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-border shadow-glass space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Vocabulary Terms</span>
              <Cpu className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-purple-300 font-mono tracking-tight">
              {health.index.vocabulary_size}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Unique stemmed terms in vocabulary
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-border shadow-glass space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Engine Status</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping"></span>
              <span>OPERATIONAL</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              v{health.version} • FastAPI Core
            </div>
          </div>
        </div>
      )}

      {/* 6-Stage Search Architecture Flow Pipeline */}
      <div className="glass-panel p-6 rounded-3xl border border-border shadow-glass space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-white flex items-center space-x-2">
            <Terminal className="h-4 w-4 text-indigo-400" />
            <span>SearchForge 6-Stage Query Execution Pipeline</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">Deterministic Flow</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 pt-2 text-xs">
          {[
            { step: "1. NL Parsing", desc: "Extract price phrases ('under 3000') & category hints via regex grammar" },
            { step: "2. Preprocessing", desc: "Lowercase, regex tokenize, stopword pruning, Snowball stemming" },
            { step: "3. Pre-Filtering", desc: "SQL constraint pruning on Active, Price bounds, and Category" },
            { step: "4. Scorer / Ranker", desc: "BM25 / Hybrid / TF-IDF / Keyword candidate scoring" },
            { step: "5. Fallback Check", desc: "Zero match detection → lowest-IDF token relaxation fallback" },
            { step: "6. Async Logging", desc: "Persist execution latency & candidate telemetry to SQLite" },
          ].map(({ step, desc }, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-surface-well border border-border hover:border-indigo-500/40 transition-all space-y-1.5 shadow-inner"
            >
              <div className="font-display font-bold text-indigo-300 text-[11px]">{step}</div>
              <p className="text-[11px] text-slate-400 leading-snug font-sans">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Search Logs Table */}
      <div className="glass-panel p-6 rounded-3xl border border-border shadow-glass space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Live Search Query Audit Trail ({logsData ? logsData.pagination.total_results : 0} Total Requests)
            </h3>
            <p className="text-xs text-slate-300 font-sans">
              Every search request is asynchronously logged with execution latency and candidate counts.
            </p>
          </div>

          {/* Filter by Mode */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-mono">Filter Mode:</span>
            <select
              value={selectedMode}
              onChange={(e) => {
                setSelectedMode(e.target.value);
                fetchData(1, e.target.value);
              }}
              className="bg-surface-well border border-border rounded-xl px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Modes</option>
              <option value="bm25">BM25</option>
              <option value="hybrid">Hybrid</option>
              <option value="tfidf">TF-IDF</option>
              <option value="keyword">Keyword</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-well/90 text-slate-400 font-mono font-bold uppercase tracking-wider border-b border-border">
              <tr>
                <th className="py-3 px-4 font-mono w-16">Log ID</th>
                <th className="py-3 px-4 font-display">Query String</th>
                <th className="py-3 px-4 font-mono">Ranking Mode</th>
                <th className="py-3 px-4 font-mono">Results</th>
                <th className="py-3 px-4 font-mono">Latency</th>
                <th className="py-3 px-4">Fallback</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface-well/40 font-mono">
              {logsData && logsData.logs.length > 0 ? (
                logsData.logs.map((log: SearchLogItem) => (
                  <tr key={log.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="py-2.5 px-4 text-slate-400 font-bold">#{log.id}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-200">
                      "{log.query_text}"
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-surface-muted border border-border text-indigo-300 text-[11px] font-bold">
                        {log.mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{log.result_count} items</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`font-bold ${
                          log.latency_ms < 15
                            ? "text-emerald-400"
                            : log.latency_ms < 50
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        {log.latency_ms.toFixed(2)} ms
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {log.fallback ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          Fallback
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 text-right text-[11px]">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-mono">
                    No search logs recorded yet. Run a search to see live telemetry!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Logs Pagination */}
        {logsData && logsData.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-slate-400 font-mono">
            <div>
              Showing page <span className="text-white font-bold">{page}</span> of{" "}
              <span className="text-white font-bold">{logsData.pagination.total_pages}</span> (
              {logsData.pagination.total_results} total logs)
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchData(page - 1)}
                disabled={!logsData.pagination.has_prev}
                className="px-3 py-1.5 rounded-xl bg-surface-muted border border-border text-slate-300 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => fetchData(page + 1)}
                disabled={!logsData.pagination.has_next}
                className="px-3 py-1.5 rounded-xl bg-surface-muted border border-border text-slate-300 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
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
