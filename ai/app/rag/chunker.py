"""Chunker for policy documents.
"""

from typing import List, Dict, Any


def chunk_policy_text(policy_key: str, body: str, chunk_size: int = 150) -> List[Dict[str, Any]]:
    """Splits policy text into bounded, citation-tagged chunks."""
    words = body.split()
    chunks = []
    idx = 0
    start = 0
    while start < len(words):
        chunk_words = words[start : start + chunk_size]
        chunks.append({
            "chunk_index": idx,
            "policy_key": policy_key,
            "text": " ".join(chunk_words),
        })
        idx += 1
        start += chunk_size
    return chunks
