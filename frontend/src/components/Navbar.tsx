import React, { useEffect, useState } from "react";
import {
  Search,
  GitCompare,
  BarChart3,
  Activity,
  Database,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";
import { Logo } from "./Logo";
import { getHealth } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import type { HealthResponse } from "../types";

interface NavbarProps {
  activeTab: "search" | "compare" | "evaluation" | "analytics";
  setActiveTab: (tab: "search" | "compare" | "evaluation" | "analytics") => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<boolean>(false);
  const { theme, toggleTheme } = useTheme();

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
    { id: "search", label: "Search Engine", icon: Search, shortcut: "1" },
    { id: "compare", label: "Algorithm Matrix", icon: GitCompare, shortcut: "2" },
    { id: "evaluation", label: "Cranfield Benchmarks", icon: BarChart3, shortcut: "3" },
    { id: "analytics", label: "Audit Telemetry", icon: Activity, shortcut: "4" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & System Identity */}
        <div
          className="flex items-center space-x-3 cursor-pointer select-none group"
          onClick={() => setActiveTab("search")}
        >
          <Logo size={32} />

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                SearchForge
              </span>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-surface-elevated text-slate-600 dark:text-slate-300 border border-border">
                IR-CORE v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex items-center space-x-1 font-mono leading-none mt-0.5">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">BM25</span>
              <span className="text-slate-400 dark:text-slate-600">/</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Hybrid</span>
              <span className="text-slate-400 dark:text-slate-600">/</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">TF-IDF</span>
              <span className="text-slate-400 dark:text-slate-600">/</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-medium">Keyword</span>
            </p>
          </div>
        </div>

        {/* Tactile Segmented Navigation Tabs */}
        <nav className="flex items-center p-1 rounded-xl bg-surface-muted border border-border shadow-inner">
          {navItems.map(({ id, label, icon: Icon, shortcut }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-surface-elevated text-slate-900 dark:text-white border border-border-strong shadow-subtle font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-surface/50 border border-transparent"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-slate-400"}`} />
                <span className="hidden md:inline">{label}</span>
                <span className="hidden xl:inline-block kbd-shortcut">
                  {shortcut}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Controls: Live Status & Dark/Light Mode Switcher */}
        <div className="flex items-center space-x-2">
          {/* Live Index Status Beacon */}
          {health && !error ? (
            <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="hidden sm:flex items-center space-x-1.5 text-slate-600 dark:text-slate-300 text-[11px] font-mono">
                <Database className="h-3 w-3 text-slate-400" />
                <span>{health.index.document_count} Docs</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-medium flex items-center space-x-1">
                <CheckCircle2 className="h-3 w-3 inline" />
                <span>Active</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
              <span className="font-mono text-[11px]">Offline</span>
            </div>
          )}

          {/* Theme Toggle Button (Dark / Light) */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="h-8 w-8 rounded-lg bg-surface hover:bg-surface-elevated border border-border flex items-center justify-center transition-colors text-slate-600 dark:text-slate-300 hover:text-primary cursor-pointer shadow-subtle"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 transition-transform hover:-rotate-12" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
