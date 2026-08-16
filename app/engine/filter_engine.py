from sqlalchemy.orm import Session
from app.models.product import Product, Category

class FilterEngine:
    @staticmethod
    def get_candidate_ids(
        category: str | None,
        min_price: float | None,
        max_price: float | None,
        db: Session
    ) -> list[int]:
        """
        Query active products matching category and price constraints.
        Returns list of product IDs passing all filters.
        """
        query = db.query(Product.id).filter(Product.is_active == True)

        if category:
            query = query.join(Product.category).filter(Category.name.ilike(f"%{category}%"))
            
        if min_price is not None:
            query = query.filter(Product.price >= min_price)
            
        if max_price is not None:
            query = query.filter(Product.price <= max_price)
            
        # Return flat list of IDs
        return [r[0] for r in query.all()]
