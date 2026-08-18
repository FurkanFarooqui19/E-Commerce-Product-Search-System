import React, { useState, useEffect } from "react";
import {
  GitCompare,
  Zap,
  Info,
  Layers,
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
      badge: "Probabilistic Model",
      color: "border-emerald-500/40 bg-emerald-950/20 text-emerald-300",
      accent: "text-emerald-400",
      borderHover: "hover:border-emerald-500/50",
      indicator: "bg-emerald-400",
      desc: "Sub-linear term saturation (k1=1.5) + length normalization (b=0.75)",
    },
    {
      id: "hybrid",
      title: "Hybrid Ranker",
      badge: "BM25 + Field Bonus",
      color: "border-amber-500/40 bg-amber-950/20 text-amber-300",
      accent: "text-amber-400",
      borderHover: "hover:border-amber-500/50",
      indicator: "bg-amber-400",
      desc: "Convex combination (0.8 BM25 + 0.2 Field Bonus) with name priority",
    },
    {
      id: "tfidf",
      title: "TF-IDF",
      badge: "Vector Space Model",
      color: "border-purple-500/40 bg-purple-950/20 text-purple-300",
      accent: "text-purple-400",
      borderHover: "hover:border-purple-500/50",
      indicator: "bg-purple-400",
      desc: "Logarithmic IDF weighting with sub-linear term frequency scaling",
    },
    {
      id: "keyword",
      title: "Keyword Match",
      badge: "Weighted Match",
      color: "border-cyan-500/40 bg-cyan-950/20 text-cyan-300",
      accent: "text-cyan-400",
      borderHover: "hover:border-cyan-500/50",
      indicator: "bg-cyan-400",
      desc: "Raw field match count (Name: 3.0, Category: 2.0, Desc: 1.5, Specs: 1.0)",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono font-semibold text-indigo-400">
          <GitCompare className="h-3.5 w-3.5" />
          <span>4-Way Synchronized Ranking Matrix</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Algorithm Comparison Matrix
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Execute the same query simultaneously across Keyword, TF-IDF, BM25, and Hybrid to observe ranking shifts, term saturation behavior, and latency profiles in real-time.
        </p>
      </div>

      {/* Input Bar & Controls */}
      <div className="max-w-4xl mx-auto glass-panel rounded-3xl p-5 border border-white/[0.08] shadow-glass space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runCompare(query)}
              placeholder="Enter search query to compare..."
              className="w-full py-3 px-4 bg-slate-950/90 border border-white/[0.08] rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Top-K Selector */}
            <div className="flex items-center space-x-1 bg-surface-muted border border-white/[0.08] rounded-2xl px-2.5 py-1.5 text-xs">
              <span className="text-slate-400 font-mono text-[11px] mr-1">Top K:</span>
              {[3, 5, 10].map((k) => (
                <button
                  key={k}
                  onClick={() => setTopK(k)}
                  className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs transition-all ${
                    topK === k
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            <button
              onClick={() => runCompare(query)}
              disabled={loading}
              className="flex-1 sm:flex-initial px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 flex-shrink-0"
            >
              <Zap className="h-4 w-4" />
              <span>{loading ? "Comparing..." : "Compare All"}</span>
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-500 font-mono text-[11px] mr-1">Curated Test Queries:</span>
          {COMPARE_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(preset);
                runCompare(preset);
              }}
              className="px-2.5 py-1 rounded-full bg-surface-muted border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.12] transition-all font-mono text-[11px]"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Latency Summary Cards */}
      {data && (
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          {modesConfig.map(({ id, title, accent, indicator }) => {
            const lat = data.latency_ms[id as keyof typeof data.latency_ms] || 0;
            return (
              <div
                key={id}
                className="glass-panel p-4 rounded-2xl border border-white/[0.08] flex items-center justify-between shadow-glass"
              >
                <div>
                  <div className="text-[11px] text-slate-400 font-mono font-medium">{title}</div>
                  <div className={`text-lg font-bold font-mono ${accent}`}>
                    {lat.toFixed(2)} ms
                  </div>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${indicator} shadow-glow`}></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* 4 Synchronized Ranking Columns */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {modesConfig.map(({ id, title, badge, color, accent, borderHover, desc }) => {
            const results = (data.results[id as keyof typeof data.results] || []) as CompareResultItem[];

            return (
              <div
                key={id}
                className={`glass-panel rounded-3xl p-5 border border-white/[0.08] flex flex-col justify-between space-y-4 transition-all duration-300 ${borderHover}`}
              >
                {/* Column Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base text-white">{title}</h3>
                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border ${color}`}>
                      {badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug mb-4 min-h-[36px]">
                    {desc}
                  </p>

                  {/* Results List */}
                  <div className="space-y-2.5">
                    {results.length > 0 ? (
                      results.map((item, idx) => {
                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-surface-muted/70 border border-white/[0.06] hover:border-white/[0.12] transition-all space-y-2 group"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center justify-center h-5 px-1.5 rounded-md bg-slate-950 border border-white/[0.08] text-[11px] font-mono font-bold text-slate-300">
                                #{item.rank}
                              </span>
                              <span className={`font-mono text-[11px] font-bold ${accent}`}>
                                Score: {item.score.toFixed(4)}
                              </span>
                            </div>

                            <h4 className="font-semibold text-xs text-slate-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                              {item.product_name}
                            </h4>

                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-white/[0.04] font-mono">
                              <span>Doc #{item.product_id}</span>
                              {item.price !== undefined && (
                                <span className="text-slate-300 font-bold">
                                  ₹{item.price.toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 rounded-2xl bg-slate-950/40 text-center text-xs text-slate-500 font-mono">
                        No matches found
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer notes */}
                <div className="pt-3 border-t border-white/[0.06] text-[11px] text-slate-500 font-mono text-center flex items-center justify-center space-x-1.5">
                  <Layers className="h-3 w-3" />
                  <span>{results.length} ranked candidates</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Technical Insight Card */}
      <div className="glass-panel p-6 rounded-3xl border border-white/[0.08] shadow-glass space-y-3">
        <h3 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <Info className="h-4 w-4 text-indigo-400" />
          <span>Information Retrieval Theory Breakdown</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400 leading-relaxed pt-1">
          <div className="p-4 rounded-2xl bg-surface-muted/60 border border-white/[0.06] space-y-1">
            <span className="font-bold text-emerald-400 font-mono block">BM25 Saturation Curve</span>
            <p>
              BM25 caps the score contribution of repeated terms via non-linear term saturation with length normalization. This prevents keyword spamming from overtaking rank #1.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-surface-muted/60 border border-white/[0.06] space-y-1">
            <span className="font-bold text-purple-400 font-mono block">TF-IDF Vector Space</span>
            <p>
              Standard TF-IDF uses logarithmic inverse document frequency scaling but lacks document length normalization penalties for long descriptions.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-surface-muted/60 border border-white/[0.06] space-y-1">
            <span className="font-bold text-amber-400 font-mono block">Hybrid Ranker Synergy</span>
            <p>
              Combines BM25 probabilistic scoring (weight 0.80) with high-precision Name match exact bonus (weight 0.20) for optimal e-commerce relevance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
