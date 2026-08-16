from dataclasses import dataclass, field
from typing import Optional

@dataclass
class PostingEntry:
    fields: dict[str, int]  # {"name": tf, "description": tf, "category": tf, "specs": tf}
    total_tf: int

@dataclass
class TermEntry:
    doc_freq: int
    postings: dict[int, PostingEntry]  # product_id -> PostingEntry

@dataclass
class CorpusStats:
    total_documents: int
    avg_doc_length: float
    avg_field_lengths: dict[str, float]  # {"name": float, "description": float, ...}
    doc_lengths: dict[int, int]          # product_id -> total tokens (unweighted)
    field_lengths: dict[int, dict[str, int]]  # product_id -> {"name": length, ...}

class IndexStore:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(IndexStore, cls).__new__(cls, *args, **kwargs)
            cls._instance.index = {}
            cls._instance.corpus_stats = None
            cls._instance.is_ready = False
        return cls._instance

    def reset(self):
        self.index = {}
        self.corpus_stats = None
        self.is_ready = False
