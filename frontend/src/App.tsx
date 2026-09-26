import { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { SearchPage } from "./pages/SearchPage";
import { ComparePage } from "./pages/ComparePage";
import { EvaluationPage } from "./pages/EvaluationPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { Logo } from "./components/Logo";
import { BookOpen } from "lucide-react";
import { RAW_HOST } from "./api/client";

export function App() {
  const [activeTab, setActiveTab] = useState<"search" | "compare" | "evaluation" | "analytics">("search");

  // Global numeric shortcuts for instant navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (e.key === "1") setActiveTab("search");
      if (e.key === "2") setActiveTab("compare");
      if (e.key === "3") setActiveTab("evaluation");
      if (e.key === "4") setActiveTab("analytics");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col justify-between selection:bg-primary/30 selection:text-white relative font-sans">
      {/* Top Specular Horizon Line & Subtle Ambient Depth */}
      <div className="fixed inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent z-50 pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_25%_at_50%_0%,rgba(59,130,246,0.05),transparent)] z-0" />

      <div className="relative z-10 flex flex-col flex-1">
        {/* Navigation Bar */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Page Content */}
        <main className="flex-1 pb-12">
          {activeTab === "search" && <SearchPage />}
          {activeTab === "compare" && <ComparePage />}
          {activeTab === "evaluation" && <EvaluationPage />}
          {activeTab === "analytics" && <AnalyticsPage />}
        </main>

        {/* Precision Engineering Footer */}
        <footer className="w-full border-t border-border bg-surface-muted/90 py-5 text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <Logo size={20} />
              <span className="font-display font-bold text-slate-800 dark:text-slate-200">SearchForge Engine</span>
              <span className="text-slate-400 dark:text-slate-600">/</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">Classical Information Retrieval IR Core</span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-700 dark:text-slate-300">
                BM25 (k₁=1.5, b=0.75)
              </span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-700 dark:text-slate-300">
                Hybrid α=0.8
              </span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-700 dark:text-slate-300">
                Cranfield n=30
              </span>
              <a
                href={RAW_HOST ? `${RAW_HOST}/docs` : "/docs"}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:text-primary-hover flex items-center space-x-1 transition-colors ml-1"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>OpenAPI Docs</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
