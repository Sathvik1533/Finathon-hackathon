"""Policy chat (RAG) and reindexing endpoints for AI microservice.
"""

from fastapi import APIRouter, Depends
from ai.app.security import verify_internal_key
from ai.app.schemas import (
    PolicyChatRequest,
    PolicyChatResponse,
    ReindexRequest,
    ReindexResponse,
)
from ai.app.rag.retriever import retriever_instance
from ai.app.guards import guard_g1_input_shaping

router = APIRouter(tags=["Policy"])


@router.post("/ai/policy-chat", response_model=PolicyChatResponse, dependencies=[Depends(verify_internal_key)])
def policy_chat(req: PolicyChatRequest):
    sanitized_question = guard_g1_input_shaping(req.question)
    matches = retriever_instance.retrieve(sanitized_question, threshold=req.threshold or 0.5)

    if not matches:
        return PolicyChatResponse(answer="no policy found", citedPolicyIds=[])

    best = matches[0]
    answer = f"According to {best['policy_key']} ('{best['title']}'): {best['text']}"
    return PolicyChatResponse(
        answer=answer,
        citedPolicyIds=[best["policy_key"]],
    )


@router.post("/ai/reindex", response_model=ReindexResponse, dependencies=[Depends(verify_internal_key)])
def reindex_policies(req: ReindexRequest):
    chunks = []
    for p in req.policies:
        chunks.append({
            "policy_key": p.get("policy_key", "POL_CUSTOM"),
            "title": p.get("title", "Custom Policy"),
            "text": p.get("body", ""),
            "keywords": p.get("body", "").lower().split()[:5],
        })
    retriever_instance.add_chunks(chunks)
    return ReindexResponse(indexed_chunks=len(chunks))
