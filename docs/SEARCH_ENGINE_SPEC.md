# Search Engine Specification
# E-Commerce Product Search System

**Version:** 1.0  
**Date:** 2026-08-15  
**Status:** Approved — Single Source of Truth  
**References:** PRD.md, ARCHITECTURE.md

---

## Table of Contents

1. [Search Pipeline Overview](#1-search-pipeline-overview)
2. [Query Preprocessing](#2-query-preprocessing)
3. [Inverted Index](#3-inverted-index)
4. [Keyword Search](#4-keyword-search)
5. [TF-IDF Ranking](#5-tf-idf-ranking)
6. [BM25 Ranking](#6-bm25-ranking)
7. [Field Weighting](#7-field-weighting)
8. [Natural-Language Query Parsing](#8-natural-language-query-parsing)
9. [Filtering](#9-filtering)
10. [Result Ranking & Fusion](#10-result-ranking--fusion)
11. [Fallback Logic](#11-fallback-logic)
12. [Indexing Pipeline](#12-indexing-pipeline)
13. [Algorithm Parameters Reference](#13-algorithm-parameters-reference)

---

## 1. Search Pipeline Overview

Every search request passes through a strictly ordered pipeline. Stages are sequential; each stage's output is the next stage's input.

```
Raw Query String
      │
      ▼
┌─────────────────────┐
│  1. NL Query Parser │  ← extracts price/category intents
└─────────────────────┘
      │  structured_query
      ▼
┌─────────────────────┐
│  2. Preprocessor    │  ← tokenize, lowercase, stopwords, stem
└─────────────────────┘
      │  token_list
      ▼
┌─────────────────────┐
│  3. Filter Builder  │  ← category, price range → SQL WHERE clause
└─────────────────────┘
      │  candidate_set (filtered product IDs)
      ▼
┌─────────────────────┐
│  4. Ranker          │  ← Keyword | TF-IDF | BM25  (mode param)
└─────────────────────┘
      │  scored_results [(product_id, score), ...]
      ▼
┌─────────────────────┐
│  5. Result Fetcher  │  ← fetch product details, paginate
└─────────────────────┘
      │
      ▼
   JSON Response
```

**Stage responsibilities are strictly isolated.** The Ranker does not access the database directly; it operates on the pre-filtered candidate set and the in-memory index.

---

## 2. Query Preprocessing

All queries (from any search mode) pass through the same preprocessing pipeline.

### 2.1 Steps

| Step | Description | Tool/Library |
|------|------------|-------------|
| 1. Lowercasing | Convert entire query to lowercase | Python built-in |
| 2. Tokenization | Split on whitespace and punctuation | `re.split(r'[^\w]+', ...)` |
| 3. Stopword Removal | Remove common English stopwords | NLTK `stopwords.words('english')` + custom e-commerce list |
| 4. Stemming | Reduce terms to their stem | NLTK `PorterStemmer` |
| 5. Empty Check | If no tokens remain after processing, return empty result | — |

### 2.2 Custom E-Commerce Stopwords

In addition to standard NLTK stopwords, the following domain-specific stopwords are removed:

```
best, good, great, top, cheap, affordable, nice, perfect,
buy, get, find, looking, want, need, show, list, available
```

### 2.3 Preprocessing Example

| Stage | Output |
|-------|--------|
| Raw Query | `"Best wireless headphones under 2000"` |
| Lowercased | `"best wireless headphones under 2000"` |
| Tokenized | `["best", "wireless", "headphones", "under", "2000"]` |
| Stopword Removed | `["wireless", "headphones", "2000"]` |
| Stemmed | `["wireless", "headphon", "2000"]` |

> **Note:** Numeric tokens representing prices are extracted by the NL Parser *before* preprocessing and are not stemmed.

### 2.4 Index-Time Preprocessing

The same preprocessing pipeline is applied to every product field during index construction. This ensures query tokens and document tokens share the same vocabulary.

---

## 3. Inverted Index

### 3.1 Structure

The inverted index maps each processed term to a posting list:

```
{
  "term": {
    "doc_freq": int,          # number of documents containing this term
    "postings": {
      "product_id": {
        "fields": {
          "name": int,         # raw term frequency in name field
          "description": int,  # raw term frequency in description field
          "category": int,     # raw term frequency in category field
          "specs": int         # raw term frequency in specs field
        },
        "total_tf": int        # sum of tf across all fields (unweighted)
      },
      ...
    }
  },
  ...
}
```

### 3.2 Corpus Statistics

A separate `corpus_stats` dictionary is maintained alongside the index:

```python
corpus_stats = {
    "total_documents": int,
    "avg_doc_length": float,                   # average total tokens per document
    "avg_field_lengths": {                     # per-field average lengths
        "name": float,
        "description": float,
        "category": float,
        "specs": float
    },
    "doc_lengths": {product_id: int, ...},     # total tokens per document
    "field_lengths": {                         # per-field lengths per document
        product_id: {"name": int, "description": int, ...}
    }
}
```

### 3.3 Storage

- The inverted index is serialized to `data/index.pkl` using Python `pickle`.
- It is loaded into memory at application startup.
- Rebuild is triggered by the CLI command `python manage.py build_index`.

### 3.4 Index Build Complexity

- Time: **O(N × L)** where N = number of documents, L = average document length in tokens.
- Space: **O(V × D)** where V = vocabulary size, D = average postings per term.

---

## 4. Keyword Search

### 4.1 Definition

Keyword (Boolean) search returns all documents that contain **at least one** query token across any indexed field. There is no scoring beyond a binary match count.

### 4.2 Scoring Formula

```
keyword_score(d, Q) = Σ_{t ∈ Q} match(t, d)
```

where `match(t, d) = 1` if term `t` appears in document `d` (in any field), else `0`.

Results are sorted descending by `keyword_score`. Ties are broken by document creation date (newest first).

### 4.3 Behaviour

- All terms are OR-combined by default.
- A document with more matching query terms ranks higher.
- No term frequency or document length normalization is applied.
- This mode serves as the **baseline** for evaluation comparison.

---

## 5. TF-IDF Ranking

### 5.1 Term Frequency (TF)

Raw term frequency is normalized using the log-normalization formula to dampen the effect of very high raw frequencies:

```
tf(t, d) = 1 + log(1 + raw_tf(t, d))    if raw_tf > 0
           0                              otherwise
```

where `raw_tf(t, d)` is the total count of term `t` across all fields in document `d` (unweighted at this stage; field weighting is applied separately in §7).

### 5.2 Inverse Document Frequency (IDF)

Smooth IDF with Laplace-style add-one smoothing to prevent division-by-zero for terms appearing in every document:

```
idf(t) = log((N + 1) / (df(t) + 1)) + 1
```

where:
- `N` = total number of documents in corpus
- `df(t)` = number of documents containing term `t`

### 5.3 TF-IDF Score

```
tfidf_score(d, Q) = Σ_{t ∈ Q} [ tf(t, d) × idf(t) ]
```

### 5.4 Pre-Computation

TF-IDF weights are computed at index-build time and stored. At query time, the system looks up pre-computed values rather than recalculating.

---

## 6. BM25 Ranking

BM25 (Best Match 25, Robertson et al.) is the default and primary ranking algorithm.

### 6.1 BM25 Formula

```
BM25(d, Q) = Σ_{t ∈ Q} IDF(t) × [ tf(t,d) × (k1 + 1) / ( tf(t,d) + k1 × (1 - b + b × |d| / avgdl) ) ]
```

where:
- `tf(t, d)` = raw term frequency of term `t` in document `d` (field-weighted; see §7)
- `|d|` = total token count of document `d` (field-weighted document length)
- `avgdl` = average document length across the corpus
- `k1` = term frequency saturation parameter (default: **1.5**)
- `b` = length normalization parameter (default: **0.75**)

### 6.2 BM25 IDF

```
IDF(t) = log( (N - df(t) + 0.5) / (df(t) + 0.5) + 1 )
```

This is the Robertson-Sparck Jones IDF variant. The `+1` inside the log prevents negative IDF for very common terms.

### 6.3 Parameter Defaults & Tuning

| Parameter | Default | Range | Effect |
|-----------|---------|-------|--------|
| `k1` | 1.5 | 1.2–2.0 | Higher → more weight to raw TF; lower → faster saturation |
| `b` | 0.75 | 0.0–1.0 | Higher → more length normalization; 0 = no normalization |

Parameters are configurable via `config.py`. Evaluation scripts (see `SEARCH_EVALUATION.md`) grid-search these parameters.

### 6.4 Why BM25 Over TF-IDF

| Property | TF-IDF | BM25 |
|---------|--------|------|
| TF Saturation | None (linear TF) | Yes (asymptotic via k1) |
| Length Normalization | Cosine-based | Explicit via b parameter |
| IDF Smoothing | Log-based | Robertson IDF |
| Empirical Performance | Good | Consistently better on IR benchmarks |

BM25 is the default (`mode=bm25`).

---

## 7. Field Weighting

### 7.1 Rationale

A query match in the product `name` is a stronger relevance signal than a match in the `description`. Field weighting encodes this domain knowledge.

### 7.2 Field Weights

| Field | Weight | Justification |
|-------|--------|--------------|
| `name` | **3.0** | Most specific; exact intent match |
| `category` | **2.0** | Strong categorical signal |
| `description` | **1.5** | Informative but verbose |
| `specifications` | **1.0** | Detailed but highly specific |

### 7.3 Applying Field Weights

Field weights are applied at the **term frequency aggregation** stage, before scoring:

```python
weighted_tf(t, d) = Σ_f [ field_weight[f] × raw_tf(t, d, f) ]
```

This weighted TF is then used as the `tf(t, d)` input to both TF-IDF and BM25 formulas.

**Weighted document length** for BM25 normalization:

```python
weighted_doc_length(d) = Σ_f [ field_weight[f] × field_length(d, f) ]
weighted_avgdl = mean( weighted_doc_length(d) for all d )
```

### 7.4 Field Weight Configuration

Weights are stored in `config.py` and can be adjusted without rebuilding the index:

```python
FIELD_WEIGHTS = {
    "name": 3.0,
    "category": 2.0,
    "description": 1.5,
    "specifications": 1.0
}
```

---

## 8. Natural-Language Query Parsing

### 8.1 Purpose

The NL Parser extracts structured intent from free-form queries before preprocessing. It runs **before** the tokenizer so extracted entities are not damaged by stopword removal.

### 8.2 Extracted Entities

| Entity | Example Inputs | Extracted Value |
|--------|---------------|----------------|
| Price upper bound | "under 2000", "less than 1500", "below 3000" | `max_price=2000` |
| Price lower bound | "above 500", "more than 1000", "over 800" | `min_price=500` |
| Price range | "between 1000 and 5000" | `min_price=1000, max_price=5000` |
| Category hint | "shoes", "laptop", "headphones" (from category vocabulary) | `category=<matched_category>` |

### 8.3 Extraction Rules

**Price patterns (regex-based):**

```python
PRICE_PATTERNS = [
    (r'under\s+(\d+(?:\.\d+)?)',        'max_price'),
    (r'below\s+(\d+(?:\.\d+)?)',         'max_price'),
    (r'less\s+than\s+(\d+(?:\.\d+)?)',   'max_price'),
    (r'above\s+(\d+(?:\.\d+)?)',         'min_price'),
    (r'over\s+(\d+(?:\.\d+)?)',          'min_price'),
    (r'more\s+than\s+(\d+(?:\.\d+)?)',   'min_price'),
    (r'between\s+(\d+)\s+and\s+(\d+)',   'price_range'),
]
```

**Category vocabulary matching:**
- A known category list is loaded from the database at startup.
- Each query token (lowercased) is checked against this list.
- If a match is found, it is added to the structured query as a `category_hint`.
- Category hints augment (not replace) explicit `category` filter parameters.

### 8.4 NL Parser Output

```python
@dataclass
class StructuredQuery:
    raw_query: str
    clean_query: str        # raw_query with extracted entities removed
    min_price: float | None
    max_price: float | None
    category_hint: str | None
    tokens: list[str]       # populated after preprocessing
```

### 8.5 Conflict Resolution

If both the NL parser and explicit API parameters provide `min_price`/`max_price`, the **explicit API parameter takes precedence**.

---

## 9. Filtering

Filters are applied **before** ranking to reduce the candidate set. This is more efficient than post-ranking filtering and ensures scores are only computed for relevant candidates.

### 9.1 Filter Types

| Filter | Parameter | Logic |
|--------|-----------|-------|
| Category | `category` | `LOWER(category) LIKE LOWER('%{value}%')` |
| Min Price | `min_price` | `price >= min_price` |
| Max Price | `max_price` | `price <= max_price` |

### 9.2 Filter Application Order

1. Apply `category` filter → reduces to category-specific products.
2. Apply `min_price` filter.
3. Apply `max_price` filter.
4. The resulting set of `product_id`s is passed to the Ranker.

### 9.3 Empty Filter Handling

- If no filters are specified, all products in the index are candidates.
- If filters produce zero candidates, return an empty result with a `no_results` reason in the response.

### 9.4 Filter + NL Parser Interaction

When the NL parser extracts a price or category from the query, it populates the `StructuredQuery` fields. These are merged with explicit filter parameters before building the filter clause, with explicit parameters taking priority.

---

## 10. Result Ranking & Fusion

### 10.1 Score Normalization

Before returning results, scores are normalized to [0, 1] using min-max normalization:

```
normalized_score(d) = (score(d) - min_score) / (max_score - min_score)
```

If all scores are equal (degenerate case), all normalized scores are set to 1.0.

### 10.2 Hybrid Mode (Advanced — Phase 4)

In hybrid mode, BM25 score and field weight bonus are combined using a weighted linear combination:

```
hybrid_score(d) = α × bm25_score(d) + (1 - α) × field_bonus(d)
```

where `α = 0.8` by default (configurable in `config.py`).

`field_bonus` rewards documents where matches occur in higher-weighted fields:

```python
field_bonus(d, Q) = Σ_{t ∈ Q} Σ_f [ field_weight[f] × (1 if match(t, d, f) else 0) ] / |Q|
```

### 10.3 Tie Breaking

When two documents have the same score, tie-breaking is applied in this order:
1. Products with a match in `name` field rank higher.
2. Lower price ranks higher (budget-friendly preference).
3. Newer product (`created_at` descending) ranks higher.

### 10.4 Pagination

Pagination is applied **after** ranking to the full sorted list:

```python
start = (page - 1) × page_size
results = sorted_results[start : start + page_size]
```

---

## 11. Fallback Logic

### 11.1 Zero Results Fallback

If the primary search returns zero results, the system attempts fallbacks in order:

| Step | Action | Condition |
|------|--------|-----------|
| 1 | Relax filters — remove `category` filter, keep price filter | Zero results with category filter |
| 2 | Relax filters — remove all filters | Zero results after step 1 |
| 3 | Reduce query terms — drop lowest-IDF token | Still zero results |
| 4 | Return empty result with `suggestion` message | All fallbacks exhausted |

### 11.2 Fallback Response Flag

The response JSON includes a `fallback_applied` boolean and a `fallback_reason` string when a fallback is triggered, so clients can inform the user.

### 11.3 Low Confidence Results

If the top result's normalized score is below `0.05` (configurable), a `low_confidence` flag is set in the response, suggesting the query may not match any products well.

---

## 12. Indexing Pipeline

### 12.1 Index Build Steps

```
1. Load all products from database
2. For each product:
   a. Concatenate fields: name, description, category, specs
   b. Preprocess each field independently (lowercase → tokenize → stopword → stem)
   c. Compute raw_tf per term per field
   d. Update global doc_freq for each unique term
   e. Store field_lengths and total doc_length
3. Compute corpus-level statistics (N, avgdl, per-field avgdl)
4. Compute IDF for all terms
5. Pre-compute weighted TF for BM25 and TF-IDF
6. Serialize index + corpus_stats to data/index.pkl
```

### 12.2 Incremental Updates (Future)

For MVP, index is rebuilt from scratch when products change. Phase 5 may introduce incremental updates by re-indexing only modified documents.

---

## 13. Algorithm Parameters Reference

| Parameter | Location | Default | Description |
|-----------|---------|---------|-------------|
| `BM25_K1` | `config.py` | 1.5 | TF saturation |
| `BM25_B` | `config.py` | 0.75 | Length normalization |
| `HYBRID_ALPHA` | `config.py` | 0.8 | BM25 weight in hybrid |
| `FIELD_WEIGHTS` | `config.py` | name=3.0, cat=2.0, desc=1.5, specs=1.0 | Per-field score multiplier |
| `LOW_CONFIDENCE_THRESHOLD` | `config.py` | 0.05 | Min score for confident result |
| `DEFAULT_PAGE_SIZE` | `config.py` | 10 | Results per page |
| `MAX_PAGE_SIZE` | `config.py` | 100 | Maximum page size |
| `DEFAULT_MODE` | `config.py` | `bm25` | Default ranking algorithm |
| `CUSTOM_STOPWORDS` | `config.py` | (see §2.2) | E-commerce stopwords |
| `STEMMER` | `config.py` | `porter` | Stemmer type (porter/snowball) |
