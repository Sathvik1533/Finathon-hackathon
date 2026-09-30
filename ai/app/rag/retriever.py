"""In-memory and PGVector retriever for policy chunks.
"""

from typing import List, Dict, Any, Optional


class PolicyRetriever:
    """Manages policy indexing and scoped similarity search."""

    def __init__(self):
        self._chunks: List[Dict[str, Any]] = [
            {
                "policy_key": "POL_FEE_TOLERANCE",
                "title": "Payment Gateway Fee Mismatch Policy",
                "text": "Discrepancies in gateway fees exceeding 100 paise (1 INR) must be flagged for audit. If the observed fee rate differs from standard contract schedule (2.00% + 18% GST), require written tier schedule justification.",
                "keywords": ["fee", "mdr", "gst", "tolerance", "rate", "schedule", "mismatch"],
            },
            {
                "policy_key": "POL_MISSING_CREDIT",
                "title": "Missing Bank Settlement Credit Policy",
                "text": "When gateway captures a transaction as settled but no corresponding bank UTR credit arrives within T+2 days, escalate to treasury for suspense account tracing.",
                "keywords": ["missing", "credit", "utr", "uncredited", "t+2", "settled"],
            },
            {
                "policy_key": "POL_TIMING_LAG",
                "title": "In-Flight Settlement and Timing Lag Policy",
                "text": "Payments captured within the settlement window (capture date + lag_days > as_of) are categorized as TIMING_LAG with low severity. No manual escalation required.",
                "keywords": ["timing", "lag", "in-flight", "window", "cutoff", "settlement"],
            },
            {
                "policy_key": "POL_DUPLICATE_CREDIT",
                "title": "Duplicate Bank Settlement Policy",
                "text": "Double UTR credits must never be marked settled. Escalate immediately to banking operations desk for official recovery notice.",
                "keywords": ["duplicate", "double", "surplus", "double bank", "duplicate credit"],
            },
            {
                "policy_key": "POL_REFUNDS_NETTING",
                "title": "Refund Netting and Chargeback Policy",
                "text": "Customer refunds must net against current batch settlement credits. When withheld from payout, categorize as PARTIAL_REFUND_NOT_REFLECTED.",
                "keywords": ["refund", "refunds", "netting", "reversal", "chargeback", "partial refund"],
            },
        ]

    def retrieve(self, query: str, threshold: float = 0.5) -> List[Dict[str, Any]]:
        query_lower = query.lower()
        scored_results = []
        for chunk in self._chunks:
            matches = sum(1 for kw in chunk["keywords"] if kw in query_lower)
            if matches > 0:
                scored_results.append((matches, chunk))
        scored_results.sort(key=lambda x: x[0], reverse=True)
        return [chunk for _, chunk in scored_results]

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        self._chunks.extend(chunks)


retriever_instance = PolicyRetriever()
