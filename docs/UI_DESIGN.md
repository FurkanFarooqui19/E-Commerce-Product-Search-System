# SearchForge UI Design Specification

**Project:** SearchForge — E-Commerce Classical IR & Intelligent Search Engine  
**Version:** 1.0.0  
**Stack:** React 18, TypeScript, TailwindCSS, Lucide Icons, Recharts  
**Design Paradigm:** Modern AI / Developer-First Search Dashboard (Dark / Glassmorphism theme with vibrant accents)

---

## 1. Design System & Theme

### 1.1 Color Palette
* **Background Primary**: `Slate 950` (`#020617` / `#0b0f19`) — deep, sleek dark backdrop
* **Surface / Cards**: `Slate 900/80` (`#0f172a`) with subtle glassmorphism border `Slate 800/60` (`#1e293b`)
* **Primary Brand / Action**: Indigo-to-Violet gradient (`#6366f1` $\rightarrow$ `#8b5cf6`)
* **Accent Cyber / Highlights**:
  * **Cyan** (`#06b6d4`): For Tokens, Autocomplete highlights, and Latency stats
  * **Emerald** (`#10b981`): For High relevance scores ($\ge 90\%$), Active status, and Evaluation Winners
  * **Amber** (`#f59e0b`): For Moderate relevance scores, Fallback warnings, and Price tags
  * **Rose** (`#f43f5e`): For Low confidence alerts and Filter resets
* **Text Hierarchy**:
  * Headings: `Slate 50` (`#f8fafc`)
  * Body & Secondary: `Slate 300` / `Slate 400` (`#cbd5e1` / `#94a3b8`)
  * Muted / Captions: `Slate 500` (`#64748b`)

### 1.2 Typography
* **Primary Font**: `Inter`, system sans-serif (clean, readable for dense e-commerce and analytics interfaces)
* **Monospace Font**: `JetBrains Mono`, `Fira Code`, `ui-monospace` (for processed tokens, IDF weights, latency timestamps, formula symbols)

---

## 2. Navigation & Layout Architecture

### 2.1 Persistent Header
* **Branding**: SearchForge logo with spark icon + *"Classical IR Engine"* sub-badge.
* **Top Navigation Tabs**:
  1. 🔍 **Product Search**
  2. ⚡ **Algorithm Comparison**
  3. 📊 **Evaluation Benchmark**
  4. 🛡️ **System & Logs**
* **Live Health Beacon (Right)**:
  * Status indicator (`Healthy` in emerald)
  * Real-time document count (`510 Products`)
  * Vocabulary index size (`1,005 Terms`)
  * Latency badge

---

## 3. Page Layouts & User Flow

### 3.1 Page 1: Product Search & Discovery (`/search`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Search Bar: "wireless headphones under 2000"           ] [Search]     │
│  ↳ Autocomplete Popup: ["wireless", "wireless headphones"]            │
├────────────────────────────────────────────────────────────────────────┤
│ [NL Extracted Chips: Price ≤ ₹2,000 | Tokens: ["wireless", "headphon"]]│
├──────────────┬─────────────────────────────────────────────────────────┤
│ Filters      │ Mode: [● BM25 (Recommended) | ○ Hybrid | ○ TF-IDF | ○ KW]│
│ - Category   ├─────────────────────────────────────────────────────────┤
│ - Price (₹)  │ 40 Results (Latency: 3.4ms | Fallback: No)              │
│ - Rating     │ ┌──────────────────────┐ ┌──────────────────────┐      │
│              │ │ Sony WH-1000XM5      │ │ Bose QuietComfort    │      │
│              │ │ Relevance: 98% (BM25)│ │ Relevance: 94% (BM25)│      │
│              │ │ ₹29,990 | ★ 4.8      │ │ ₹24,990 | ★ 4.7      │      │
│              │ └──────────────────────┘ └──────────────────────┘      │
│              │ Pagination: [ < Prev ] [ 1 ] [ 2 ] [ 3 ] [ Next > ]     │
└──────────────┴─────────────────────────────────────────────────────────┘
```

* **Interactive Elements**:
  * Search bar with instantaneous keystroke autocomplete (`/api/v1/search/suggest?q=...`)
  * Natural Language Extractor Banner (visually displays extracted max/min prices and category hints)
  * Ranking Mode Switcher Pills (with explanatory tooltips for BM25, Hybrid, TF-IDF, Keyword)
  * Left sidebar category pills with product counts (e.g. `Electronics (100)`, `Clothing (80)`)
  * Dynamic price range slider and reset buttons
  * Rich product cards with relevance score gauges, specs chips, stock indicator, and click-to-view modal
  * Search telemetry drawer (showing processed tokens, latency ms, candidates filtered, fallback triggers)

---

### 3.2 Page 2: 4-Way Algorithm Comparison (`/compare`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Query: [ laptop for students                          ] [Compare All]  │
├──────────────┬──────────────┬──────────────────────────┬───────────────┤
│ 🔵 KEYWORD   │ 🟣 TF-IDF    │ 🟢 BM25 (Default)        │ 🟡 HYBRID     │
│ Latency: 3.2ms│ Latency: 4.1ms│ Latency: 3.5ms          │ Latency: 3.4ms│
├──────────────┼──────────────┼──────────────────────────┼───────────────┤
│ 1. Prod #42  │ 1. Prod #17  │ 1. Prod #17              │ 1. Prod #17   │
│    Score 0.80│    Score 0.91│    Score 0.95            │    Score 0.96 │
│ 2. Prod #17  │ 2. Prod #42  │ 2. Prod #42              │ 2. Prod #42   │
│    Score 0.60│    Score 0.85│    Score 0.88            │    Score 0.89 │
│ 3. Prod #89  │ 3. Prod #103 │ 3. Prod #103             │ 3. Prod #103  │
└──────────────┴──────────────┴──────────────────────────┴───────────────┘
```

