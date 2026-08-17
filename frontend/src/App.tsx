import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { SearchPage } from "./pages/SearchPage";
import { ComparePage } from "./pages/ComparePage";
import { EvaluationPage } from "./pages/EvaluationPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { Cpu, BookOpen } from "lucide-react";

export function App() {
  const [activeTab, setActiveTab] = useState<"search" | "compare" | "evaluation" | "analytics">("search");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
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

        {/* Footer */}
        <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 py-6 mt-12 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold text-slate-300">SearchForge Engine</span>
              <span>•</span>
              <span>Classical Information Retrieval & E-Commerce Search</span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="font-mono text-slate-400">BM25 (k1=1.5, b=0.75) • Cranfield Evaluation</span>
              <span>•</span>
              <a
                href="/docs"
                target="_blank"
                rel="noreferrer"
                className="hover:text-indigo-300 flex items-center space-x-1"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>FastAPI Swagger</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
