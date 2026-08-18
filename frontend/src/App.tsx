import { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { SearchPage } from "./pages/SearchPage";
import { ComparePage } from "./pages/ComparePage";
import { EvaluationPage } from "./pages/EvaluationPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { Cpu, BookOpen } from "lucide-react";

export function App() {
  const [activeTab, setActiveTab] = useState<"search" | "compare" | "evaluation" | "analytics">("search");

  // Global numeric shortcuts for quick navigation
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
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* Background ambient lighting and subtle developer grid */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 subtle-grid opacity-70" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Navigation Bar */}
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Page Content Container */}
        <main className="flex-1">
          {activeTab === "search" && <SearchPage />}
          {activeTab === "compare" && <ComparePage />}
          {activeTab === "evaluation" && <EvaluationPage />}
          {activeTab === "analytics" && <AnalyticsPage />}
        </main>

        {/* Developer Footer */}
        <footer className="w-full border-t border-white/[0.08] bg-[#030712]/80 backdrop-blur-xl py-6 mt-16 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold text-slate-300">SearchForge Engine</span>
              <span>•</span>
              <span className="font-mono text-slate-400">Classical Information Retrieval & E-Commerce Search</span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 font-mono text-[11px]">
              <span className="text-slate-400">BM25 (k1=1.5, b=0.75)</span>
              <span>•</span>
              <span className="text-emerald-400">Cranfield 30-Query Benchmark</span>
              <span>•</span>
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>FastAPI Swagger Docs</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
