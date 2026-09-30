"""Pydantic request and response schemas for FIN-11 REST API.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


# Auth
class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    user_id: str
    merchant_id: str
    email: str
    role: str
    token: str


class UserMeResponse(BaseModel):
    id: str
    merchant_id: str
    email: str
    role: str


# Batch Simulation
class SimulateBatchRequest(BaseModel):
    size: int = Field(default=100, ge=5, le=50000)
    seed: int = Field(default=42)
    fee_bps: int = Field(default=200, ge=0, le=10000)
    gst_bps: int = Field(default=1800, ge=0, le=10000)
    settlement_lag_days: int = Field(default=2, ge=0, le=30)
    profile_id: Optional[str] = None
    exception_rates: Optional[Dict[str, float]] = None


class BatchResponse(BaseModel):
    id: str
    merchant_id: str
    source: str
    params: Dict[str, Any]
    created_at: str


# Run
class CreateRunRequest(BaseModel):
    batch_id: str
    seed: Optional[int] = None
    as_of: Optional[str] = None


class RunResponse(BaseModel):
    id: str
    batch_id: str
    merchant_id: str
    config_version: int
    status: str
    progress: Dict[str, Any]
    created_at: str


# Decision
class DecisionRequest(BaseModel):
    action: str = Field(..., pattern="^(APPROVE|REJECT|ESCALATE)$")
    rationale: str = Field(..., min_length=3, max_length=1000)
    expected_version: int


class ExceptionResponse(BaseModel):
    id: str
    run_id: str
    merchant_id: str
    category: str
    severity: str
    amount_at_risk_paise: int
    status: str
    version: int
    evidence: Dict[str, Any]
    ai_suggestion: Optional[Dict[str, Any]] = None
    created_at: str


# Config
class UpdateConfigRequest(BaseModel):
    values: Dict[str, Any]
    change_note: Optional[str] = None


# AI Endpoints
class ExplainCaseRequest(BaseModel):
    exception_id: str


class PolicyChatRequest(BaseModel):
    query: str


class RunBriefRequest(BaseModel):
    run_id: str


class LabNarrativeRequest(BaseModel):
    comparison_id: str


# Lab
class CreateProfileRequest(BaseModel):
    batch_id: str


class CompareProfilesRequest(BaseModel):
    real_profile_id: str
    synthetic_profile_id: str
