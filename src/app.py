"""Main FastAPI application for Finathon Hackathon."""

from typing import Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src import __version__

app = FastAPI(
    title="Finathon API",
    description="Backend services for Finathon Hackathon platform",
    version=__version__,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
def root() -> Dict[str, Any]:
    """Root entry point returning service identification."""
    return {
        "service": "Finathon Hackathon API",
        "version": __version__,
        "status": "online",
    }


@app.get("/health", tags=["Health"])
def health_check() -> Dict[str, Any]:
    """Health check endpoint used by CI/CD and container monitoring."""
    return {
        "status": "healthy",
        "version": __version__,
        "ready": True,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.app:app", host="0.0.0.0", port=8000, reload=True)
