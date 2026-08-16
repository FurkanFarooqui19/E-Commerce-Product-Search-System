from collections import defaultdict
from app.models.product import Product
from app.models.index import TermEntry, PostingEntry, CorpusStats
from app.engine.preprocessor import QueryPreprocessor

class IndexBuilder:
    def __init__(self):
        self.preprocessor = QueryPreprocessor()

    def build(self, products: list[Product]) -> tuple[dict[str, TermEntry], CorpusStats]:
        index: dict[str, TermEntry] = {}
        
        # Maps term -> set of product_ids that contain it, to compute doc_freq later
        term_doc_sets = defaultdict(set)
        # Maps term -> product_id -> field_name -> raw_tf
        term_postings = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))

        doc_lengths = {}
        field_lengths = {}
        
        total_field_lengths = {"name": 0, "description": 0, "category": 0, "specs": 0}
        
        for prod in products:
            pid = prod.id
            cat_name = prod.category.name if prod.category else ""
            specs_text = prod.specs_as_text()
            
            fields_data = {
                "name": prod.name or "",
                "description": prod.description or "",
                "category": cat_name,
                "specs": specs_text
            }
            
            prod_field_lengths = {}
            total_prod_len = 0
            
            for field_name, text in fields_data.items():
                tokens = self.preprocessor.process(text)
                tokens_count = len(tokens)
                prod_field_lengths[field_name] = tokens_count
                total_prod_len += tokens_count
                total_field_lengths[field_name] += tokens_count
                
                # Accumulate tf
                for token in tokens:
                    term_doc_sets[token].add(pid)
                    term_postings[token][pid][field_name] += 1
            
            doc_lengths[pid] = total_prod_len
            field_lengths[pid] = prod_field_lengths

        N = len(products)
        
        avg_doc_length = sum(doc_lengths.values()) / N if N > 0 else 0.0
        avg_field_lengths = {
            field_name: (total_len / N if N > 0 else 0.0)
            for field_name, total_len in total_field_lengths.items()
        }
        
        corpus_stats = CorpusStats(
            total_documents=N,
            avg_doc_length=avg_doc_length,
            avg_field_lengths=avg_field_lengths,
            doc_lengths=doc_lengths,
            field_lengths=field_lengths
        )

        # Build TermEntry objects
        for term, doc_ids in term_doc_sets.items():
            postings_dict = {}
            for pid in doc_ids:
                fields_tf = {
                    "name": term_postings[term][pid]["name"],
                    "description": term_postings[term][pid]["description"],
                    "category": term_postings[term][pid]["category"],
                    "specs": term_postings[term][pid]["specs"]
                }
                total_tf = sum(fields_tf.values())
                postings_dict[pid] = PostingEntry(fields=fields_tf, total_tf=total_tf)
                
            index[term] = TermEntry(
                doc_freq=len(doc_ids),
                postings=postings_dict
            )

        return index, corpus_stats
