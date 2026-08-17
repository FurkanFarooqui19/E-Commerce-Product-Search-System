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
  Info,
} from "lucide-react";
import { searchProducts, getSuggestions, getCategories } from "../api/client";
import type { SearchResponse, Category, Product, RankingMode } from "../types";
import { ProductCard } from "../components/ProductCard";
import { ProductDetailModal } from "../components/ProductDetailModal";

const EXAMPLE_QUERIES = [
  "wireless headphones under 3000",
  "noise cancelling headphones",
  "smartwatch fitness tracker",
  "air fryer kitchen appliance",
  "running shoes for women",
  "programming guide book",
];

export const SearchPage: React.FC = () => {
  // Query & state
  const [query, setQuery] = useState("wireless headphones");
  const [mode, setMode] = useState<RankingMode>("bm25");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [page, setPage] = useState<number>(1);

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

  // Fetch categories on mount
  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data.categories))
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  // Debounced autocomplete suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await getSuggestions(query, 5);
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Execute Search
  const handleSearch = async (pageNum: number = 1) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const data = await searchProducts({
        q: query,
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
  };

  // Initial search on mount
  useEffect(() => {
    handleSearch(1);
  }, [mode, selectedCategory]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(1);
    }
  };

  const handleSelectSuggestion = (s: string) => {
    setQuery(s);
    setShowSuggestions(false);
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
      {/* ── Search Hero & Input Section ── */}
      <div className="relative z-30 max-w-3xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Natural Language & Classical IR Engine</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Find products with <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">precision</span>
        </h1>

        {/* Search Input Bar with Autocomplete */}
        <div className="relative">
          <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900/90 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
            <div className="pl-4 text-slate-400">
              <Search className="h-5 w-5" />
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
              placeholder="Search by name, specs, price (e.g. 'wireless headphones under 2000')..."
              className="w-full py-4 px-3 bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
            />

            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1.5 mr-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => handleSearch(1)}
              disabled={loading}
              className="m-1.5 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Search</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 text-left">
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                Index Vocabulary Suggestions
              </div>
              <ul className="divide-y divide-slate-800/40">
                {suggestions.map((item, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleSelectSuggestion(item)}
                    className="px-4 py-2.5 text-sm text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span className="font-mono text-xs">{item}</span>
                    <span className="text-[11px] text-slate-500">Vocabulary Term</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quick Example Query Pills */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-400 font-medium mr-1">Try:</span>
          {EXAMPLE_QUERIES.map((example, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(example);
                setTimeout(() => handleSearch(1), 50);
              }}
              className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all font-mono text-[11px]"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* ── NL Query Parser Extraction Banner ── */}
      {nlData && (nlData.max_price !== null || nlData.min_price !== null || nlData.category_hint !== null) && (
        <div className="max-w-4xl mx-auto p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-indigo-400 flex-shrink-0" />
            <span className="font-semibold text-indigo-200">NL Parser Active:</span>
            <span className="text-slate-300">Extracted structured constraints automatically:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono">
            {nlData.category_hint && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Category: <b>{nlData.category_hint}</b>
              </span>
            )}
            {nlData.max_price !== null && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Max Price: <b>₹{nlData.max_price}</b>
              </span>
            )}
            {nlData.min_price !== null && (
              <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Min Price: <b>₹{nlData.min_price}</b>
              </span>
            )}
            {nlData.clean_query && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400">
                Clean Query: <b>"{nlData.clean_query}"</b>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Main Content: Sidebar Filters & Results ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Left Sidebar: Controls & Filters */}
        <div className="space-y-6 glass-panel rounded-3xl p-5 border border-slate-800">
          {/* Ranking Algorithm Switcher */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3 flex items-center justify-between">
              <span>Ranking Algorithm</span>
              <Info className="h-3.5 w-3.5 text-slate-500" />
            </label>
            <div className="space-y-1.5">
              {[
                { id: "bm25", name: "BM25", desc: "Best-match term saturation + length norm (Default)" },
                { id: "hybrid", name: "Hybrid (BM25 + Field)", desc: "Weighted combination with name bonus" },
                { id: "tfidf", name: "TF-IDF", desc: "Log IDF weighting + sub-linear TF" },
                { id: "keyword", name: "Keyword", desc: "Boolean term match frequency" },
              ].map(({ id, name, desc }) => {
                const isSelected = mode === id;
                return (
                  <button
                    key={id}
                    onClick={() => setMode(id as RankingMode)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500 text-white"
                        : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-bold ${isSelected ? "text-indigo-300" : ""}`}>
                        {name}
                      </span>
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-indigo-400 shadow-glow"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Categories
              </label>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory("")}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedCategory("")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                  !selectedCategory
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <span>All Categories</span>
                <span className="text-[11px] text-slate-500">510</span>
              </button>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? "" : cat.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[11px] text-slate-500">{cat.product_count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="pt-4 border-t border-slate-800">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
              Price Range (₹)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <span className="text-[10px] text-slate-500 mb-1 block">Min (₹)</span>
                <input
                  type="number"
                  value={minPrice !== undefined ? minPrice : ""}
                  onChange={(e) =>
                    setMinPrice(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 mb-1 block">Max (₹)</span>
                <input
                  type="number"
                  value={maxPrice !== undefined ? maxPrice : ""}
                  onChange={(e) =>
                    setMaxPrice(e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="150000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
            <button
              onClick={() => handleSearch(1)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              Apply Price Filter
            </button>
          </div>

          {/* Reset All */}
          <button
            onClick={handleResetFilters}
            className="w-full py-2 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 text-xs font-medium transition-colors flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>

        {/* Right Section: Results Grid & Telemetry */}
        <div className="lg:col-span-3 space-y-6">
          {/* Telemetry Header */}
          {searchResponse && (
            <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs border border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-white text-sm">
                  {searchResponse.pagination.total_results} Products Found
                </span>
                <span className="text-slate-500">•</span>
                <div className="flex items-center space-x-1.5 text-cyan-400 font-mono">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{searchResponse.metadata.latency_ms.toFixed(2)} ms</span>
                </div>
                <span className="text-slate-500">•</span>
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <Database className="h-3.5 w-3.5" />
                  <span>{searchResponse.metadata.total_candidates} Candidates Scored</span>
                </div>
              </div>

              {/* Tokens Pill */}
              <div className="flex items-center space-x-2 overflow-x-auto">
                <span className="text-slate-500 font-mono text-[11px]">Tokens:</span>
                {searchResponse.query.processed_tokens.map((token, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-[11px]"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fallback Warning if triggered */}
          {searchResponse?.metadata.fallback_applied && (
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-400" />
              <span>
                <b>Fallback Applied:</b> Zero direct matches; results relaxed to lowest-IDF token matches.
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-800/50 text-rose-300 text-center space-y-2">
              <p className="font-semibold">{error}</p>
              <p className="text-xs text-rose-400">Please try adjusting your search terms or filters.</p>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="glass-panel rounded-2xl p-5 animate-pulse space-y-4 border border-slate-800"
                >
                  <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                  <div className="h-5 bg-slate-800 rounded w-3/4"></div>
                  <div className="h-10 bg-slate-800 rounded"></div>
                  <div className="h-6 bg-slate-800 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {/* Products Grid */}
          {!loading && searchResponse && searchResponse.results.length > 0 && (
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

          {/* Empty Results */}
          {!loading && searchResponse && searchResponse.results.length === 0 && (
            <div className="glass-panel rounded-3xl p-12 text-center space-y-3 border border-slate-800">
              <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">No products found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No matching active products found for "{query}" with the current filters.
              </p>
            </div>
          )}

          {/* Pagination Bar */}
          {searchResponse && searchResponse.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-800/80">
              <div className="text-xs text-slate-400">
                Showing page <span className="font-mono text-white font-bold">{page}</span> of{" "}
                <span className="font-mono text-white font-bold">
                  {searchResponse.pagination.total_pages}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSearch(page - 1)}
                  disabled={!searchResponse.pagination.has_prev}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1"
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
                          className={`h-8 w-8 rounded-lg flex items-center justify-center font-semibold transition-colors ${
                            page === p
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800"
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
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1"
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
