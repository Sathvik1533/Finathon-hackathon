"""Tests for AI Service Security and X-Internal-Key authentication.
"""

from fastapi.testclient import TestClient
from ai.app.main import app

client = TestClient(app)
VALID_KEY = "fin11-internal-secret-key"


def test_ai_health_does_not_require_key():
    resp = client.get("/ai/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_ai_routes_require_internal_key():
    # Without key -> 401
    resp = client.post("/ai/policy-chat", json={"question": "What is the fee policy?"})
    assert resp.status_code == 401

    # With invalid key -> 401
    resp = client.post(
        "/ai/policy-chat",
        headers={"X-Internal-Key": "wrong-secret-key"},
        json={"question": "What is the fee policy?"},
    )
    assert resp.status_code == 401

    # With valid key -> 200
    resp = client.post(
        "/ai/policy-chat",
        headers={"X-Internal-Key": VALID_KEY},
        json={"question": "What is the fee policy?"},
    )
    assert resp.status_code == 200
