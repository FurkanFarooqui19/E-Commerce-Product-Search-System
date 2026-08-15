import json
import random
from datetime import datetime, timedelta

CATEGORIES = [
    {"id": 1, "name": "Electronics", "slug": "electronics", "description": "Consumer electronics"},
    {"id": 2, "name": "Clothing & Apparel", "slug": "clothing-apparel", "description": "Fashion"},
    {"id": 3, "name": "Books", "slug": "books", "description": "Books"},
    {"id": 4, "name": "Home & Kitchen", "slug": "home-kitchen", "description": "Home"},
    {"id": 5, "name": "Sports & Outdoors", "slug": "sports-outdoors", "description": "Sports"},
    {"id": 6, "name": "Health & Beauty", "slug": "health-beauty", "description": "Health"},
    {"id": 7, "name": "Toys & Games", "slug": "toys-games", "description": "Toys"},
    {"id": 8, "name": "Automotive", "slug": "automotive", "description": "Automotive"}
]

BRANDS = ["Sony", "Samsung", "Apple", "Nike", "Adidas", "LG", "Bose", "Dell", "HP", "Puma"]

def generate_products():
    products = []
    pid = 1
    for cat in CATEGORIES:
        num_products = {1: 100, 2: 80, 3: 60, 4: 80, 5: 70, 6: 50, 7: 40, 8: 30}.get(cat["id"], 50)
        for i in range(num_products):
            brand = random.choice(BRANDS)
            base_name = f"{brand} {cat['name']} Item {i}"
            products.append({
                "id": pid,
                "category_id": cat["id"],
                "name": base_name,
                "description": f"This is a high quality {base_name}. It features amazing capabilities and long lasting durability. A perfect choice for anyone looking for {cat['name']}.",
                "brand": brand,
                "price": round(random.uniform(100.0, 50000.0), 2),
                "stock": random.randint(0, 100),
                "rating": round(random.uniform(1.0, 5.0), 1),
                "image_url": f"https://example.com/images/prod_{pid}.jpg",
                "is_active": True,
                "created_at": (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat(),
                "specifications": [
                    {"spec_key": "color", "spec_value": random.choice(["Black", "White", "Red", "Blue"])},
                    {"spec_key": "weight", "spec_value": f"{random.randint(100, 2000)}g"},
                    {"spec_key": "material", "spec_value": "Premium"},
                    {"spec_key": "warranty", "spec_value": "1 Year"},
                    {"spec_key": "model_year", "spec_value": str(random.randint(2020, 2024))}
                ]
            })
            pid += 1
    return products

def generate_queries(products):
    queries = []
    qid = 1
    for cat in CATEGORIES:
        for i in range(7): # ~5-8 per category
            q_text = f"{cat['name'].split()[0].lower()} under 3000"
            rel_prods = random.sample([p for p in products if p['category_id'] == cat['id']], min(5, len(products)))
            judgments = []
            for rp in rel_prods:
                judgments.append({
                    "product_id": rp['id'],
                    "relevance": random.randint(1, 3)
                })
            queries.append({
                "id": qid,
                "query_text": q_text,
                "category": cat['name'],
                "min_price": None,
                "max_price": 3000.0,
                "notes": "Generated eval query",
                "judgments": judgments
            })
            qid += 1
    return queries

if __name__ == "__main__":
    products = generate_products()
    queries = generate_queries(products)
    
    with open("app/data/seed_products.json", "w") as f:
        json.dump(products, f, indent=2)
        
    with open("app/data/eval_queries.json", "w") as f:
        json.dump(queries, f, indent=2)
        
    print("Seed JSON files generated successfully.")
