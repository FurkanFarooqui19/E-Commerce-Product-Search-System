import React, { useEffect, useState } from "react";
import { Search, GitCompare, BarChart3, Activity, Cpu, AlertCircle, Database, CheckCircle2 } from "lucide-react";
import { getHealth } from "../api/client";
import type { HealthResponse } from "../types";

interface NavbarProps {
  activeTab: "search" | "compare" | "evaluation" | "analytics";
  setActiveTab: (tab: "search" | "compare" | "evaluation" | "analytics") => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<boolean>(false);

  const fetchHealth = async () => {
    try {
      const data = await getHealth();
      setHealth(data);
      setError(false);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: "search", label: "Product Search", icon: Search, shortcut: "1" },
    { id: "compare", label: "Algorithm Compare", icon: GitCompare, shortcut: "2" },
    { id: "evaluation", label: "Cranfield Benchmarks", icon: BarChart3, shortcut: "3" },
    { id: "analytics", label: "Telemetry & Logs", icon: Activity, shortcut: "4" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#030712]/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div
          className="flex items-center space-x-3 cursor-pointer group select-none"
          onClick={() => setActiveTab("search")}
        >
          <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 p-[1px] shadow-glow group-hover:shadow-indigo-500/50 transition-all duration-300">
            <div className="h-full w-full bg-[#0b0f19] rounded-[11px] flex items-center justify-center">
              <Cpu className="h-5 w-5 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent font-sans">
                SearchForge
              </span>
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                IR CORE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:flex items-center space-x-1.5 font-mono">
              <span className="text-emerald-400">BM25</span>
              <span className="text-slate-600">•</span>
              <span className="text-amber-400">Hybrid</span>
              <span className="text-slate-600">•</span>
              <span className="text-purple-400">TF-IDF</span>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400">Keyword</span>
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-surface-muted/90 p-1 rounded-2xl border border-white/[0.08] shadow-inner">
          {navItems.map(({ id, label, icon: Icon, shortcut }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span className="hidden md:inline">{label}</span>
                <span
                  className={`hidden xl:inline text-[9px] font-mono px-1 py-0.2 rounded border ${
                    isActive
                      ? "bg-indigo-700/50 border-indigo-400/40 text-indigo-100"
                      : "bg-slate-900 border-slate-700 text-slate-500"
                  }`}
                >
                  {shortcut}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Live Index Status Beacon */}
        <div className="flex items-center space-x-2.5">
          {health && !error ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-surface-muted/90 border border-white/[0.08] text-xs shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="hidden sm:flex items-center space-x-1.5 text-slate-300 text-[11px] font-mono">
                <Database className="h-3 w-3 text-slate-400" />
                <span>{health.index.document_count} Docs</span>
              </div>
              <span className="text-slate-700 hidden sm:inline">•</span>
              <div className="flex items-center space-x-1 text-emerald-400 font-mono text-[11px] font-medium">
                <CheckCircle2 className="h-3 w-3 hidden sm:inline" />
                <span>Index Ready</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
              <span className="font-mono text-[11px]">Engine Offline</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
