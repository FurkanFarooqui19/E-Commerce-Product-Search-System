import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Clock,
  Database,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Tag,
  Star,
  Zap,
  Cpu,
} from "lucide-react";
import { searchProducts, getSuggestions, getCategories } from "../api/client";
import type { SearchResponse, Category, Product, RankingMode } from "../types";
import { ProductCard } from "../components/ProductCard";
import { ProductDetailModal } from "../components/ProductDetailModal";
import { Logo } from "../components/Logo";
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
  { label: "Under ₹1k", min: undefined, max: 1000 },
  { label: "₹1k - ₹5k", min: 1000, max: 5000 },
  { label: "₹5k - ₹20k", min: 5000, max: 20000 },
  { label: "Above ₹20k", min: 20000, max: undefined },
];

export const SearchPage: React.FC = () => {
  // Query & state
  const [query, setQuery] = useState("wireless headphones");
  const [mode, setMode] = useState<RankingMode>("bm25");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"score" | "price_asc" | "price_desc" | "rating">("score");
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

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
  const handleSearch = React.useCallback(
    async (pageNum: number = 1, explicitQuery?: string) => {
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
    },
    [query, mode, selectedCategory, minPrice, maxPrice]
  );

  // Trigger search on filter / mode changes
  useEffect(() => {
    handleSearch(1);
  }, [mode, selectedCategory, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(1);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      searchInputRef.current?.blur();
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

  // Sorting results locally if needed
  const displayResults = React.useMemo(() => {
    if (!searchResponse?.results) return [];
    const items = [...searchResponse.results];
    if (sortBy === "price_asc") {
      return items.sort((a, b) => a.product.price - b.product.price);
    } else if (sortBy === "price_desc") {
      return items.sort((a, b) => b.product.price - a.product.price);
    } else if (sortBy === "rating") {
      return items.sort((a, b) => b.product.rating - a.product.rating);
    }
    return items; // Default score
  }, [searchResponse?.results, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* ── Search Header & Command Input ── */}
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="text-center space-y-1.5 flex flex-col items-center">
          <div className="inline-flex items-center space-x-2.5">
            <Logo size={28} />
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              Product Search & IR Ranking
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Query 510 catalog documents via Inverted Index BM25, TF-IDF, and Hybrid field weighting.
          </p>
        </div>

        {/* Command Search Input Bar */}
        <div className="relative">
          <div className="relative flex items-center rounded-xl bg-surface-muted border border-border focus-within:border-primary focus-within:bg-surface-elevated transition-colors shadow-card">
            <div className="pl-3.5 text-slate-400 flex items-center">
              <Search className="h-4 w-4 text-slate-400" />
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
              placeholder="Search catalog or NL expression (e.g., 'wireless headphones under 3000')..."
              className="w-full py-3 px-3 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-sans"
            />

            <div className="flex items-center space-x-1.5 pr-2">
              {query ? (
                <button
                  onClick={() => {
                    setQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
                  title="Clear input"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="hidden sm:inline-block kbd-shortcut">/</span>
              )}

              <button
                onClick={() => handleSearch(1)}
                disabled={loading}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Search</span>
                    <ArrowRight className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-full mt-1.5 bg-surface-elevated border border-border-strong rounded-xl shadow-elevated overflow-hidden z-50 text-left animate-in fade-in duration-100"
            >
              <div className="px-3 py-1.5 text-[10px] font-mono font-medium uppercase tracking-wider text-slate-400 border-b border-border flex items-center justify-between bg-surface-muted">
                <span>Inverted Index Suggestions</span>
                <span className="text-slate-500">↑↓ to navigate · Enter to select</span>
              </div>
              <ul className="divide-y divide-border">
                {suggestions.map((item, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className="px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 hover:bg-surface-elevated hover:text-slate-900 dark:hover:text-white cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Search className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="font-mono text-xs">{item}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">term</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quick Example Query Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5 text-xs">
          <span className="text-slate-500 font-mono text-[11px] mr-1">Sample Queries:</span>
          {EXAMPLE_QUERIES.map((example, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(example);
                handleSearch(1, example);
              }}
              className="px-2 py-0.5 rounded bg-surface border border-border text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500 transition-colors font-mono text-[11px]"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* ── IR Query Engine Inspector (Structured AST & Telemetry) ── */}
      {searchResponse && (
        <div className="surface-card rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              <Cpu className="h-3.5 w-3.5 text-primary-light" />
              <span className="text-slate-500 dark:text-slate-400">Tokens:</span>
              {searchResponse.query.processed_tokens.length > 0 ? (
                searchResponse.query.processed_tokens.map((token, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 rounded bg-surface-muted border border-border text-slate-700 dark:text-slate-200 font-mono text-[10px]"
                  >
                    {token}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 dark:text-slate-500">none</span>
              )}
            </div>

            {/* Natural Language Extracted Filters */}
            {nlData && (nlData.max_price !== null || nlData.min_price !== null || nlData.category_hint !== null) && (
              <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-border">
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">NL Filters:</span>
                {nlData.category_hint && (
                  <span className="px-1.5 py-0.5 rounded bg-surface-muted border border-indigo-800/60 text-indigo-600 dark:text-indigo-300 font-mono text-[10px]">
                    category: {nlData.category_hint}
                  </span>
                )}
                {nlData.max_price !== null && (
                  <span className="px-1.5 py-0.5 rounded bg-surface-muted border border-emerald-800/60 text-emerald-600 dark:text-emerald-300 font-mono text-[10px]">
                    price ≤ ₹{nlData.max_price.toLocaleString("en-IN")}
                  </span>
                )}
                {nlData.min_price !== null && (
                  <span className="px-1.5 py-0.5 rounded bg-surface-muted border border-cyan-800/60 text-cyan-600 dark:text-cyan-300 font-mono text-[10px]">
                    price ≥ ₹{nlData.min_price.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
              <Clock className="h-3 w-3" />
              <span>{searchResponse.metadata.latency_ms.toFixed(2)} ms</span>
            </div>
            <span>•</span>
            <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300">
              <Database className="h-3 w-3 text-slate-400" />
              <span>{searchResponse.metadata.total_candidates} scored</span>
            </div>
            <span>•</span>
            <span className="uppercase text-slate-500 dark:text-slate-400">{mode}</span>
          </div>
        </div>
      )}

      {/* ── Main Layout: Sidebar Controls & Results ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar: Controls & Filters */}
        <div className="surface-card rounded-xl p-4 space-y-5">
          {/* Ranking Algorithm Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Zap className="h-3.5 w-3.5 text-primary-light" />
                <span>Ranking Model</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">4 Algorithms</span>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  id: "bm25",
                  name: "BM25 (Default)",
                  tag: "k₁=1.5, b=0.75",
                  desc: "Saturation + length normalization",
                  dot: "bg-emerald-500 dark:bg-emerald-400",
                },
                {
                  id: "hybrid",
                  name: "Hybrid Ranker",
                  tag: "0.8 BM25 + Field",
                  desc: "Convex sum with title field weighting",
                  dot: "bg-indigo-500 dark:bg-indigo-400",
                },
                {
                  id: "tfidf",
                  name: "TF-IDF",
                  tag: "Cosine Vector",
                  desc: "Sub-linear TF with log IDF weights",
                  dot: "bg-amber-500 dark:bg-amber-400",
                },
                {
                  id: "keyword",
                  name: "Keyword Match",
                  tag: "Weighted Sum",
                  desc: "Raw frequency counts on weighted fields",
                  dot: "bg-cyan-500 dark:bg-cyan-400",
                },
              ].map(({ id, name, tag, desc, dot }) => {
                const isSelected = mode === id;
                return (
                  <button
                    key={id}
                    onClick={() => setMode(id as RankingMode)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                      isSelected
                        ? "bg-surface-elevated border-primary text-slate-900 dark:text-white"
                        : "bg-surface-muted border-border text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                        <span className="text-xs font-sans font-semibold text-slate-900 dark:text-slate-100">
                          {name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 px-1 rounded bg-surface border border-border">
                        {tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans leading-tight pl-3">
                      {desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Tag className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                <span>Categories</span>
              </label>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory("")}
                  className="text-[10px] font-mono text-primary hover:text-primary-hover dark:text-primary-light hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedCategory("")}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                  !selectedCategory
                    ? "bg-primary text-white font-medium"
                    : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-muted"
                }`}
              >
                <span>All Categories</span>
                <span className="text-[10px] font-mono opacity-80">510</span>
              </button>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? "" : cat.slug)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-surface-elevated text-primary dark:text-primary-light border border-primary/40 font-medium"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-muted"
                    }`}
                  >
                    <span className="truncate mr-2">{cat.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{cat.product_count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="pt-4 border-t border-border">
            <label className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
              Price Range (₹)
            </label>

            <div className="grid grid-cols-2 gap-1 mb-2.5">
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
                    className={`px-2 py-1 rounded text-[10px] font-mono text-center border transition-colors ${
                      isPresetActive
                        ? "bg-surface-elevated border-primary text-slate-900 dark:text-white font-semibold"
                        : "bg-surface-muted border-border text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mb-0.5 block">Min (₹)</span>
                <input
                  type="number"
                  value={minPrice !== undefined ? minPrice : ""}
                  onChange={(e) =>
                    setMinPrice(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="0"
                  className="w-full bg-surface-muted border border-border rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mb-0.5 block">Max (₹)</span>
                <input
                  type="number"
                  value={maxPrice !== undefined ? maxPrice : ""}
                  onChange={(e) =>
                    setMaxPrice(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="50000"
                  className="w-full bg-surface-muted border border-border rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            <button
              onClick={() => handleSearch(1)}
              className="w-full py-1.5 bg-surface hover:bg-surface-elevated border border-border text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-medium rounded transition-colors"
            >
              Apply Filter
            </button>
          </div>

          {/* Reset All */}
          <button
            onClick={handleResetFilters}
            className="w-full py-1.5 rounded border border-border text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-surface text-xs font-medium transition-colors flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reset Filters</span>
          </button>
        </div>

        {/* Right Section: Results Header & Results Display */}
        <div className="lg:col-span-3 space-y-4">
          {/* Results Action Bar */}
          <div className="surface-card rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                {searchResponse ? searchResponse.pagination.total_results : 0}
              </span>
              <span className="text-slate-500 dark:text-slate-400">products matched</span>
            </div>

            <div className="flex items-center space-x-3">
              {/* Sort By Dropdown */}
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="hidden sm:inline font-mono text-[11px]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-surface border border-border rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary font-sans"
                >
                  <option value="score">Relevance Score</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Rating: Highest</option>
                </select>
              </div>

              {/* View Switch: Grid vs Dense Table */}
              <div className="flex items-center p-0.5 rounded bg-surface-muted border border-border">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1 rounded transition-colors ${
                    viewMode === "grid"
                      ? "bg-surface-elevated text-slate-900 dark:text-white border border-border"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1 rounded transition-colors ${
                    viewMode === "list"
                      ? "bg-surface-elevated text-slate-900 dark:text-white border border-border"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="Tabular IR View"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Fallback Warning if triggered */}
          {searchResponse?.metadata.fallback_applied && (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs flex items-center space-x-2.5">
              <span className="font-semibold">Fallback Applied:</span>
              <span className="text-amber-300/90 font-sans">
                No exact conjunctive matches found. Engine relaxed query constraints to match highest IDF terms.
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-rose-300 text-xs text-center">
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="surface-card rounded-xl p-4 animate-skeleton space-y-3"
                >
                  <div className="h-4 bg-white/[0.05] rounded w-1/3"></div>
                  <div className="h-36 bg-white/[0.05] rounded-lg"></div>
                  <div className="h-4 bg-white/[0.05] rounded w-3/4"></div>
                  <div className="h-3 bg-white/[0.05] rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {/* Results Grid View */}
          {!loading && displayResults.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayResults.map((item) => (
                <ProductCard
                  key={item.product.id}
                  item={item}
                  onSelect={(product) => setSelectedProduct(product)}
                />
              ))}
            </div>
          )}

          {/* Results List View (Tabular IR View) */}
          {!loading && displayResults.length > 0 && viewMode === "list" && (
            <div className="surface-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-muted text-slate-500 dark:text-slate-400 font-mono font-medium uppercase tracking-wider border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-12">Rank</th>
                      <th className="py-2.5 px-3 font-sans">Product</th>
                      <th className="py-2.5 px-3 font-mono">Category</th>
                      <th className="py-2.5 px-3 font-mono">Score</th>
                      <th className="py-2.5 px-3 font-mono">Price</th>
                      <th className="py-2.5 px-3">Rating</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface/30">
                    {displayResults.map((item) => {
                      const { rank, score, product } = item;
                      const imageUrl = getProductImage(product);
                      return (
                        <tr
                          key={product.id}
                          onClick={() => setSelectedProduct(product)}
                          className="hover:bg-surface-elevated/70 cursor-pointer transition-colors"
                        >
                          <td className="py-2 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            #{rank}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center space-x-2.5">
                              <img
                                src={imageUrl}
                                alt={product.name}
                                onError={(e) => {
                                  e.currentTarget.src = FALLBACK_IMAGE;
                                }}
                                className="h-8 w-8 object-contain rounded bg-surface-well border border-border p-0.5 flex-shrink-0"
                              />
                              <div>
                                <div className="font-sans font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                                  {product.name}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                  {product.brand} · Doc #{product.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            {product.category?.name || "General"}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {score.toFixed(4)}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            ₹{product.price.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-300 font-mono text-xs">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{product.rating.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(product);
                              }}
                              className="px-2 py-0.5 rounded bg-surface border border-border hover:border-slate-400 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-[11px] font-mono transition-colors"
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

          {/* Empty Results State */}
          {!loading && searchResponse && searchResponse.results.length === 0 && (
            <div className="surface-card rounded-xl p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                <Search className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              </div>
              <h3 className="text-base font-sans font-bold text-slate-900 dark:text-white">No products found</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                No active documents matched "{query}" with the current filters.
                Try relaxing price bounds or switching ranking algorithm.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated text-slate-900 dark:text-white text-xs font-medium transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {searchResponse && searchResponse.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Page <span className="text-slate-900 dark:text-white font-semibold">{page}</span> of{" "}
                <span className="text-slate-900 dark:text-white font-semibold">
                  {searchResponse.pagination.total_pages}
                </span>{" "}
                ({searchResponse.pagination.total_results} total results)
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleSearch(page - 1)}
                  disabled={!searchResponse.pagination.has_prev}
                  className="px-2.5 py-1 rounded bg-surface border border-border text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
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
                          className={`h-7 w-7 rounded flex items-center justify-center font-medium transition-colors ${
                            page === p
                              ? "bg-primary text-white"
                              : "bg-surface text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-elevated border border-border"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    }
                    if (p === 2 && page > 3) {
                      return <span key={p} className="px-0.5 text-slate-400 dark:text-slate-600">...</span>;
                    }
                    if (
                      p === searchResponse.pagination.total_pages - 1 &&
                      page < searchResponse.pagination.total_pages - 2
                    ) {
                      return <span key={p} className="px-0.5 text-slate-400 dark:text-slate-600">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => handleSearch(page + 1)}
                  disabled={!searchResponse.pagination.has_next}
                  className="px-2.5 py-1 rounded bg-surface border border-border text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-elevated disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
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
