import React, { useEffect, useState } from "react";
import { Search, GitCompare, BarChart3, Activity, Cpu, AlertCircle } from "lucide-react";
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
    { id: "search", label: "Product Search", icon: Search },
    { id: "compare", label: "Algorithm Compare", icon: GitCompare },
    { id: "evaluation", label: "Evaluation Benchmarks", icon: BarChart3 },
    { id: "analytics", label: "Logs & Health", icon: Activity },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("search")}>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 p-0.5 shadow-glow">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Cpu className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                SearchForge
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                IR Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              BM25 • TF-IDF • Keyword • Hybrid Search
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span className="hidden md:inline">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live Index Status Beacon */}
        <div className="flex items-center space-x-2.5">
          {health && !error ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800/80 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-medium hidden sm:inline">
                {health.index.document_count} Products
              </span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="text-emerald-400 font-mono font-medium">Index Ready</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
