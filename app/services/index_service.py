import os
import pickle
import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.config import INDEX_PATH
from app.models.index import IndexStore
from app.engine.index_builder import IndexBuilder
from app.models.product import Product

logger = logging.getLogger(__name__)

class IndexService:
    @staticmethod
    def build_index(db: Session) -> None:
        """
        Fetches all active products, builds the inverted index and corpus stats,
        and serializes them to data/index.pkl.
        """
        logger.info("Building inverted index from database...")
        # Get active products with categories and specifications eagerly loaded to avoid N+1 queries
        products = db.query(Product).filter(Product.is_active == True).all()
        
        builder = IndexBuilder()
        index, corpus_stats = builder.build(products)
        
        # Ensure target directory exists
        os.makedirs(os.path.dirname(INDEX_PATH), exist_ok=True)
        
        # Serialize to pickle
        with open(INDEX_PATH, "wb") as f:
            pickle.dump((index, corpus_stats), f, protocol=pickle.HIGHEST_PROTOCOL)
            
        logger.info("Inverted index successfully built and saved to %s", INDEX_PATH)
        
        # Update the IndexStore singleton
        store = IndexStore()
        store.index = index
        store.corpus_stats = corpus_stats
        store.is_ready = True

    @staticmethod
    def load_index(db: Optional[Session] = None) -> None:
        """
        Loads the inverted index from data/index.pkl into the IndexStore singleton.
        If the file does not exist and a db session is provided, it triggers a rebuild.
        """
        store = IndexStore()
        if not os.path.exists(INDEX_PATH):
            if db is not None:
                logger.warning("Index file not found. Rebuilding index...")
                IndexService.build_index(db)
                return
            else:
                logger.error("Index file %s not found and no database session provided.", INDEX_PATH)
                store.is_ready = False
                return

        logger.info("Loading inverted index from %s...", INDEX_PATH)
        try:
            with open(INDEX_PATH, "rb") as f:
                index, corpus_stats = pickle.load(f)
            
            # Simple validation
            if not isinstance(index, dict) or corpus_stats is None:
                raise ValueError("Invalid index file format.")
                
            store.index = index
            store.corpus_stats = corpus_stats
            store.is_ready = True
            logger.info("Inverted index loaded successfully. Ready to serve requests.")
        except Exception as e:
            logger.exception("Failed to load inverted index: %s", e)
            store.is_ready = False

    @staticmethod
    def is_ready() -> bool:
        """Returns True if the index is loaded and ready in memory."""
        return IndexStore().is_ready
