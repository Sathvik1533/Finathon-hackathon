"""Integration tests for AI features within the main LedgerSense FastAPI application.
Verifies Explain Case, Policy RAG Chat, Controller Brief, and Reference Suggestions.
"""

from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)


def get_auth_token():
    resp = client.post("/api/auth/login", json={"email": "reviewer@acme.com", "password": "Password123!"})
    assert resp.status_code == 200
    return resp.json()["token"]


def test_ai_health_endpoint():
    resp = client.get("/api/ai/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_ai_policy_chat_grounded_response():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Known policy inquiry
    resp = client.post(
        "/api/ai/policy-chat",
        headers=headers,
        json={"query": "What is the policy for payment gateway fee mismatch?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "POL_FEE_TOLERANCE" in data["citedPolicyIds"]
    assert "100 paise" in data["answer"]


def test_ai_policy_chat_out_of_domain_no_policy_found():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Out of domain question
    resp = client.post(
        "/api/ai/policy-chat",
        headers=headers,
        json={"query": "How many moons does Jupiter have?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["answer"] == "no policy found"
    assert data["citedPolicyIds"] == []


def test_ai_explain_case_and_caching():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Run simulation and reconciliation to generate a real case
    batch_resp = client.post(
        "/api/batches/simulate",
        headers=headers,
        json={"size": 10, "seed": 42},
    )
    assert batch_resp.status_code == 200
    batch_id = batch_resp.json()["id"]

    run_resp = client.post(
        "/api/runs",
        headers=headers,
        json={"batch_id": batch_id, "seed": 42},
    )
    assert run_resp.status_code == 200
    run_id = run_resp.json()["id"]

    # 2. Get exceptions
    exc_resp = client.get(f"/api/exceptions?run_id={run_id}", headers=headers)
    assert exc_resp.status_code == 200
    exceptions = exc_resp.json()
    assert len(exceptions) > 0
    target_case = exceptions[0]

    # 3. Call AI explanation
    ai_resp = client.post(
        f"/api/cases/{target_case['id']}/ai-explain",
        headers=headers,
        json={"exception_id": target_case["id"]},
    )
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()
    assert "explanation" in ai_data
    assert "suggestedAction" in ai_data
    assert "approve this" not in ai_data["suggestedAction"].lower()
    assert ai_data["confidence"] > 0.8

    # 4. Request case dossier again and verify ai_suggestion is present
    dossier_resp = client.get(f"/api/cases/{target_case['id']}", headers=headers)
    assert dossier_resp.status_code == 200
    dossier = dossier_resp.json()
    assert dossier["ai_suggestion"] is not None


def test_ai_run_brief_and_suggest_refs():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate batch and run
    batch_resp = client.post("/api/batches/simulate", headers=headers, json={"size": 10, "seed": 42})
    batch_id = batch_resp.json()["id"]
    run_resp = client.post("/api/runs", headers=headers, json={"batch_id": batch_id, "seed": 42})
    run_id = run_resp.json()["id"]

    # AI Brief
    brief_resp = client.post("/api/ai/brief", headers=headers, json={"run_id": run_id})
    assert brief_resp.status_code == 200
    brief_data = brief_resp.json()
    assert run_id in brief_data["brief"]

    # Suggest Refs
    narrations = [
        "CMS/NODAL/set_9901/CITIN00012/NET_PAYOUT",
        "UPI/109283746192/PAYOUT",
    ]
    refs_resp = client.post("/api/ai/suggest-refs", headers=headers, json={"narrations": narrations})
    assert refs_resp.status_code == 200
    suggestions = refs_resp.json()["suggestions"]
    assert len(suggestions) == 2
    assert suggestions[0]["candidate_ref"] == "set_9901"
