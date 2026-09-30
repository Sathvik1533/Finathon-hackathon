"""Main FastAPI application for FIN-11 LedgerSense Reconciliation & Settlement Platform.
Pure deterministic engine with PostgreSQL / Supabase schema integration.
"""

import uuid
from typing import Dict, Any
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from src import __version__
from src.middleware.redactor import redact_sensitive_string
from src.routes.auth_routes import router as auth_router
from src.routes.batch_routes import router as batch_router
from src.routes.run_routes import router as run_router
from src.routes.case_routes import router as case_router
from src.routes.metrics_routes import router as metrics_router
from src.routes.config_routes import router as config_router
from src.routes.lab_routes import router as lab_router
from src.routes.nova_routes import router as nova_router
from src.routes.ai_routes import router as ai_router

app = FastAPI(
    title="LedgerSense FIN-11 Reconciliation API",
    description="End-to-End Payment Reconciliation & Settlement Engine with Supabase / PostgreSQL",
    version=__version__,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_and_redaction_middleware(request: Request, call_next):
    """Assign X-Request-Id header and ensure sanitized error responses."""
    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    try:
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        return response
    except Exception as exc:
        err_msg = redact_sensitive_string(str(exc))
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": err_msg,
                    "requestId": request_id,
                }
            },
            headers={"X-Request-Id": request_id},
        )


# Mount core API routers
app.include_router(auth_router)
app.include_router(batch_router)
app.include_router(run_router)
app.include_router(case_router)
app.include_router(metrics_router)
app.include_router(config_router)
app.include_router(lab_router)
app.include_router(nova_router)
app.include_router(ai_router)


@app.get("/", tags=["Root"])
def root() -> Dict[str, Any]:
    """Root entry point returning service identification."""
    return {
        "service": "Finathon Hackathon API",
        "system": "FIN-11 LedgerSense Reconciliation Engine",
        "version": __version__,
        "status": "online",
    }


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check() -> Dict[str, Any]:
    """Health check endpoint used by CI/CD and container monitoring."""
    return {
        "status": "healthy",
        "version": __version__,
        "ready": True,
        "engine": "active",
    }


@app.get("/prototype", response_class=HTMLResponse, tags=["Frontend Prototype"])
@app.get("/web", response_class=HTMLResponse, tags=["Frontend Prototype"])
def serve_prototype() -> HTMLResponse:
    """Serves the interactive FIN-11 LedgerSense frontend dashboard prototype."""
    from pathlib import Path
    html_path = Path(__file__).resolve().parent.parent / "web" / "index.html"
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Prototype not found</h1>", status_code=404)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.app:app", host="0.0.0.0", port=8000, reload=True)
