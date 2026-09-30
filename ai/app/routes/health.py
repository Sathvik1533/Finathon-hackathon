"""Health endpoint for AI microservice.
"""

from fastapi import APIRouter
from ai.app.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/ai/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok")
