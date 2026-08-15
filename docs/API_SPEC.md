# API Specification
# E-Commerce Product Search System

**Version:** 1.0  
**Date:** 2026-08-15  
**Status:** Approved — Single Source of Truth  
**Base URL:** `http://localhost:8000/api/v1`  
**Format:** REST, JSON  
**References:** PRD.md, ARCHITECTURE.md, DATABASE.md

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Common Schemas](#2-common-schemas)
3. [Error Handling](#3-error-handling)
4. [Endpoints](#4-endpoints)
   - [Search](#41-search)
   - [Products](#42-products)
   - [Categories](#43-categories)
   - [Evaluation](#44-evaluation)
   - [Health](#45-health)
5. [Pagination](#5-pagination)
6. [Filtering Reference](#6-filtering-reference)
7. [Search Modes Reference](#7-search-modes-reference)
8. [Rate Limiting](#8-rate-limiting)

---

## 1. API Conventions

| Convention | Rule |
|-----------|------|
| Protocol | HTTP/1.1, HTTPS in production |
| Encoding | UTF-8 |
| Content-Type | `application/json` |
| Authentication | None (MVP) |
| Versioning | URL-based (`/api/v1/`) |
| HTTP Methods | GET for reads, POST for evaluation/mutation |
| Timestamps | ISO 8601 (`2026-08-15T10:30:00Z`) |
| IDs | Integer, auto-incremented |
| Prices | Float (INR) |
| Scores | Float [0.0, 1.0] (normalized) |

### Status Code Usage

| Code | Meaning |
|------|---------|
| 200 | OK — request succeeded |
| 201 | Created — resource created |
| 400 | Bad Request — invalid parameters |
| 404 | Not Found — resource not found |
| 422 | Unprocessable Entity — validation error |
| 500 | Internal Server Error |
| 503 | Service Unavailable — index not ready |

---

## 2. Common Schemas

### 2.1 Specification Object

```json
{
  "key": "ram",
  "value": "16GB DDR4"
}
```

### 2.2 Product Object (Full)

```json
{
  "id": 1,
  "name": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
  "description": "Industry-leading noise cancellation...",
  "brand": "Sony",
  "category": "Electronics",
  "category_id": 1,
  "price": 29990.00,
  "stock": 45,
  "rating": 4.8,
  "image_url": "https://example.com/images/sony-wh1000xm5.jpg",
  "is_active": true,
  "specifications": [
    {"key": "battery_life", "value": "30 hours"},
    {"key": "connectivity", "value": "Bluetooth 5.2"}
  ],
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-15T10:30:00Z"
}
```

### 2.3 Search Result Item

```json
{
  "rank": 1,
  "score": 0.923,
  "product": { "...": "Product Object (Full)" }
}
```

### 2.4 Pagination Metadata

```json
{
  "page": 1,
  "page_size": 10,
  "total_results": 47,
  "total_pages": 5,
  "has_next": true,
  "has_prev": false
}
```

### 2.5 Error Object

```json
{
  "error": {
    "code": "INVALID_MODE",
    "message": "Invalid search mode 'xyz'. Valid values: keyword, tfidf, bm25, hybrid",
    "field": "mode"
  }
}
```

---

## 3. Error Handling

### 3.1 Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INVALID_MODE` | 400 | Invalid `mode` parameter value |
| `INVALID_PAGE` | 400 | `page` < 1 |
| `INVALID_PAGE_SIZE` | 400 | `page_size` outside [1, 100] |
| `INVALID_PRICE_RANGE` | 400 | `min_price` > `max_price` |
| `MISSING_QUERY` | 400 | `q` parameter is empty |
| `PRODUCT_NOT_FOUND` | 404 | Product ID does not exist |
| `CATEGORY_NOT_FOUND` | 404 | Category not found |
| `INDEX_NOT_READY` | 503 | Inverted index not yet built |
| `EVALUATION_SET_NOT_FOUND` | 404 | Evaluation query set not found |
| `VALIDATION_ERROR` | 422 | Pydantic schema validation failure |

### 3.2 Error Response Format

All error responses use this envelope:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "field": "string | null"
  }
}
```

---

## 4. Endpoints

---

### 4.1 Search

#### `GET /api/v1/search`

Search products using the specified ranking algorithm with optional filters.

**Request Parameters:**

| Parameter | Type | Required | Default | Validation | Description |
|-----------|------|---------|---------|-----------|-------------|
| `q` | string | ✅ Yes | — | Non-empty, max 500 chars | Search query |
| `mode` | string | No | `bm25` | One of: `keyword`, `tfidf`, `bm25`, `hybrid` | Ranking algorithm |
| `category` | string | No | `null` | Max 100 chars | Filter by category (partial, case-insensitive) |
| `min_price` | float | No | `null` | ≥ 0 | Minimum price filter (inclusive) |
| `max_price` | float | No | `null` | ≥ 0, ≥ min_price | Maximum price filter (inclusive) |
| `page` | integer | No | `1` | ≥ 1 | Page number |
| `page_size` | integer | No | `10` | 1–100 | Results per page |

**Example Request:**

```
GET /api/v1/search?q=wireless+headphones&mode=bm25&max_price=30000&page=1&page_size=10
```

**Success Response — 200 OK:**

```json
{
  "query": {
    "raw": "wireless headphones",
    "processed_tokens": ["wireless", "headphon"],
    "mode": "bm25",
    "filters_applied": {
      "category": null,
      "min_price": null,
      "max_price": 30000.0
    },
    "nl_extracted": {
      "max_price": null,
      "min_price": null,
      "category_hint": null
    }
  },
  "results": [
    {
      "rank": 1,
      "score": 0.923,
      "product": {
        "id": 1,
        "name": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
        "description": "Industry-leading noise cancellation...",
        "brand": "Sony",
        "category": "Electronics",
        "category_id": 1,
        "price": 29990.00,
        "stock": 45,
        "rating": 4.8,
        "image_url": null,
        "is_active": true,
        "specifications": [
          {"key": "battery_life", "value": "30 hours"},
          {"key": "connectivity", "value": "Bluetooth 5.2"}
        ],
        "created_at": "2026-01-15T10:30:00Z",
        "updated_at": "2026-01-15T10:30:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total_results": 47,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "metadata": {
    "latency_ms": 42.3,
    "total_candidates": 47,
    "fallback_applied": false,
    "fallback_reason": null,
    "low_confidence": false,
    "index_size": 510
  }
}
```

**Empty Results Response — 200 OK:**

```json
{
  "query": { "...": "..." },
  "results": [],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total_results": 0,
    "total_pages": 0,
    "has_next": false,
    "has_prev": false
  },
  "metadata": {
    "latency_ms": 8.1,
    "total_candidates": 0,
    "fallback_applied": true,
    "fallback_reason": "No results found after relaxing all filters",
    "low_confidence": false,
    "index_size": 510
  }
}
```

**Error Responses:**

| Scenario | Status | Code |
|---------|--------|------|
| `q` is empty | 400 | `MISSING_QUERY` |
| Invalid `mode` | 400 | `INVALID_MODE` |
| `min_price` > `max_price` | 400 | `INVALID_PRICE_RANGE` |
| `page` < 1 | 400 | `INVALID_PAGE` |
| Index not ready | 503 | `INDEX_NOT_READY` |

---

#### `GET /api/v1/search/compare`

Run the same query through all specified modes and return results for side-by-side comparison. Useful for evaluation and debugging.

**Request Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|---------|---------|-------------|
| `q` | string | ✅ Yes | — | Search query |
| `modes` | string | No | `keyword,tfidf,bm25` | Comma-separated list of modes |
| `top_k` | integer | No | `10` | Number of results per mode |
| `category` | string | No | `null` | Category filter |
| `min_price` | float | No | `null` | Min price filter |
| `max_price` | float | No | `null` | Max price filter |

**Example Request:**

```
GET /api/v1/search/compare?q=laptop+for+students&modes=keyword,tfidf,bm25&top_k=5
```

**Success Response — 200 OK:**

```json
{
  "query": "laptop for students",
  "processed_tokens": ["laptop", "student"],
  "results": {
    "keyword": [
      {"rank": 1, "score": 0.800, "product_id": 42, "product_name": "..."},
      {"rank": 2, "score": 0.600, "product_id": 17, "product_name": "..."}
    ],
    "tfidf": [
      {"rank": 1, "score": 0.910, "product_id": 17, "product_name": "..."}
    ],
    "bm25": [
      {"rank": 1, "score": 0.950, "product_id": 17, "product_name": "..."}
    ]
  },
  "latency_ms": {
    "keyword": 5.2,
    "tfidf": 12.4,
    "bm25": 14.1
  }
}
```

---

### 4.2 Products

#### `GET /api/v1/products/{id}`

Retrieve a single product by ID.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Product ID |

**Success Response — 200 OK:**

```json
{
  "product": {
    "id": 1,
    "name": "Sony WH-1000XM5...",
    "description": "...",
    "brand": "Sony",
    "category": "Electronics",
    "category_id": 1,
    "price": 29990.00,
    "stock": 45,
    "rating": 4.8,
    "image_url": null,
    "is_active": true,
    "specifications": [...],
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-15T10:30:00Z"
  }
}
```

**Error: 404 Not Found:**

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product with id 9999 not found",
    "field": "id"
  }
}
```

---

#### `GET /api/v1/products`

List all products with optional filters and pagination (admin/dev use).

**Request Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category_id` | integer | `null` | Filter by category ID |
| `min_price` | float | `null` | Min price filter |
| `max_price` | float | `null` | Max price filter |
| `brand` | string | `null` | Filter by brand (exact, case-insensitive) |
| `is_active` | boolean | `true` | Include inactive products |
| `page` | integer | `1` | Page number |
| `page_size` | integer | `20` | Results per page |

**Success Response — 200 OK:**

```json
{
  "products": [ { "...": "Product Object" } ],
  "pagination": { "...": "Pagination Metadata" }
}
```

---

### 4.3 Categories

#### `GET /api/v1/categories`

List all available product categories.

**Request Parameters:** None

**Success Response — 200 OK:**

```json
{
  "categories": [
    {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics",
      "description": "Consumer electronics, gadgets, and accessories",
      "parent_id": null,
      "product_count": 100
    },
    {
      "id": 2,
      "name": "Clothing & Apparel",
      "slug": "clothing-apparel",
      "description": "Fashion and clothing for all ages",
      "parent_id": null,
      "product_count": 80
    }
  ],
  "total": 8
}
```

---

#### `GET /api/v1/categories/{id}`

Retrieve a single category by ID, including its products count.

**Success Response — 200 OK:**

```json
{
  "category": {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "description": "Consumer electronics, gadgets, and accessories",
    "parent_id": null,
    "product_count": 100
  }
}
```

---

### 4.4 Evaluation

#### `POST /api/v1/evaluate`

Run evaluation benchmarks against a query set and return metric scores per algorithm.

**Request Body:**

```json
{
  "query_set_id": null,
  "queries": [
    {
      "query_text": "wireless headphones",
      "relevant_product_ids": [1, 4, 12],
      "graded_judgments": [
        {"product_id": 1, "relevance": 3},
        {"product_id": 4, "relevance": 3},
        {"product_id": 12, "relevance": 2}
      ]
    }
  ],
  "modes": ["keyword", "tfidf", "bm25"],
  "k": 10,
  "filters": {
    "category": null,
    "min_price": null,
    "max_price": null
  }
}
```

**Field Notes:**

| Field | Notes |
|-------|-------|
| `query_set_id` | If provided, loads queries from `evaluation_queries` table; `queries` field is ignored |
| `queries` | Inline query list (used when `query_set_id` is null) |
| `graded_judgments` | Optional graded judgments for NDCG; if absent, binary relevance is assumed |
| `k` | Cutoff for Precision@K, Recall@K, NDCG@K |
| `modes` | Which algorithms to evaluate |

**Success Response — 200 OK:**

```json
{
  "evaluation_report": {
    "k": 10,
    "total_queries": 50,
    "modes": {
      "keyword": {
        "precision_at_k": 0.44,
        "recall_at_k": 0.38,
        "mrr": 0.52,
        "ndcg_at_k": 0.41,
        "avg_latency_ms": 4.2,
        "per_query": [
          {
            "query": "wireless headphones",
            "precision_at_k": 0.60,
            "recall_at_k": 0.50,
            "mrr": 1.0,
            "ndcg_at_k": 0.71,
            "latency_ms": 3.8
          }
        ]
      },
      "tfidf": {
        "precision_at_k": 0.57,
        "recall_at_k": 0.49,
        "mrr": 0.64,
        "ndcg_at_k": 0.55,
        "avg_latency_ms": 11.7,
        "per_query": []
      },
      "bm25": {
        "precision_at_k": 0.68,
        "recall_at_k": 0.61,
        "mrr": 0.79,
        "ndcg_at_k": 0.72,
        "avg_latency_ms": 14.1,
        "per_query": []
      }
    },
    "winner": "bm25",
    "comparison_summary": {
      "bm25_vs_keyword_ndcg_improvement": "+75.6%",
      "bm25_vs_tfidf_ndcg_improvement": "+30.9%"
    }
  }
}
```

---

#### `GET /api/v1/evaluate/query-sets`

List available evaluation query sets stored in the database.

**Success Response — 200 OK:**

```json
{
  "query_sets": [
    {
      "id": 1,
      "name": "General Search Benchmark",
      "query_count": 50,
      "created_at": "2026-08-01T00:00:00Z"
    }
  ]
}
```

---

### 4.5 Health

#### `GET /api/v1/health`

Check API and index health status.

**Success Response — 200 OK:**

```json
{
  "status": "healthy",
  "index": {
    "ready": true,
    "document_count": 510,
    "vocabulary_size": 8432,
    "built_at": "2026-08-15T06:00:00Z"
  },
  "database": {
    "connected": true,
    "product_count": 510
  },
  "version": "1.0.0"
}
```

**Degraded Response — 503 Service Unavailable:**

```json
{
  "status": "degraded",
  "index": {
    "ready": false,
    "error": "Index file not found. Run: python scripts/build_index.py"
  },
  "database": {
    "connected": true,
    "product_count": 510
  },
  "version": "1.0.0"
}
```

---

## 5. Pagination

All list endpoints support cursor-free, page-based pagination.

### 5.1 Parameters

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | — | Page number (1-indexed) |
| `page_size` | integer | 10 | 100 | Number of results per page |

### 5.2 Response Envelope

```json
{
  "pagination": {
    "page": 2,
    "page_size": 10,
    "total_results": 47,
    "total_pages": 5,
    "has_next": true,
    "has_prev": true
  }
}
```

### 5.3 Edge Cases

| Case | Behavior |
|------|---------|
| `page` beyond total pages | Returns empty `results` array, valid pagination metadata |
| `page_size=0` | 400 `INVALID_PAGE_SIZE` |
| `page_size > 100` | 400 `INVALID_PAGE_SIZE` |

---

## 6. Filtering Reference

| Filter | Parameter | Type | Behavior |
|--------|-----------|------|---------|
| Category | `category` | string | Case-insensitive partial match (`LIKE %value%`) |
| Min Price | `min_price` | float | `price >= min_price` (inclusive) |
| Max Price | `max_price` | float | `price <= max_price` (inclusive) |

Filters are AND-combined. All filters are optional. When combined with NL-extracted entities from the query string, explicit API parameters take precedence.

---

## 7. Search Modes Reference

| Mode | Value | Description |
|------|-------|-------------|
| Keyword | `keyword` | Boolean term matching, score = matched token count |
| TF-IDF | `tfidf` | TF-IDF scoring with log-TF and smooth IDF |
| BM25 | `bm25` | BM25 (default; k1=1.5, b=0.75) |
| Hybrid | `hybrid` | BM25 + field weight bonus (Phase 4) |

The default mode is `bm25`. An invalid mode returns `400 INVALID_MODE`.

---

## 8. Rate Limiting

**MVP:** No rate limiting is implemented.  
**Phase 4:** Rate limiting of 100 requests/minute per IP using `slowapi` (FastAPI-compatible).

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Limit: 100/minute.",
    "field": null
  }
}
```
