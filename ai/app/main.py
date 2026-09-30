"""FastAPI entry point for FIN-11 LedgerSense AI Service.
Disables OpenAPI docs in production.
Enforces X-Internal-Key on all routes except /ai/health.
"""

import os
from fastapi import FastAPI
from ai.app.routes.health import router as health_router
from ai.app.routes.explain import router as explain_router
from ai.app.routes.policy import router as policy_router
from ai.app.routes.brief import router as brief_router
from ai.app.routes.investigate import router as investigate_router

is_prod = os.getenv("ENV", "development").lower() == "production"

app = FastAPI(
    title="LedgerSense AI Service",
    description="Deterministic-first AI Explanation, Policy RAG, and Summarization Service",
    docs_url=None if is_prod else "/docs",
    openapi_url=None if is_prod else "/openapi.json",
    redoc_url=None,
)

app.include_router(health_router)
app.include_router(explain_router)
app.include_router(policy_router)
app.include_router(brief_router)
app.include_router(investigate_router)
