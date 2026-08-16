import os
import sys
import logging

# Ensure root of project is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.services.index_service import IndexService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def main():
    logger.info("CLI build_index started.")
    db = SessionLocal()
    try:
        IndexService.build_index(db)
        logger.info("CLI build_index completed successfully.")
    except Exception as e:
        logger.exception("CLI build_index failed: %s", e)
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
