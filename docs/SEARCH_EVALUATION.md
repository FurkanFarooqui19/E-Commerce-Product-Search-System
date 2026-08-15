# Search Evaluation Specification
# E-Commerce Product Search System

**Version:** 1.0  
**Date:** 2026-08-15  
**Status:** Approved — Single Source of Truth  
**References:** PRD.md, SEARCH_ENGINE_SPEC.md, API_SPEC.md

---

## Table of Contents

1. [Evaluation Overview](#1-evaluation-overview)
2. [Evaluation Methodology](#2-evaluation-methodology)
3. [Metrics Definitions](#3-metrics-definitions)
4. [Metric Calculation Examples](#4-metric-calculation-examples)
5. [Evaluation Dataset](#5-evaluation-dataset)
6. [Algorithm Comparison Framework](#6-algorithm-comparison-framework)
7. [Evaluation API Usage](#7-evaluation-api-usage)
8. [Expected Results](#8-expected-results)
9. [Parameter Tuning Protocol](#9-parameter-tuning-protocol)
10. [Evaluation Report Format](#10-evaluation-report-format)

---

## 1. Evaluation Overview

The evaluation framework provides an **objective, reproducible** methodology for comparing the three ranking algorithms (Keyword, TF-IDF, BM25) and their variants. It is a first-class feature of the system, not an afterthought.

### 1.1 Goals

1. Quantify the ranking quality of each algorithm.
2. Prove BM25 outperforms TF-IDF outperforms Keyword on the curated evaluation dataset.
3. Guide BM25 parameter (k1, b) tuning.
4. Provide a reusable benchmark for future algorithm additions.

### 1.2 Evaluation Dimensions

| Dimension | What It Measures |
|-----------|----------------|
| Precision@K | Are the top-K results relevant? |
| Recall@K | Does the system find most relevant products in top-K? |
| MRR | How early does the first relevant result appear? |
| NDCG@K | Are highly relevant results ranked above marginally relevant ones? |
| Latency | How fast is the algorithm? |

### 1.3 Evaluation is Both Online and Offline

| Mode | Description | When Used |
|------|------------|----------|
| **Offline** | Python script reads eval dataset, calls search service internally | Development, CI/CD |
| **Online** | `POST /api/v1/evaluate` API call with query set | Demo, reporting |

---

## 2. Evaluation Methodology

### 2.1 Cranfield Paradigm

This evaluation follows the **Cranfield paradigm** for Information Retrieval evaluation:

1. A fixed set of queries (**evaluation queries**) is prepared in advance.
2. For each query, a set of **relevant documents** is manually annotated with relevance grades.
3. Each algorithm is run on each query; its output is compared to the relevance annotations.
4. Metrics are computed and averaged across all queries.

This methodology is the same used in TREC, MS MARCO, and other major IR benchmarks.

### 2.2 Relevance Annotation Process

**Graded Relevance Scale (4-level):**

| Grade | Label | Criteria |
|-------|-------|---------|
| 3 | Highly Relevant | Product directly matches query intent; a user would definitely buy/click |
| 2 | Relevant | Product matches the query but with minor gaps (e.g., different brand, slightly wrong spec) |
| 1 | Marginally Relevant | Product is loosely related; user might browse but unlikely to buy |
| 0 | Not Relevant | Product does not match (explicitly judged, not just absent from annotations) |

**Annotation Guidelines:**
- Each query is judged by considering user intent (e.g., "wireless headphones" → intent is ANC, over-ear, or casual listening).
- Judgments are made without knowledge of any algorithm's output (avoid position bias).
- For binary metrics (P@K, Recall@K), grades ≥ 2 are considered **relevant** (`binary_relevant = grade >= 2`).
- For graded metrics (NDCG@K), all four grades are used.

### 2.3 Evaluation Isolation

Each algorithm is evaluated independently:
- Same query preprocessing pipeline.
- Same filter parameters (if any).
- Same candidate set (all products, unless query specifies filters).
- Different scoring function only.

This ensures metrics reflect **only ranking quality**, not preprocessing differences.

---

## 3. Metrics Definitions

### 3.1 Precision@K (P@K)

**What it measures:** Of the top-K retrieved results, what fraction is relevant?

```
P@K = |{relevant documents in top-K}| / K
```

- Range: [0, 1]. Higher is better.
- K values used: **5, 10** (standard for e-commerce).
- Binary relevance: a product is relevant if `grade ≥ 2`.

**Intuition:** A user who only looks at the first K results — how many are useful?

---

### 3.2 Recall@K (R@K)

**What it measures:** Of all relevant products in the catalog, what fraction appears in the top-K results?

```
R@K = |{relevant documents in top-K}| / |{all relevant documents for query}|
```

- Range: [0, 1]. Higher is better.
- K values used: **10, 20**.
- Binary relevance: grade ≥ 2.

**Intuition:** How complete is the system's top-K result set?

**Important:** Recall@K is bounded by `K / |relevant_set|`. If a query has 20 relevant products and K=10, maximum recall is 0.5 regardless of algorithm.

---

### 3.3 Mean Reciprocal Rank (MRR)

**What it measures:** On average, how high does the **first** relevant result appear in the ranking?

```
RR(query) = 1 / rank_of_first_relevant_result
           = 0  if no relevant result in top-K
MRR = (1/|Q|) × Σ_{q ∈ Q} RR(q)
```

- Range: [0, 1]. Higher is better.
- Computed over top-20 results (K not capped at 5/10 for MRR).
- Binary relevance: grade ≥ 1 (even marginally relevant counts).

**Intuition:** If the first result is always relevant, MRR = 1.0. If the first relevant result is always at rank 5, MRR = 0.2.

---

### 3.4 Normalized Discounted Cumulative Gain @ K (NDCG@K)

**What it measures:** Graded relevance gain from the top-K results, normalized by the ideal ordering.

**Step 1 — Discounted Cumulative Gain (DCG@K):**

```
DCG@K = Σ_{i=1}^{K} (2^{rel_i} - 1) / log2(i + 1)
```

where `rel_i` is the graded relevance (0–3) of the result at rank `i`.

**Step 2 — Ideal DCG (IDCG@K):**

```
IDCG@K = DCG@K of the perfect ranking (results sorted by relevance descending)
```

**Step 3 — NDCG@K:**

```
NDCG@K = DCG@K / IDCG@K
```

- Range: [0, 1]. Higher is better.
- K values used: **5, 10**.
- Requires graded relevance judgments (0–3).

**Intuition:** NDCG rewards putting the most relevant results at the top. Getting a grade-3 product at rank 1 is much better than at rank 10.

---

### 3.5 Latency

**What it measures:** End-to-end time to return a search result, measured from query entry to response return.

```
Latency(query) = time_response_complete - time_query_received  [milliseconds]
```

**Reported statistics:**
- Mean latency (ms)
- Median latency (ms)
- p95 latency (ms)
- p99 latency (ms)
- Min / Max latency (ms)

**Measurement approach:**
- Latency is measured at the `SearchService` level (excludes HTTP overhead).
- Each query is run 3 times; the **median** of the 3 runs is recorded per query.
- Cold-start (first query after index load) is excluded.

---

### 3.6 Aggregate Metrics

For each algorithm, per-query metrics are **macro-averaged** (simple mean) across all queries:

```
Avg_P@K = (1/|Q|) × Σ P@K(q)
Avg_R@K = (1/|Q|) × Σ R@K(q)
MRR     = (1/|Q|) × Σ RR(q)
Avg_NDCG@K = (1/|Q|) × Σ NDCG@K(q)
```

Macro-averaging treats all queries equally regardless of how many relevant products each has.

---

## 4. Metric Calculation Examples

### 4.1 Example: P@K and R@K

**Query:** "wireless headphones"  
**Known relevant products:** {1, 4, 12, 23} (grades ≥ 2)  
**Algorithm output (top 10):** [1, 7, 4, 15, 23, 9, 3, 18, 12, 6]

| Rank | Product ID | Relevant? | Running Relevant Count |
|------|-----------|----------|----------------------|
| 1 | 1 | ✅ Yes | 1 |
| 2 | 7 | ❌ No | 1 |
| 3 | 4 | ✅ Yes | 2 |
| 4 | 15 | ❌ No | 2 |
| 5 | 23 | ✅ Yes | 3 |
| 6 | 9 | ❌ No | 3 |
| 7 | 3 | ❌ No | 3 |
| 8 | 18 | ❌ No | 3 |
| 9 | 12 | ✅ Yes | 4 |
| 10 | 6 | ❌ No | 4 |

```
P@5  = 3/5  = 0.600
P@10 = 4/10 = 0.400

R@10 = 4/4  = 1.000   (all 4 relevant products found in top 10)
```

---

### 4.2 Example: MRR

**Query results:** [7, 4, 15, 23, 9]  
**First relevant result at rank:** 2 (product 4)

```
RR = 1/2 = 0.500
```

If three queries have RR = 1.0, 0.5, 0.333:

```
MRR = (1.0 + 0.5 + 0.333) / 3 = 0.611
```

---

### 4.3 Example: NDCG@5

**Query:** "laptop for students"  
**Graded relevance of top 5 results:**

| Rank i | Product ID | Grade (rel_i) | (2^rel - 1) / log2(i+1) |
|--------|-----------|--------------|------------------------|
| 1 | 42 | 3 | (2³-1)/log2(2) = 7/1.0 = **7.000** |
| 2 | 17 | 2 | (2²-1)/log2(3) = 3/1.585 = **1.893** |
| 3 | 8 | 1 | (2¹-1)/log2(4) = 1/2.0 = **0.500** |
| 4 | 55 | 0 | (2⁰-1)/log2(5) = 0/2.322 = **0.000** |
| 5 | 33 | 3 | (2³-1)/log2(6) = 7/2.585 = **2.708** |

```
DCG@5 = 7.000 + 1.893 + 0.500 + 0.000 + 2.708 = 12.101
```

**Ideal ordering** (sorted by grade: 3,3,2,1,0):

| Rank i | Grade | (2^rel - 1) / log2(i+1) |
|--------|-------|------------------------|
| 1 | 3 | 7.000 |
| 2 | 3 | 4.416 |
| 3 | 2 | 1.893 |
| 4 | 1 | 0.431 |
| 5 | 0 | 0.000 |

```
IDCG@5 = 7.000 + 4.416 + 1.893 + 0.431 + 0.000 = 13.740
NDCG@5 = 12.101 / 13.740 = 0.881
```

---

## 5. Evaluation Dataset

### 5.1 Dataset Composition

| Property | Target |
|----------|--------|
| Total queries | 50 |
| Queries per category | 5–8 |
| Relevance judgments per query | 3–15 products |
| Graded relevance used | Yes (0–3) |
| Language | English |

### 5.2 Query Type Distribution

| Query Type | Count | Example |
|-----------|-------|---------|
| Single-term | 5 | `"headphones"` |
| Multi-term | 15 | `"wireless bluetooth headphones"` |
| Descriptive | 10 | `"noise cancelling over ear headphones"` |
| Natural-language with price | 10 | `"wireless headphones under 3000"` |
| Natural-language with category | 5 | `"running shoes for women"` |
| Complex NL | 5 | `"best budget laptop for students under 50000"` |

### 5.3 Sample Evaluation Queries

| ID | Query | Filters | Min Relevant |
|----|-------|---------|-------------|
| 1 | wireless headphones | — | 5 |
| 2 | wireless headphones under 3000 | max_price=3000 | 3 |
| 3 | bluetooth speaker portable | — | 4 |
| 4 | laptop for students | — | 6 |
| 5 | running shoes women | category=Clothing | 4 |
| 6 | noise cancelling headphones | — | 4 |
| 7 | smartphone under 15000 | max_price=15000 | 5 |
| 8 | gaming laptop | — | 3 |
| 9 | protein powder gym | category=Health | 3 |
| 10 | beginner programming book | category=Books | 4 |
| ... | ... | ... | ... |

### 5.4 Dataset Storage Format

```json
[
  {
    "id": 1,
    "query_text": "wireless headphones",
    "category": null,
    "min_price": null,
    "max_price": null,
    "notes": "Should include ANC, true wireless, and wired options",
    "judgments": [
      {"product_id": 1,  "relevance": 3},
      {"product_id": 4,  "relevance": 3},
      {"product_id": 12, "relevance": 2},
      {"product_id": 23, "relevance": 2},
      {"product_id": 45, "relevance": 1},
      {"product_id": 89, "relevance": 0}
    ]
  }
]
```

---

## 6. Algorithm Comparison Framework

### 6.1 Comparison Table Template

After running evaluation, results are presented in this format:

| Metric | Keyword | TF-IDF | BM25 | Hybrid |
|--------|---------|--------|------|--------|
| P@5 | — | — | — | — |
| P@10 | — | — | — | — |
| R@10 | — | — | — | — |
| R@20 | — | — | — | — |
| MRR | — | — | — | — |
| NDCG@5 | — | — | — | — |
| NDCG@10 | — | — | — | — |
| Avg Latency (ms) | — | — | — | — |
| p95 Latency (ms) | — | — | — | — |

### 6.2 Statistical Significance

For a student/portfolio project, full statistical significance testing (e.g., t-test, Wilcoxon signed-rank) is optional but recommended. If implemented:
- Compute per-query NDCG@10 vectors for each pair of algorithms.
- Apply two-tailed paired t-test.
- Report p-value; p < 0.05 is considered significant.

### 6.3 Ablation Study

The evaluation framework supports ablation to isolate contributions:

| Configuration | Description |
|--------------|-------------|
| BM25 (no field weights) | All field weights = 1.0 |
| BM25 (with field weights) | Default weights (name=3.0, etc.) |
| BM25 k1=1.2, b=0.75 | Parameter variant |
| BM25 k1=1.5, b=0.75 | Default |
| BM25 k1=2.0, b=0.75 | Higher TF saturation |
| BM25 k1=1.5, b=0.0 | No length normalization |
| BM25 k1=1.5, b=1.0 | Full length normalization |

This allows the evaluation report to show:
1. How much field weighting contributes to BM25 quality.
2. Which k1/b combination maximizes NDCG@10.

---

## 7. Evaluation API Usage

### 7.1 Running via API

**Using the stored evaluation query set (query_set_id=1):**

```bash
curl -X POST http://localhost:8000/api/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "query_set_id": 1,
    "modes": ["keyword", "tfidf", "bm25"],
    "k": 10
  }'
```

**Using inline queries:**

```bash
curl -X POST http://localhost:8000/api/v1/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      {
        "query_text": "wireless headphones",
        "graded_judgments": [
          {"product_id": 1, "relevance": 3},
          {"product_id": 4, "relevance": 2}
        ]
      }
    ],
    "modes": ["keyword", "tfidf", "bm25"],
    "k": 10
  }'
```

### 7.2 Running via CLI Script

```bash
# Run full evaluation on all 50 queries
python scripts/run_evaluation.py --query-set 1 --modes keyword tfidf bm25 --k 10

# Run with output to file
python scripts/run_evaluation.py --query-set 1 --output results/eval_report.json

# Run ablation (BM25 with/without field weights)
python scripts/run_evaluation.py --ablation --k 10
```

**CLI Script Output (console):**

```
=============================================
  E-Commerce Search Evaluation Report
  Queries: 50 | K: 10
=============================================

ALGORITHM: keyword
  P@5:    0.432  P@10:  0.388
  R@10:   0.341  R@20:  0.512
  MRR:    0.521
  NDCG@5: 0.389  NDCG@10: 0.401
  Avg Latency: 4.2ms  p95: 7.1ms

ALGORITHM: tfidf
  P@5:    0.556  P@10:  0.521
  R@10:   0.449  R@20:  0.631
  MRR:    0.641
  NDCG@5: 0.512  NDCG@10: 0.538
  Avg Latency: 11.7ms  p95: 18.4ms

ALGORITHM: bm25
  P@5:    0.672  P@10:  0.648
  R@10:   0.581  R@20:  0.743
  MRR:    0.789
  NDCG@5: 0.671  NDCG@10: 0.703
  Avg Latency: 14.1ms  p95: 21.9ms

=============================================
WINNER (NDCG@10): bm25
BM25 vs Keyword NDCG@10 improvement: +75.3%
BM25 vs TF-IDF  NDCG@10 improvement: +30.7%
All latencies within 500ms SLA: ✅
=============================================
```

---

## 8. Expected Results

These targets are derived from the success criteria in `PRD.md §10` and general IR benchmarking knowledge.

| Metric | Keyword | TF-IDF | BM25 | Acceptance |
|--------|---------|--------|------|-----------|
| P@10 | ≥ 0.40 | ≥ 0.52 | ≥ 0.65 | BM25 > TF-IDF > Keyword |
| NDCG@10 | ≥ 0.38 | ≥ 0.50 | ≥ 0.65 | BM25 ≥ Keyword + 10% |
| MRR | ≥ 0.45 | ≥ 0.60 | ≥ 0.75 | BM25 highest |
| R@20 | ≥ 0.50 | ≥ 0.60 | ≥ 0.72 | BM25 highest |
| Avg Latency | ≤ 50ms | ≤ 100ms | ≤ 150ms | All ≤ 500ms |

**If BM25 does NOT outperform Keyword on initial run:**
1. Check if evaluation queries are biased toward exact-match terms.
2. Check if field weights are correctly applied.
3. Try reducing k1 (e.g., 1.2) to increase TF influence.
4. Verify stemming is applied consistently at both index and query time.

---

## 9. Parameter Tuning Protocol

### 9.1 BM25 Grid Search

Grid search over the k1 × b parameter space:

```python
K1_VALUES = [1.0, 1.2, 1.5, 1.8, 2.0]
B_VALUES  = [0.0, 0.25, 0.50, 0.75, 1.0]

# 5 × 5 = 25 configurations
for k1 in K1_VALUES:
    for b in B_VALUES:
        score = evaluate_bm25(k1=k1, b=b, metric='ndcg@10')
        results[k1][b] = score

# Find best combination
best_k1, best_b = argmax(results)
```

### 9.2 Field Weight Tuning

Test 4 field weight configurations:

| Config | name | category | description | specs |
|--------|------|----------|-------------|-------|
| Baseline | 1.0 | 1.0 | 1.0 | 1.0 |
| Title-heavy | 3.0 | 1.0 | 1.0 | 1.0 |
| Default | 3.0 | 2.0 | 1.5 | 1.0 |
| Category-heavy | 2.0 | 3.0 | 1.5 | 1.0 |

Report NDCG@10 for each configuration to justify the default weights.

### 9.3 Tuning Procedure

1. Run grid search using the **training split** (first 35 of 50 queries).
2. Select best k1, b based on NDCG@10 on training split.
3. Report final metrics on **held-out split** (remaining 15 queries) using the tuned parameters.
4. Report both training and held-out metrics to demonstrate generalization.

---

## 10. Evaluation Report Format

The final evaluation report (`results/EVALUATION_RESULTS.md`) must include:

### Required Sections

1. **System Configuration** — Python version, index size, evaluation date, BM25 params used.
2. **Dataset Summary** — Number of queries, categories covered, average relevant products per query.
3. **Main Results Table** — All metrics for all algorithms (see §6.1 format).
4. **Algorithm Analysis** — Narrative explaining why BM25 outperforms, citing specific metrics.
5. **Latency Analysis** — Per-algorithm latency statistics.
6. **BM25 Parameter Tuning Results** — Heatmap description or table of k1 × b grid.
7. **Field Weight Ablation** — Table showing impact of field weighting on BM25.
8. **Failure Cases** — 3–5 queries where BM25 underperforms; analysis of why.
9. **Conclusions** — Which algorithm to deploy and why.

### Example Conclusions Section

```
## Conclusions

BM25 with k1=1.5 and b=0.75 achieves the highest NDCG@10 (0.703) across all
evaluated algorithms, outperforming TF-IDF by 30.7% and Keyword by 75.3%.
The performance advantage is most pronounced on natural-language queries with
multiple terms, where BM25's TF saturation prevents high-frequency filler words
from dominating the score.

Field weighting (name=3.0, category=2.0) contributes approximately 12% to
BM25's NDCG@10 improvement over the no-weighting baseline.

**Recommendation:** Deploy BM25 with default parameters as the production ranking
algorithm. Consider Hybrid mode (BM25 + field bonus) for further 3–5% improvement.
```
