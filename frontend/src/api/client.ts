import type {
  SearchResponse,
  SuggestResponse,
  CompareResponse,
  Category,
  Product,
  EvaluationResponse,
  QuerySetsResponse,
  HealthResponse,
  LogsResponse,
  RankingMode,
} from "../types";

const API_BASE = "/api/v1";

export async function getHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function getCategories(): Promise<{ categories: Category[]; total: number }> {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error(`Failed to fetch categories: ${res.statusText}`);
  return res.json();
}

export async function getProductById(id: number): Promise<{ product: Product }> {
  const res = await fetch(`${API_BASE}/products/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch product #${id}: ${res.statusText}`);
  return res.json();
}

export interface SearchParams {
  q: string;
  mode?: RankingMode;
  category?: string;
  min_price?: number;
  max_price?: number;
  brand?: string;
  page?: number;
  page_size?: number;
}

export async function searchProducts(params: SearchParams): Promise<SearchResponse> {
  const url = new URL(`${window.location.origin}${API_BASE}/search`);
  url.searchParams.set("q", params.q);
  if (params.mode) url.searchParams.set("mode", params.mode);
  if (params.category) url.searchParams.set("category", params.category);
  if (params.min_price !== undefined && params.min_price !== null) {
    url.searchParams.set("min_price", String(params.min_price));
  }
  if (params.max_price !== undefined && params.max_price !== null) {
    url.searchParams.set("max_price", String(params.max_price));
  }
  if (params.brand) url.searchParams.set("brand", params.brand);
  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.page_size) url.searchParams.set("page_size", String(params.page_size));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Search failed with code ${res.status}`);
  }
  return res.json();
}

export async function getSuggestions(q: string, limit: number = 5): Promise<SuggestResponse> {
  if (!q.trim()) return { query: q, suggestions: [], total: 0 };
  const res = await fetch(`${API_BASE}/search/suggest?q=${encodeURIComponent(q)}&limit=${limit}`);
  if (!res.ok) return { query: q, suggestions: [], total: 0 };
  return res.json();
}

export interface CompareParams {
  q: string;
  modes?: string;
  top_k?: number;
  category?: string;
  min_price?: number;
  max_price?: number;
}

export async function compareAlgorithms(params: CompareParams): Promise<CompareResponse> {
  const url = new URL(`${window.location.origin}${API_BASE}/search/compare`);
  url.searchParams.set("q", params.q);
  if (params.modes) url.searchParams.set("modes", params.modes);
  if (params.top_k) url.searchParams.set("top_k", String(params.top_k));
  if (params.category) url.searchParams.set("category", params.category);
  if (params.min_price) url.searchParams.set("min_price", String(params.min_price));
  if (params.max_price) url.searchParams.set("max_price", String(params.max_price));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Compare failed: ${res.statusText}`);
  }
  return res.json();
}

export async function getQuerySets(): Promise<QuerySetsResponse> {
  const res = await fetch(`${API_BASE}/evaluate/query-sets`);
  if (!res.ok) throw new Error("Failed to load query sets");
  return res.json();
}

export async function runEvaluation(
  querySetId: number = 1,
  modes: string[] = ["keyword", "tfidf", "bm25", "hybrid"],
  k: number = 10
): Promise<EvaluationResponse> {
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query_set_id: querySetId,
      modes,
      k,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Evaluation run failed");
  }
  return res.json();
}

export async function getSearchLogs(
  page: number = 1,
  pageSize: number = 20,
  mode?: string
): Promise<LogsResponse> {
  const url = new URL(`${window.location.origin}${API_BASE}/admin/logs`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));
  if (mode) url.searchParams.set("mode", mode);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to load search logs");
  return res.json();
}
