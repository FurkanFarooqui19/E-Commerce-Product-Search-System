import React, { useState, useEffect } from "react";
import {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Search Observability & Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-sans font-bold text-slate-900 dark:text-white tracking-tight">
            System Observability & Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Query latency telemetry, corpus state invariants, and execution pipeline metrics.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-surface border border-border text-[11px] font-mono text-slate-600 dark:text-slate-300">
            <Radio className="h-3 w-3 text-emerald-500 dark:text-emerald-400 animate-pulse" />
            <span>Polling (10s)</span>
          </div>

          <button
            onClick={() => fetchData(page, selectedMode)}
            disabled={loading}
            className="px-3 py-1 rounded bg-surface hover:bg-surface-elevated border border-border text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Health Overview Cards */}
      {health && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="surface-card p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Database Corpus</span>
              <Database className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
              {health.database.product_count}
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-sans">
              <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>SQLite Synced</span>
            </div>
          </div>

          <div className="surface-card p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Inverted Index Size</span>
              <Layers className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
              {health.index.document_count}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              100% of corpus in memory
            </div>
          </div>

          <div className="surface-card p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Vocabulary Terms</span>
              <Cpu className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">
              {health.index.vocabulary_size}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Stemmed lexical entries
            </div>
          </div>

          <div className="surface-card p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
              <span>Engine Status</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
              <span>OPERATIONAL</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              v{health.version} · FastAPI IR
            </div>
          </div>
        </div>
      )}

      {/* 6-Stage Search Architecture Flow Pipeline */}
      <div className="surface-card p-5 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-sans font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
            <Terminal className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span>Deterministic 6-Stage Query Execution Flow</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-500">Pipeline Pipeline</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 pt-1 text-xs">
          {[
            { step: "1. NL Parsing", desc: "Extract price phrases ('under 3000') & category hints via regex rules." },
            { step: "2. Preprocessing", desc: "Lowercase, regex tokenize, domain stopword pruning, Snowball stemming." },
            { step: "3. Pre-Filtering", desc: "SQL candidate constraint pruning on Active, Price bounds, and Category." },
            { step: "4. Scoring & Rank", desc: "BM25 / Hybrid / TF-IDF / Keyword candidate scoring on postings." },
            { step: "5. Fallback Check", desc: "Zero match detection → lowest-IDF token relaxation fallback." },
            { step: "6. Telemetry Log", desc: "Persist execution latency, candidate telemetry, and query to DB." },
          ].map(({ step, desc }, i) => (
            <div
              key={i}
              className="p-3 rounded-lg bg-surface-muted border border-border space-y-1"
            >
              <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs">{step}</div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug font-sans">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Search Logs Table */}
      <div className="surface-card p-4 sm:p-5 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-900 dark:text-white">
              Live Search Query Audit Trail ({logsData ? logsData.pagination.total_results : 0} Total Requests)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Query telemetry with exact execution latency and candidate counts.
            </p>
          </div>

          {/* Filter by Mode */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Mode Filter:</span>
            <select
              value={selectedMode}
              onChange={(e) => {
                setSelectedMode(e.target.value);
                fetchData(1, e.target.value);
              }}
              className="bg-surface border border-border rounded px-2.5 py-1 text-slate-800 dark:text-white text-xs font-mono focus:outline-none focus:border-primary"
            >
              <option value="">All Modes</option>
              <option value="bm25">BM25</option>
              <option value="hybrid">Hybrid</option>
              <option value="tfidf">TF-IDF</option>
              <option value="keyword">Keyword</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="bg-surface-muted text-slate-500 dark:text-slate-400 font-mono font-medium uppercase tracking-wider border-b border-border">
              <tr>
                <th className="py-2.5 px-3 font-mono w-16">Log ID</th>
                <th className="py-2.5 px-3 font-sans">Query String</th>
                <th className="py-2.5 px-3 font-mono">Ranking Mode</th>
                <th className="py-2.5 px-3 font-mono">Matches</th>
                <th className="py-2.5 px-3 font-mono">Latency</th>
                <th className="py-2.5 px-3">Fallback</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface/30 font-mono">
              {logsData && logsData.logs.length > 0 ? (
                logsData.logs.map((log: SearchLogItem) => (
                  <tr key={log.id} className="hover:bg-surface-elevated/60 transition-colors">
                    <td className="py-2 px-3 text-slate-400 dark:text-slate-500">#{log.id}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-800 dark:text-slate-200">
                      "{log.query_text}"
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.2 rounded bg-surface border border-border text-slate-700 dark:text-slate-300 text-[11px]">
                        {log.mode}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{log.result_count} items</td>
                    <td className="py-2 px-3">
                      <span
                        className={`font-bold ${
                          log.latency_ms < 15
                            ? "text-emerald-600 dark:text-emerald-400"
                            : log.latency_ms < 50
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {log.latency_ms.toFixed(2)} ms
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {log.fallback ? (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-800/60 text-[10px]">
                          Fallback
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-right text-[11px]">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    No search logs recorded yet. Execute queries to stream live telemetry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Logs Pagination */}
        {logsData && logsData.pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-slate-500 dark:text-slate-400 font-mono">
            <div>
              Page <span className="text-slate-900 dark:text-white font-semibold">{page}</span> of{" "}
              <span className="text-slate-900 dark:text-white font-semibold">{logsData.pagination.total_pages}</span> (
              {logsData.pagination.total_results} logs)
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => fetchData(page - 1)}
                disabled={!logsData.pagination.has_prev}
                className="px-2.5 py-1 rounded bg-surface border border-border text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                onClick={() => fetchData(page + 1)}
                disabled={!logsData.pagination.has_next}
                className="px-2.5 py-1 rounded bg-surface border border-border text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
