"""Pydantic request and response schemas for FIN-11 LedgerSense AI Service.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class ExplainCaseRequest(BaseModel):
    bundle: Dict[str, Any]
    source: Optional[str] = "simulated"


class ExplainCaseResponse(BaseModel):
    explanation: str
    suggestedAction: str
    citedPolicyIds: List[str]
    confidence: float


class PolicyChatRequest(BaseModel):
    question: str
    merchant_id: Optional[str] = None
    threshold: Optional[float] = 0.5


class PolicyChatResponse(BaseModel):
    answer: str
    citedPolicyIds: List[str]


class ReindexRequest(BaseModel):
    policies: List[Dict[str, Any]]


class ReindexResponse(BaseModel):
    indexed_chunks: int


class RunBriefRequest(BaseModel):
    metrics: Dict[str, Any]
    source: str = Field(..., pattern="^(simulated|upload|nova|razorpay)$")


class RunBriefResponse(BaseModel):
    brief: str
    source: str


class LabNarrativeRequest(BaseModel):
    comparator_result: Dict[str, Any]


class LabNarrativeResponse(BaseModel):
    narrative: str
    recommendations: List[str]


class InvestigateRequest(BaseModel):
    bundle: Dict[str, Any]


class InvestigateResponse(BaseModel):
    steps: List[str]
    draft_note: str


class SuggestRefsRequest(BaseModel):
    narrations: List[str] = Field(..., max_length=20)


class SuggestRefsResponse(BaseModel):
    suggestions: List[Dict[str, Any]]


class EvalQuestion(BaseModel):
    id: str
    question: str
    expected_policy_id: Optional[str] = None


class EvalRequest(BaseModel):
    questions: Optional[List[EvalQuestion]] = None


class EvalResponse(BaseModel):
    total_questions: int
    faithfulness_score: float
    citation_accuracy: float
    no_policy_found_count: int
