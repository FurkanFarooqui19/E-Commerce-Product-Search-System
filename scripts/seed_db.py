import json
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.database import engine, Base
from app.models.product import Category, Product, ProductSpecification
from app.models.evaluation import EvaluationQuery, RelevanceJudgment

def seed_db():
    print("Seeding database...")
    
    with open('app/data/seed_products.json', 'r') as f:
        products_data = json.load(f)
        
    with open('app/data/eval_queries.json', 'r') as f:
        queries_data = json.load(f)

    with Session(engine) as session:
        # Seed Categories
        categories_data = [
            {"id": 1, "name": "Electronics", "slug": "electronics", "description": "Consumer electronics"},
            {"id": 2, "name": "Clothing & Apparel", "slug": "clothing-apparel", "description": "Fashion"},
            {"id": 3, "name": "Books", "slug": "books", "description": "Books"},
            {"id": 4, "name": "Home & Kitchen", "slug": "home-kitchen", "description": "Home"},
            {"id": 5, "name": "Sports & Outdoors", "slug": "sports-outdoors", "description": "Sports"},
            {"id": 6, "name": "Health & Beauty", "slug": "health-beauty", "description": "Health"},
            {"id": 7, "name": "Toys & Games", "slug": "toys-games", "description": "Toys"},
            {"id": 8, "name": "Automotive", "slug": "automotive", "description": "Automotive"}
        ]
        
        for cat in categories_data:
            if not session.get(Category, cat['id']):
                session.add(Category(**cat))
        
        session.commit()

        # Seed Products
        for raw_product in products_data:
            p_data = dict(raw_product)
            specs_data = p_data.pop('specifications', [])

            if 'created_at' in p_data and isinstance(p_data['created_at'], str):
                from datetime import datetime
                p_data['created_at'] = datetime.fromisoformat(p_data['created_at'])

            existing = session.get(Product, p_data['id'])
            if existing:
                for key, value in p_data.items():
                    setattr(existing, key, value)
                prod = existing
            else:
                prod = Product(**p_data)
                session.add(prod)
                session.flush()

            session.query(ProductSpecification).filter(
                ProductSpecification.product_id == prod.id
            ).delete(synchronize_session=False)
            for spec in specs_data:
                session.add(ProductSpecification(
                    product_id=prod.id,
                    spec_key=spec['spec_key'],
                    spec_value=spec['spec_value']
                ))
        
        session.commit()
        
        # Seed Evaluation Queries
        # Keep DB evaluation set strictly synchronized with app/data/eval_queries.json
        # to guarantee reproducible benchmarks (no stale rows, no duplicate leftovers).
        session.query(RelevanceJudgment).delete(synchronize_session=False)
        session.query(EvaluationQuery).delete(synchronize_session=False)
        session.flush()

        for raw_query in queries_data:
            q_data = dict(raw_query)
            judgments_data = q_data.pop('judgments', [])

            query = EvaluationQuery(**q_data)
            session.add(query)
            session.flush()

            for j_data in judgments_data:
                session.add(RelevanceJudgment(
                    query_id=query.id,
                    product_id=j_data['product_id'],
                    relevance=j_data['relevance']
                ))
                    
        session.commit()
        print("Database seeding completed.")

if __name__ == "__main__":
    seed_db()