* **Interactive Elements**:
  * Real-time multi-mode execution calling `/api/v1/search/compare`
  * 4 side-by-side synchronized cards with ranking position badges
  * Latency comparison bar chart
  * Visual highlight when ranking orders diverge (demonstrating why BM25/TF-IDF outperform Keyword)

---

### 3.3 Page 3: Information Retrieval Evaluation Dashboard (`/evaluation`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ [ Benchmark: General Search Benchmark (30 Queries, k=10) ] [Run Eval]  │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ P@10 (BM25)       │ NDCG@10 (BM25)    │ MRR (BM25)                     │
│ 0.6567 (Pass)     │ 0.7401 (+2.1%)    │ 0.8789                         │
├───────────────────┴───────────────────┴────────────────────────────────┤
│ 📊 Interactive Recharts: NDCG@10 & Precision@10 Comparison Bar Chart   │
├────────────────────────────────────────────────────────────────────────┤
│ 📋 Per-Query Benchmark Breakdown Table (Searchable & Filterable)       │
│ - Query Text | Keyword NDCG | TF-IDF NDCG | BM25 NDCG | Winner Mode    │
├────────────────────────────────────────────────────────────────────────┤
│ ⚙️ Algorithm Hyperparameter Inspector (k1=1.5, b=0.75, α=0.8, Weights)│
└────────────────────────────────────────────────────────────────────────┘
```

* **Interactive Elements**:
  * One-click benchmark trigger calling `POST /api/v1/evaluate`
  * Metric cards with PRD target comparisons (Target $\ge 0.65$ vs Actual $0.6567$)
  * Recharts grouped bar charts for Precision@10, Recall@10, MRR, and NDCG@10
  * Filterable per-query matrix table highlighting the winning algorithm for each query

---

### 3.4 Page 4: Analytics & System Monitor (`/analytics`)

* **Query Log Stream**: Live searchable table of recent requests (`GET /api/v1/admin/logs`) displaying query text, mode, latency ms, result count, and fallback status.
* **Corpus Health Card**: Total products, active vs inactive count, category distribution, vocabulary term count.
* **Architecture Legend**: Interactive guide explaining the 6-stage search pipeline.

---

## 4. Component Hierarchy

```
App
├── Header (Navigation, Brand, HealthBeacon)
└── Main Content Container
    ├── SearchPage
    │   ├── SearchInput (with Autocomplete Dropdown)
    │   ├── NLParserBanner (Extracted Filters Visualizer)
    │   ├── ModeSelectorTabs (Keyword, TF-IDF, BM25, Hybrid)
    │   ├── FilterSidebar (Categories, Price Slider, In-Stock)
    │   ├── TelemetryBar (Latency, Candidate Count, Token Pills)
    │   ├── ProductGrid
    │   │   └── ProductCard (Score Badge, Category Tag, Price, Specs)
    │   ├── ProductDetailModal (Specs Table, Description)
    │   └── PaginationControls
    ├── ComparePage
    │   ├── CompareSearchBar
    │   ├── LatencyMetricsRow
    │   └── ModeColumnsGrid (Keyword, TF-IDF, BM25, Hybrid)
    ├── EvaluationPage
    │   ├── EvalHeader (Run Benchmark, Set Selector)
    │   ├── MetricCardsGrid (P@10, R@10, MRR, NDCG@10)
    │   ├── MetricChartsView (Recharts Comparative Bars)
    │   ├── PerQueryTable (Filter by Query, Winner Badges)
    │   └── ParameterInspector
    └── AnalyticsPage
        ├── SystemHealthSummary
        └── SearchLogsTable (Pagination, Mode Filter)
```
