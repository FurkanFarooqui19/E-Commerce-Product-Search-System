import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Sparkles,
  X,
  Clock,
  Database,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Tag,
  Star,
  Zap,
} from "lucide-react";
import { searchProducts, getSuggestions, getCategories } from "../api/client";
import type { SearchResponse, Category, Product, RankingMode } from "../types";
import { ProductCard } from "../components/ProductCard";
import { ProductDetailModal } from "../components/ProductDetailModal";
import { getProductImage, FALLBACK_IMAGE } from "../utils/productImages";

const EXAMPLE_QUERIES = [
  "wireless headphones under 3000",
  "noise cancelling headphones",
  "smartwatch fitness tracker",
  "air fryer kitchen appliance",
  "running shoes for women",
  "programming guide python",
];

const PRESET_PRICE_RANGES = [
  { label: "Under ₹1,000", min: undefined, max: 1000 },
  { label: "₹1,000 - ₹5,000", min: 1000, max: 5000 },
  { label: "₹5,000 - ₹20,000", min: 5000, max: 20000 },
  { label: "Above ₹20,000", min: 20000, max: undefined },
];

export const SearchPage: React.FC = () => {
  // Query & state
  const [query, setQuery] = useState("wireless headphones");
  const [mode, setMode] = useState<RankingMode>("bm25");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [page, setPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Data & loading
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch categories on mount
  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data.categories))
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced autocomplete suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await getSuggestions(query, 6);
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [query]);

  // Execute Search
  const handleSearch = React.useCallback(async (pageNum: number = 1, explicitQuery?: string) => {
    const q = explicitQuery !== undefined ? explicitQuery : query;
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const data = await searchProducts({
        q,
        mode,
        category: selectedCategory || undefined,
        min_price: minPrice,
        max_price: maxPrice,
        page: pageNum,
        page_size: 12,
      });
      setSearchResponse(data);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || "Search failed");
      setSearchResponse(null);
    } finally {
      setLoading(false);
    }
  }, [query, mode, selectedCategory, minPrice, maxPrice]);

  // Trigger search on filter / mode changes
  useEffect(() => {
    handleSearch(1);
  }, [mode, selectedCategory, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(1);
    }
  };

  const handleSelectSuggestion = (s: string) => {
    setQuery(s);
    setShowSuggestions(false);
    handleSearch(1, s);
  };

  const handleResetFilters = () => {
    setSelectedCategory("");
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setPage(1);
  };

  const nlData = searchResponse?.query?.nl_extracted;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Search Hero & Raycast-Style Spotlight Bar ── */}
      <div className="relative z-30 max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono font-semibold text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Vector & Classical BM25 Information Retrieval</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
          Search the catalog with{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">
            sub-millisecond
          </span>{" "}
          precision
        </h1>

        {/* Raycast / Linear Spotlight Search Input */}
        <div className="relative pt-2">
          <div className="relative flex items-center shadow-glass-lg rounded-2xl overflow-hidden border border-white/[0.12] bg-[#0b0f19]/90 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all duration-300">
            <div className="pl-4 text-slate-400 flex items-center space-x-2">
              <Search className="h-5 w-5 text-indigo-400" />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search by keyword, attribute, price (e.g. 'wireless headphones under 3000')..."
              className="w-full py-4 px-3 bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none font-medium"
            />

            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                className="p-1.5 mr-1 text-slate-500 hover:text-white rounded-lg transition-colors"
                title="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => handleSearch(1)}
              disabled={loading}
              className="m-1.5 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5 disabled:opacity-50 flex-shrink-0"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Search</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-2 bg-[#0b0f19] border border-white/[0.1] rounded-2xl shadow-glass-lg overflow-hidden z-50 text-left backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div className="px-3.5 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-white/[0.06] flex items-center justify-between">
                <span>Inverted Index Suggestions</span>
                <span className="text-indigo-400">Press Enter</span>
              </div>
              <ul className="divide-y divide-white/[0.04]">
                {suggestions.map((item, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className="px-4 py-2.5 text-xs sm:text-sm text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-200 cursor-pointer flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Search className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400" />
                      <span className="font-mono text-xs">{item}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Stemmed Term</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quick Example Query Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-500 font-mono text-[11px] mr-1">Benchmarks:</span>
          {EXAMPLE_QUERIES.map((example, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(example);
                handleSearch(1, example);
              }}
              className="px-2.5 py-1 rounded-full bg-surface-muted border border-white/[0.06] text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-slate-800 transition-all font-mono text-[11px]"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* ── Natural Language Query Parser Badge ── */}
      {nlData && (nlData.max_price !== null || nlData.min_price !== null || nlData.category_hint !== null) && (
        <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-glow">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0 animate-pulse" />
            <span className="font-bold text-indigo-200">NL Parser Active:</span>
            <span className="text-slate-300">Extracted structured constraints automatically:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            {nlData.category_hint && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                Category: <b>{nlData.category_hint}</b>
              </span>
            )}
            {nlData.max_price !== null && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Max Price: <b>₹{nlData.max_price}</b>
              </span>
            )}
            {nlData.min_price !== null && (
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                Min Price: <b>₹{nlData.min_price}</b>
              </span>
            )}
            {nlData.clean_query && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/[0.08] text-slate-300">
                Clean Query: <b>"{nlData.clean_query}"</b>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content: Sidebar Filters & Results Showcase ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar: Controls & Filters */}
        <div className="space-y-6 glass-panel rounded-3xl p-5 border border-white/[0.08] shadow-glass">
          {/* Ranking Algorithm Switcher */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Zap className="h-3.5 w-3.5 text-indigo-400" />
                <span>Ranking Algorithm</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">4 Engine Models</span>
            </div>

            <div className="space-y-2">
              {[
                {
                  id: "bm25",
                  name: "BM25 (Default)",
                  tag: "k1=1.5, b=0.75",
                  desc: "Best-match term saturation + doc length norm",
                  accent: "text-emerald-400",
                },
                {
                  id: "hybrid",
                  name: "Hybrid Ranker",
                  tag: "0.8 BM25 + 0.2 Field",
                  desc: "Convex combination with name field priority",
                  accent: "text-amber-400",
                },
                {
                  id: "tfidf",
                  name: "TF-IDF",
                  tag: "Log IDF Weighting",
                  desc: "Vector space cosine scoring with sublinear TF",
                  accent: "text-purple-400",
                },
                {
                  id: "keyword",
                  name: "Keyword Match",
                  tag: "Weighted Frequency",
                  desc: "Raw occurrence count across weighted fields",
                  accent: "text-cyan-400",
                },
              ].map(({ id, name, tag, desc, accent }) => {
                const isSelected = mode === id;
                return (
                  <button
                    key={id}
                    onClick={() => setMode(id as RankingMode)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 ${
                      isSelected
                        ? "bg-indigo-600/15 border-indigo-500/80 text-white shadow-sm shadow-indigo-600/20"
                        : "bg-surface-muted/60 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${isSelected ? "text-white" : ""}`}>
                        {name}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-white/[0.06] ${accent}`}>
                        {tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter */}
          <div className="pt-5 border-t border-white/[0.08]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Tag className="h-3.5 w-3.5 text-indigo-400" />
                <span>Categories</span>
              </label>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory("")}
                  className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedCategory("")}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                  !selectedCategory
                    ? "bg-indigo-600 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <span>All Categories</span>
                <span className="text-[11px] font-mono opacity-70">510</span>
              </button>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? "" : cat.slug)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="truncate mr-2">{cat.name}</span>
                    <span className="text-[11px] font-mono opacity-70">{cat.product_count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="pt-5 border-t border-white/[0.08]">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 block mb-3">
              Price Range (₹)
            </label>

            {/* Quick preset chips */}
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {PRESET_PRICE_RANGES.map((preset, idx) => {
                const isPresetActive = minPrice === preset.min && maxPrice === preset.max;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setMinPrice(preset.min);
                      setMaxPrice(preset.max);
                      setTimeout(() => handleSearch(1), 50);
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-mono text-center border transition-all ${
                      isPresetActive
                        ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 font-bold"
                        : "bg-surface-muted border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.12]"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <span className="text-[10px] text-slate-500 font-mono mb-1 block">Min (₹)</span>
                <input
                  type="number"
                  value={minPrice !== undefined ? minPrice : ""}
                  onChange={(e) =>
                    setMinPrice(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="0"
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono mb-1 block">Max (₹)</span>
                <input
                  type="number"
                  value={maxPrice !== undefined ? maxPrice : ""}
                  onChange={(e) =>
                    setMaxPrice(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="150000"
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
            <button
              onClick={() => handleSearch(1)}
              className="w-full py-2 bg-surface-muted hover:bg-slate-800 border border-white/[0.08] text-slate-200 text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              Apply Filter
            </button>
          </div>

          {/* Reset All */}
          <button
            onClick={handleResetFilters}
            className="w-full py-2.5 rounded-xl border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] text-xs font-medium transition-colors flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>

        {/* Right Section: Telemetry Header, View Mode, & Results */}
        <div className="lg:col-span-3 space-y-6">
          {/* Telemetry Header */}
          {searchResponse && (
            <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs border border-white/[0.08] shadow-glass">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-white text-sm font-mono">
                  {searchResponse.pagination.total_results} Products Found
                </span>
                <span className="text-slate-600">•</span>
                <div className="flex items-center space-x-1.5 text-cyan-400 font-mono">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-bold">{searchResponse.metadata.latency_ms.toFixed(2)} ms</span>
                </div>
                <span className="text-slate-600">•</span>
                <div className="flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
                  <Database className="h-3.5 w-3.5" />
                  <span>{searchResponse.metadata.total_candidates} Scored</span>
                </div>
              </div>

              {/* View Switch & Processed Tokens */}
              <div className="flex items-center space-x-3">
                {/* Tokens Pill */}
                {searchResponse.query.processed_tokens.length > 0 && (
                  <div className="hidden sm:flex items-center space-x-1.5 overflow-x-auto">
                    <span className="text-slate-500 font-mono text-[10px]">Stemmed:</span>
                    {searchResponse.query.processed_tokens.map((token, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-surface-muted border border-white/[0.06] text-indigo-300 font-mono text-[10px]"
                      >
                        {token}
                      </span>
                    ))}
                  </div>
                )}

                {/* Grid / List View Toggle */}
                <div className="flex items-center space-x-1 bg-surface-muted p-1 rounded-xl border border-white/[0.06]">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === "grid"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewMode === "list"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Developer List View"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fallback Warning if triggered */}
          {searchResponse?.metadata.fallback_applied && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs flex items-center space-x-3">
              <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-400" />
              <div>
                <p className="font-bold">Zero Exact Matches — Fallback Scoring Applied</p>
                <p className="text-amber-400/80 text-[11px] mt-0.5">
                  The search engine relaxed strict conjuncts to match individual high-IDF terms from your query.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-6 rounded-3xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-center space-y-2">
              <p className="font-bold text-base">{error}</p>
              <p className="text-xs text-rose-400">Please try adjusting your search terms or filters.</p>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="glass-panel rounded-2xl p-5 animate-skeleton space-y-4 border border-white/[0.06]"
                >
                  <div className="h-4 bg-white/[0.05] rounded w-1/3"></div>
                  <div className="h-40 bg-white/[0.05] rounded-xl"></div>
                  <div className="h-5 bg-white/[0.05] rounded w-3/4"></div>
                  <div className="h-4 bg-white/[0.05] rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {/* Results Grid View */}
          {!loading && searchResponse && searchResponse.results.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {searchResponse.results.map((item) => (
                <ProductCard
                  key={item.product.id}
                  item={item}
                  onSelect={(product) => setSelectedProduct(product)}
                />
              ))}
            </div>
          )}

          {/* Results List View (Developer Dense Mode) */}
          {!loading && searchResponse && searchResponse.results.length > 0 && viewMode === "list" && (
            <div className="glass-panel rounded-3xl overflow-hidden border border-white/[0.08]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-mono font-bold uppercase tracking-wider border-b border-white/[0.08]">
                    <tr>
                      <th className="py-3.5 px-4 w-12">Rank</th>
                      <th className="py-3.5 px-4">Product Name</th>
                      <th className="py-3.5 px-4 font-mono">Category</th>
                      <th className="py-3.5 px-4 font-mono">Score</th>
                      <th className="py-3.5 px-4 font-mono">Price</th>
                      <th className="py-3.5 px-4">Rating</th>
                      <th className="py-3.5 px-4 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] bg-slate-950/40">
                    {searchResponse.results.map((item) => {
                      const { rank, score, product } = item;
                      const imageUrl = getProductImage(product);
                      return (
                        <tr
                          key={product.id}
                          onClick={() => setSelectedProduct(product)}
                          className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-300">
                            #{rank}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={imageUrl}
                                alt={product.name}
                                onError={(e) => {
                                  e.currentTarget.src = FALLBACK_IMAGE;
                                }}
                                className="h-9 w-9 object-contain rounded-lg bg-slate-950 border border-white/[0.06] p-1 flex-shrink-0"
                              />
                              <div>
                                <div className="font-semibold text-slate-100 line-clamp-1">
                                  {product.name}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {product.brand} • Doc #{product.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {product.category?.name || "General"}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                            {score.toFixed(4)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            ₹{product.price.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1 text-amber-300 font-mono font-bold text-[11px]">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{product.rating.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(product);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-surface-muted hover:bg-indigo-600 hover:text-white border border-white/[0.06] text-slate-300 text-[11px] font-mono transition-colors"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty Results */}
          {!loading && searchResponse && searchResponse.results.length === 0 && (
            <div className="glass-panel rounded-3xl p-16 text-center space-y-4 border border-white/[0.08]">
              <div className="h-16 w-16 rounded-2xl bg-surface-muted border border-white/[0.08] flex items-center justify-center mx-auto text-slate-400">
                <Search className="h-8 w-8 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white">No products found in corpus</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                No matching active products found for "{query}" with the selected filters.
                Try adjusting your search terms or clearing price filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Pagination Bar */}
          {searchResponse && searchResponse.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-white/[0.08]">
              <div className="text-xs text-slate-400 font-mono">
                Showing page <span className="text-white font-bold">{page}</span> of{" "}
                <span className="text-white font-bold">
                  {searchResponse.pagination.total_pages}
                </span>{" "}
                ({searchResponse.pagination.total_results} total items)
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSearch(page - 1)}
                  disabled={!searchResponse.pagination.has_prev}
                  className="px-3 py-1.5 rounded-xl bg-surface-muted border border-white/[0.08] text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center space-x-1 font-mono text-xs">
                  {[...Array(searchResponse.pagination.total_pages)].map((_, i) => {
                    const p = i + 1;
                    if (
                      p === 1 ||
                      p === searchResponse.pagination.total_pages ||
                      Math.abs(p - page) <= 1
                    ) {
                      return (
                        <button
                          key={p}
                          onClick={() => handleSearch(p)}
                          className={`h-8 w-8 rounded-xl flex items-center justify-center font-semibold transition-all ${
                            page === p
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                              : "bg-surface-muted text-slate-400 hover:bg-slate-800 border border-white/[0.06]"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    }
                    if (p === 2 && page > 3) {
                      return <span key={p} className="px-1 text-slate-600">...</span>;
                    }
                    if (p === searchResponse.pagination.total_pages - 1 && page < searchResponse.pagination.total_pages - 2) {
                      return <span key={p} className="px-1 text-slate-600">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => handleSearch(page + 1)}
                  disabled={!searchResponse.pagination.has_next}
                  className="px-3 py-1.5 rounded-xl bg-surface-muted border border-white/[0.08] text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};
