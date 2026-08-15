# Database Specification
# E-Commerce Product Search System

**Version:** 1.0  
**Date:** 2026-08-15  
**Status:** Approved — Single Source of Truth  
**References:** PRD.md, ARCHITECTURE.md

---

## Table of Contents

1. [Database Overview](#1-database-overview)
2. [Schema Diagram (ERD)](#2-schema-diagram-erd)
3. [Table Definitions](#3-table-definitions)
4. [Relationships](#4-relationships)
5. [Indexes](#5-indexes)
6. [Constraints](#6-constraints)
7. [Sample Data](#7-sample-data)
8. [Seed Data Strategy](#8-seed-data-strategy)
9. [Migration Strategy](#9-migration-strategy)

---

## 1. Database Overview

| Property | Development | Production |
|----------|------------|-----------|
| Engine | SQLite 3 | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 | SQLAlchemy 2.0 |
| Schema Migrations | Alembic | Alembic |
| Encoding | UTF-8 | UTF-8 |
| Naming Convention | `snake_case` | `snake_case` |

The schema is **database-engine agnostic** — all column types and constraints use SQLAlchemy's cross-compatible type system. No engine-specific SQL is used.

### Tables Summary

| Table | Purpose |
|-------|---------|
| `products` | Core product catalog |
| `categories` | Product category hierarchy |
| `product_specifications` | Key-value spec pairs per product |
| `evaluation_queries` | Curated query set for evaluation |
| `relevance_judgments` | Known-relevant products per eval query |
| `search_logs` | Query analytics (Phase 4) |

---

## 2. Schema Diagram (ERD)

```
┌───────────────────────┐       ┌──────────────────────┐
│       categories      │       │       products        │
├───────────────────────┤       ├──────────────────────┤
│ id          INTEGER PK│◄──────│ category_id  INT FK  │
│ name        TEXT UNIQUE│      │ id           INT PK  │
│ slug        TEXT UNIQUE│      │ name         TEXT    │
│ description TEXT      │       │ description  TEXT    │
│ parent_id   INT FK    │       │ brand        TEXT    │
│ created_at  DATETIME  │       │ price        DECIMAL │
└───────────────────────┘       │ stock        INTEGER │
                                │ rating       REAL    │
                                │ image_url    TEXT    │
                                │ is_active    BOOLEAN │
                                │ created_at   DATETIME│
                                │ updated_at   DATETIME│
                                └──────────┬───────────┘
                                           │ 1
                                           │
                                           │ N
                          ┌────────────────▼───────────────┐
                          │     product_specifications      │
                          ├────────────────────────────────┤
                          │ id           INTEGER PK        │
                          │ product_id   INTEGER FK        │
                          │ spec_key     TEXT              │
                          │ spec_value   TEXT              │
                          └────────────────────────────────┘

┌──────────────────────────┐       ┌────────────────────────────┐
│    evaluation_queries    │       │    relevance_judgments     │
├──────────────────────────┤       ├────────────────────────────┤
│ id          INTEGER PK   │◄──────│ query_id    INTEGER FK     │
│ query_text  TEXT         │       │ product_id  INTEGER FK     │
│ category    TEXT NULL    │       │ relevance   INTEGER (0-3)  │
│ min_price   REAL NULL    │       │ id          INTEGER PK     │
│ max_price   REAL NULL    │       └────────────────────────────┘
│ notes       TEXT NULL    │
│ created_at  DATETIME     │
└──────────────────────────┘

┌──────────────────────────────────────────┐
│             search_logs                  │
├──────────────────────────────────────────┤
│ id           INTEGER PK                  │
│ query_text   TEXT                        │
│ mode         TEXT                        │
│ category     TEXT NULL                   │
│ min_price    REAL NULL                   │
│ max_price    REAL NULL                   │
│ result_count INTEGER                     │
│ latency_ms   REAL                        │
│ fallback     BOOLEAN                     │
│ created_at   DATETIME                    │
└──────────────────────────────────────────┘
```

---

## 3. Table Definitions

### 3.1 `categories`

Stores the product category hierarchy. Supports one level of parent-child nesting.

```sql
CREATE TABLE categories (
    id          INTEGER     PRIMARY KEY AUTOINCREMENT,
    name        TEXT        NOT NULL UNIQUE,
    slug        TEXT        NOT NULL UNIQUE,
    description TEXT,
    parent_id   INTEGER     REFERENCES categories(id) ON DELETE SET NULL,
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**SQLAlchemy Model:**
```python
class Category(Base):
    __tablename__ = "categories"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(100), nullable=False, unique=True)
    slug        = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    parent_id   = Column(Integer, ForeignKey("categories.id"), nullable=True)
    created_at  = Column(DateTime, nullable=False, default=func.now())

    products    = relationship("Product", back_populates="category")
    children    = relationship("Category", backref=backref("parent", remote_side=[id]))
```

**Seed Categories:**

| id | name | slug |
|----|------|------|
| 1 | Electronics | electronics |
| 2 | Clothing & Apparel | clothing-apparel |
| 3 | Books | books |
| 4 | Home & Kitchen | home-kitchen |
| 5 | Sports & Outdoors | sports-outdoors |
| 6 | Health & Beauty | health-beauty |
| 7 | Toys & Games | toys-games |
| 8 | Automotive | automotive |

---

### 3.2 `products`

Core product catalog table.

```sql
CREATE TABLE products (
    id          INTEGER     PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER     NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL,
    brand       TEXT        NOT NULL,
    price       DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    stock       INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
    rating      REAL        CHECK (rating >= 0.0 AND rating <= 5.0),
    image_url   TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**SQLAlchemy Model:**
```python
class Product(Base):
    __tablename__ = "products"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    name        = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    brand       = Column(String(100), nullable=False)
    price       = Column(Numeric(10, 2), nullable=False)
    stock       = Column(Integer, nullable=False, default=0)
    rating      = Column(Float, nullable=True)
    image_url   = Column(String(500), nullable=True)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime, nullable=False, default=func.now())
    updated_at  = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    category       = relationship("Category", back_populates="products")
    specifications = relationship("ProductSpecification", back_populates="product",
                                  cascade="all, delete-orphan")
```

**Field Notes:**

| Field | Notes |
|-------|-------|
| `name` | Max 300 chars; indexed for full-text search support |
| `description` | Full product description; the primary text for ranking |
| `brand` | Normalized brand name (e.g., "Samsung", not "SAMSUNG") |
| `price` | Stored as DECIMAL to avoid floating-point rounding errors |
| `rating` | Optional; 0.0–5.0 scale |
| `is_active` | Soft delete flag; inactive products excluded from search |

---

### 3.3 `product_specifications`

Stores product specifications as key-value pairs. This normalized approach avoids wide, sparse product tables and allows searching across any spec attribute.

```sql
CREATE TABLE product_specifications (
    id          INTEGER     PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER     NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    spec_key    TEXT        NOT NULL,
    spec_value  TEXT        NOT NULL
);
```

**SQLAlchemy Model:**
```python
class ProductSpecification(Base):
    __tablename__ = "product_specifications"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    spec_key   = Column(String(100), nullable=False)
    spec_value = Column(String(500), nullable=False)

    product = relationship("Product", back_populates="specifications")
```

**Example Specifications for a Laptop:**

| spec_key | spec_value |
|----------|-----------|
| processor | Intel Core i5-12th Gen |
| ram | 16GB DDR4 |
| storage | 512GB SSD |
| display | 15.6 inch FHD IPS |
| battery | 56Wh |
| os | Windows 11 Home |

**Index-Time Handling:**  
At index build time, all spec values for a product are concatenated into a single string and processed as the `specifications` field.

```python
def get_specs_text(product: Product) -> str:
    return " ".join(f"{s.spec_key} {s.spec_value}" for s in product.specifications)
```

---

### 3.4 `evaluation_queries`

Curated query set for running evaluation benchmarks.

```sql
CREATE TABLE evaluation_queries (
    id          INTEGER     PRIMARY KEY AUTOINCREMENT,
    query_text  TEXT        NOT NULL,
    category    TEXT,
    min_price   REAL,
    max_price   REAL,
    notes       TEXT,
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**SQLAlchemy Model:**
```python
class EvaluationQuery(Base):
    __tablename__ = "evaluation_queries"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    query_text = Column(Text, nullable=False)
    category   = Column(String(100), nullable=True)
    min_price  = Column(Float, nullable=True)
    max_price  = Column(Float, nullable=True)
    notes      = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())

    judgments  = relationship("RelevanceJudgment", back_populates="query",
                              cascade="all, delete-orphan")
```

---

### 3.5 `relevance_judgments`

Relevance annotations mapping evaluation queries to known-relevant products. Uses a 4-point graded relevance scale (TREC-style).

```sql
CREATE TABLE relevance_judgments (
    id         INTEGER     PRIMARY KEY AUTOINCREMENT,
    query_id   INTEGER     NOT NULL REFERENCES evaluation_queries(id) ON DELETE CASCADE,
    product_id INTEGER     NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    relevance  INTEGER     NOT NULL CHECK (relevance BETWEEN 0 AND 3),
    UNIQUE (query_id, product_id)
);
```

**Relevance Scale:**

| Score | Label | Description |
|-------|-------|-------------|
| 3 | Highly Relevant | Perfect match for the query intent |
| 2 | Relevant | Matches query but with minor gaps |
| 1 | Marginally Relevant | Partially relevant |
| 0 | Not Relevant | Does not match (explicitly judged) |

---

### 3.6 `search_logs`

Records query analytics for monitoring and future analysis. Populated in Phase 4.

```sql
CREATE TABLE search_logs (
    id           INTEGER   PRIMARY KEY AUTOINCREMENT,
    query_text   TEXT      NOT NULL,
    mode         TEXT      NOT NULL,
    category     TEXT,
    min_price    REAL,
    max_price    REAL,
    result_count INTEGER   NOT NULL,
    latency_ms   REAL      NOT NULL,
    fallback     BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Relationships

| Relationship | Type | Notes |
|-------------|------|-------|
| `Category` → `Product` | One-to-Many | Each product belongs to exactly one category |
| `Category` → `Category` (self) | One-to-Many | Parent-child category hierarchy |
| `Product` → `ProductSpecification` | One-to-Many | Each product has multiple spec pairs |
| `EvaluationQuery` → `RelevanceJudgment` | One-to-Many | Each query has multiple relevance annotations |
| `Product` → `RelevanceJudgment` | One-to-Many | A product may be annotated for multiple queries |

---

## 5. Indexes

### 5.1 Primary Indexes

All `PRIMARY KEY` columns are automatically indexed.

### 5.2 Secondary Indexes

```sql
-- Product search and filtering
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_price       ON products(price);
CREATE INDEX idx_products_is_active   ON products(is_active);
CREATE INDEX idx_products_brand       ON products(brand);
CREATE INDEX idx_products_rating      ON products(rating);

-- Composite: active products in price range (most common filter pattern)
CREATE INDEX idx_products_active_price ON products(is_active, price);

-- Specifications lookup
CREATE INDEX idx_specs_product_id ON product_specifications(product_id);
CREATE INDEX idx_specs_key        ON product_specifications(spec_key);

-- Evaluation
CREATE INDEX idx_judgments_query_id   ON relevance_judgments(query_id);
CREATE INDEX idx_judgments_product_id ON relevance_judgments(product_id);

-- Analytics
CREATE INDEX idx_search_logs_created_at ON search_logs(created_at);
CREATE INDEX idx_search_logs_mode       ON search_logs(mode);
```

### 5.3 SQLite Full-Text Search (FTS5) — Optional

For the filter pre-pass, an optional FTS5 virtual table may accelerate candidate retrieval:

```sql
CREATE VIRTUAL TABLE products_fts USING fts5(
    name,
    description,
    content='products',
    content_rowid='id'
);
```

> **Note:** The primary ranking is performed by the in-memory Python index, **not** by SQLite FTS. FTS5 is an optional optimization for the initial candidate retrieval step only.

---

## 6. Constraints

| Table | Constraint | Rule |
|-------|-----------|------|
| `products` | `price >= 0` | Non-negative price |
| `products` | `stock >= 0` | Non-negative stock |
| `products` | `rating BETWEEN 0.0 AND 5.0` | Valid rating range |
| `categories` | `name UNIQUE` | No duplicate category names |
| `categories` | `slug UNIQUE` | No duplicate slugs |
| `relevance_judgments` | `(query_id, product_id) UNIQUE` | One judgment per product per query |
| `relevance_judgments` | `relevance BETWEEN 0 AND 3` | Valid relevance score |
| `product_specifications` | FK `product_id` CASCADE DELETE | Specs deleted with product |

---

## 7. Sample Data

### 7.1 Sample Product Record

```json
{
  "id": 1,
  "category_id": 1,
  "name": "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
  "description": "Industry-leading noise cancellation with the WH-1000XM5. Features 8 microphones and two processors, 30-hour battery life, multipoint connection for simultaneous pairing with two devices, speak-to-chat technology, and premium sound quality.",
  "brand": "Sony",
  "price": 29990.00,
  "stock": 45,
  "rating": 4.8,
  "image_url": "https://example.com/images/sony-wh1000xm5.jpg",
  "is_active": true,
  "created_at": "2026-01-15T10:30:00",
  "specifications": [
    {"spec_key": "driver_unit",      "spec_value": "40mm dome type"},
    {"spec_key": "frequency_range",  "spec_value": "4Hz-40,000Hz"},
    {"spec_key": "battery_life",     "spec_value": "30 hours"},
    {"spec_key": "connectivity",     "spec_value": "Bluetooth 5.2"},
    {"spec_key": "weight",           "spec_value": "250g"},
    {"spec_key": "noise_cancelling", "spec_value": "Active Noise Cancellation"},
    {"spec_key": "microphones",      "spec_value": "8 microphones"},
    {"spec_key": "color",            "spec_value": "Black"}
  ]
}
```

### 7.2 Sample Evaluation Query

```json
{
  "id": 1,
  "query_text": "wireless headphones with noise cancellation",
  "category": null,
  "min_price": null,
  "max_price": 35000,
  "notes": "Should match over-ear and in-ear ANC headphones",
  "judgments": [
    {"product_id": 1, "relevance": 3},
    {"product_id": 4, "relevance": 3},
    {"product_id": 12, "relevance": 2},
    {"product_id": 23, "relevance": 1},
    {"product_id": 45, "relevance": 0}
  ]
}
```

---

## 8. Seed Data Strategy

### 8.1 Target Distribution

| Category | Product Count | Price Range (INR) |
|----------|-------------|-----------------|
| Electronics | 100 | 500 – 150,000 |
| Clothing & Apparel | 80 | 200 – 15,000 |
| Books | 60 | 100 – 5,000 |
| Home & Kitchen | 80 | 300 – 50,000 |
| Sports & Outdoors | 70 | 500 – 30,000 |
| Health & Beauty | 50 | 100 – 10,000 |
| Toys & Games | 40 | 200 – 20,000 |
| Automotive | 30 | 500 – 100,000 |
| **Total** | **510** | — |

### 8.2 Data Quality Requirements

- Each product MUST have a meaningful description (minimum 50 words).
- Specifications MUST be filled for all electronics and automotive products (minimum 5 key-value pairs).
- Prices MUST be realistic for the Indian market (INR).
- At least 20% of products must share overlapping terms (to test ranking differentiation).

### 8.3 Seed Script

The `scripts/seed_db.py` script:
1. Reads `app/data/seed_products.json`.
2. Inserts categories (idempotent — skips if already exists).
3. Inserts products with their specifications.
4. Inserts evaluation queries and relevance judgments from `app/data/eval_queries.json`.

---

## 9. Migration Strategy

### 9.1 Development (SQLite)

Use Alembic with SQLAlchemy autogenerate:

```bash
# Initialize Alembic
alembic init alembic

# Generate migration from model changes
alembic revision --autogenerate -m "initial schema"

# Apply migrations
alembic upgrade head
```

### 9.2 Production Migration (PostgreSQL)

The same Alembic migration files work for PostgreSQL. The only required change is `DATABASE_URL` in `.env`:

```
# Development
DATABASE_URL=sqlite:///./app/data/products.db

# Production
DATABASE_URL=postgresql://user:password@host:5432/ecommerce_search
```

### 9.3 Index Rebuild After Migration

After any schema change that affects searchable fields:

```bash
python scripts/build_index.py --force
```
