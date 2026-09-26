import React, { useState, useEffect } from "react";
import {
  Zap,
  Info,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { compareAlgorithms } from "../api/client";
import type { CompareResponse, CompareResultItem } from "../types";

const COMPARE_PRESETS = [
  "wireless headphones",
  "laptop for students",
  "noise cancelling headphones",
  "bluetooth earbuds wireless",
  "cookbook recipe book",
  "dash cam car",
];

export const ComparePage: React.FC = () => {
  const [query, setQuery] = useState("wireless headphones");
  const [topK, setTopK] = useState<number>(5);
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const runCompare = async (searchQuery: string = query, k: number = topK) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await compareAlgorithms({
        q: searchQuery,
        modes: "keyword,tfidf,bm25,hybrid",
        top_k: k,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCompare("wireless headphones", topK);
  }, [topK]);

  const modesConfig = [
    {
      id: "bm25",
      title: "BM25 (Default)",
      badge: "Probabilistic IR",
      tagColor: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60",
      accent: "text-emerald-600 dark:text-emerald-400",
      scoreBar: "bg-emerald-500",
      desc: "Sub-linear term frequency saturation (k₁=1.5) with document length normalization (b=0.75).",
    },
    {
      id: "hybrid",
      title: "Hybrid Ranker",
      badge: "Convex Fusion",
      tagColor: "text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60",
      accent: "text-indigo-600 dark:text-indigo-400",
      scoreBar: "bg-indigo-500",
      desc: "Convex combination: 0.8 × BM25 + 0.2 × Field Match Bonus (giving strict priority to product name).",
    },
    {
      id: "tfidf",
      title: "TF-IDF",
      badge: "Vector Space",
      tagColor: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60",
      accent: "text-amber-600 dark:text-amber-400",
      scoreBar: "bg-amber-500",
      desc: "Logarithmic IDF weighting with sub-linear term frequency (1 + ln(tf)) and cosine normalization.",
    },
    {
      id: "keyword",
      title: "Keyword Match",
      badge: "Field Weighted",
      tagColor: "text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60",
      accent: "text-cyan-600 dark:text-cyan-400",
      scoreBar: "bg-cyan-500",
      desc: "Raw exact token frequency across weighted fields (Name: 3.0×, Category: 2.0×, Desc: 1.5×, Specs: 1.0×).",
    },
  ];

  // Concordance detection: Check if all 4 algorithms picked the same top #1 product
  const concordance = React.useMemo(() => {
    if (!data?.results) return null;
    const bm25Top = data.results.bm25?.[0]?.product_id;
    const hybridTop = data.results.hybrid?.[0]?.product_id;
    const tfidfTop = data.results.tfidf?.[0]?.product_id;
    const keywordTop = data.results.keyword?.[0]?.product_id;

    if (!bm25Top || !hybridTop || !tfidfTop || !keywordTop) return null;

    const allAgree =
      bm25Top === hybridTop && hybridTop === tfidfTop && tfidfTop === keywordTop;

    return {
      allAgree,
      bm25Name: data.results.bm25?.[0]?.product_name,
    };
  }, [data]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
          Algorithm Comparison Matrix
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Run synchronized queries across all 4 ranking engines to evaluate rank displacement and score calibration.
        </p>
      </div>

      {/* Query Command Bar & Top-K selector */}
      <div className="max-w-3xl mx-auto surface-card rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runCompare(query)}
              placeholder="Enter search query to compare..."
              className="w-full py-2.5 px-3 bg-surface-muted border border-border rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary font-sans"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Top-K Selector */}
            <div className="flex items-center space-x-1 bg-surface-muted border border-border rounded-lg p-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px] px-1">Top-K:</span>
              {[3, 5, 10].map((k) => (
                <button
                  key={k}
                  onClick={() => setTopK(k)}
                  className={`px-2 py-0.5 rounded font-mono text-xs font-semibold transition-colors ${
                    topK === k
                      ? "bg-surface-elevated text-slate-900 dark:text-white border border-border shadow-subtle"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <button
              onClick={() => runCompare(query)}
              disabled={loading}
              className="flex-1 sm:flex-initial px-4 py-2 bg-primary hover:bg-primary-hover text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{loading ? "Computing..." : "Compare"}</span>
            </button>
          </div>
        </div>

        {/* Sample queries */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] mr-1">Benchmarks:</span>
          {COMPARE_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(preset);
                runCompare(preset);
              }}
              className="px-2 py-0.5 rounded bg-surface border border-border text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500 transition-colors font-mono text-[11px]"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Latency & Concordance Strip */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modesConfig.map(({ id, title, accent }) => {
            const lat = data.latency_ms[id as keyof typeof data.latency_ms] || 0;
            return (
              <div
                key={id}
                className="surface-card p-3 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="text-[10px] text-slate-400 font-mono">{title}</div>
                  <div className={`text-base font-bold font-mono ${accent}`}>
                    {lat.toFixed(2)} ms
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>latency</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Concordance Status Banner */}
      {concordance && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            concordance.allAgree
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300"
              : "bg-surface-card border-border text-slate-700 dark:text-slate-300"
          }`}
        >
          <div className="flex items-center space-x-2">
            {concordance.allAgree ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <Info className="h-4 w-4 text-primary-light flex-shrink-0" />
            )}
            <div>
              <span className="font-semibold">
                {concordance.allAgree
                  ? "Unanimous Rank #1 Concordance:"
                  : "Rank Displacement Detected:"}
              </span>{" "}
              <span className="text-slate-600 dark:text-slate-400">
                {concordance.allAgree
                  ? `All 4 algorithms agree on '${concordance.bm25Name}'.`
                  : "Algorithms disagree on rank ordering due to term saturation and length normalisation effects."}
              </span>
            </div>
          </div>
          <span className="font-mono text-[10px] text-slate-500 uppercase">
            Top-1 Verification
          </span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs text-center">
          {error}
        </div>
      )}

      {/* 4 Synchronized Ranking Columns */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {modesConfig.map(({ id, title, badge, tagColor, accent, scoreBar, desc }) => {
            const results = (data.results[id as keyof typeof data.results] || []) as CompareResultItem[];

            return (
              <div
                key={id}
                className="surface-card rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                {/* Column Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">{title}</h3>
                    <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${tagColor}`}>
                      {badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight mb-3 min-h-[32px] font-sans">
                    {desc}
                  </p>

                  {/* Results List */}
                  <div className="space-y-2">
                    {results.length > 0 ? (
                      results.map((item, idx) => {
                        const pct = Math.min(Math.max(Math.round(item.score * 100), 5), 100);
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-surface-muted border border-border space-y-1.5"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center justify-center h-4.5 px-1.5 rounded bg-surface border border-border text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
                                #{item.rank}
                              </span>
                              <div className="flex items-center space-x-1.5 font-mono text-[10px]">
                                <span className="text-slate-500 dark:text-slate-400">Score:</span>
                                <span className={`font-bold ${accent}`}>
                                  {item.score.toFixed(4)}
                                </span>
                              </div>
                            </div>

                            {/* Score progress track */}
                            <div className="w-full h-1 bg-slate-200 dark:bg-surface-well rounded-full overflow-hidden">
                              <div
                                className={`h-full ${scoreBar} rounded-full`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            <h4 className="font-sans font-medium text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                              {item.product_name}
                            </h4>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-border font-mono">
                              <span>Doc #{item.product_id}</span>
                              {item.price !== undefined && (
                                <span className="text-slate-900 dark:text-slate-300 font-bold">
                                  ₹{item.price.toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-500">
                        No candidates returned
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Count: {results.length}</span>
                  <span className="uppercase">{id}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
