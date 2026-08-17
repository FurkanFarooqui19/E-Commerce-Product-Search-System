export type RankingMode = "keyword" | "tfidf" | "bm25" | "hybrid";

export interface Specification {
  key: string;
  value: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  brand: string;
  category: Category;
  category_id: number;
  price: number;
  stock: number;
  rating: number;
  image_url: string;
  is_active: boolean;
  specifications: Specification[];
  created_at: string;
  updated_at: string;
}

export interface SearchResultItem {
  rank: number;
  score: number;
  product: Product;
}

export interface QueryMeta {
  raw: string;
  processed_tokens: string[];
  mode: RankingMode;
  filters_applied: {
    category: string | null;
    min_price: number | null;
    max_price: number | null;
  };
  nl_extracted?: {
    category_hint: string | null;
    min_price: number | null;
    max_price: number | null;
    clean_query: string;
  };
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_results: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SearchMetadata {
  latency_ms: number;
  total_candidates: number;
  fallback_applied: boolean;
  fallback_reason?: string | null;
  low_confidence: boolean;
  index_size: number;
}

export interface SearchResponse {
  query: QueryMeta;
  results: SearchResultItem[];
  pagination: PaginationMeta;
  metadata: SearchMetadata;
}

export interface SuggestResponse {
  query: string;
  suggestions: string[];
  total: number;
}

export interface CompareResultItem {
  rank: number;
  product_id: number;
  product_name: string;
  score: number;
  price?: number;
  category?: string;
}

export interface CompareResponse {
  query: string;
  processed_tokens: string[];
  results: {
    keyword?: CompareResultItem[];
    tfidf?: CompareResultItem[];
    bm25?: CompareResultItem[];
    hybrid?: CompareResultItem[];
  };
  latency_ms: {
    keyword?: number;
    tfidf?: number;
    bm25?: number;
    hybrid?: number;
  };
}

export interface PerQueryMetrics {
  query_id?: number;
  query: string;
  precision_at_k: number;
  recall_at_k: number;
  mrr: number;
  ndcg_at_k: number;
  latency_ms: number;
}

export interface ModeMetrics {
  precision_at_k: number;
  recall_at_k: number;
  mrr: number;
  ndcg_at_k: number;
  avg_latency_ms: number;
  p95_latency_ms?: number;
  per_query: PerQueryMetrics[];
}

export interface EvaluationReport {
  k: number;
  total_queries: number;
  modes: {
    keyword: ModeMetrics;
    tfidf: ModeMetrics;
    bm25: ModeMetrics;
    hybrid: ModeMetrics;
  };
  winner: string;
  comparison_summary: {
    bm25_vs_keyword_ndcg_delta: number;
    bm25_vs_tfidf_ndcg_delta: number;
  };
}

export interface EvaluationResponse {
  status: string;
  evaluation_report: EvaluationReport;
}

export interface QuerySet {
  id: number;
  name: string;
  query_count: number;
  created_at: string;
}

export interface QuerySetsResponse {
  query_sets: QuerySet[];
}

export interface HealthResponse {
  status: string;
  index: {
    ready: boolean;
    document_count: number;
    vocabulary_size: number;
    built_at: string | null;
    note?: string;
  };
  database: {
    connected: boolean;
    product_count: number;
  };
  version: string;
}

export interface SearchLogItem {
  id: number;
  query_text: string;
  mode: string;
  result_count: number;
  latency_ms: number;
  fallback: boolean;
  created_at: string;
}

export interface LogsResponse {
  logs: SearchLogItem[];
  pagination: PaginationMeta;
}
