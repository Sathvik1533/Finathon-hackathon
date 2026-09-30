"""End-to-End API Integration Tests for FIN-11 LedgerSense REST API.
"""

from fastapi.testclient import TestClient
from src.app import app


def test_auth_and_session_flow():
    client = TestClient(app)

    # 1. Login with demo admin
    res = client.post("/api/auth/login", json={"email": "admin@acme.com", "password": "Password123!"})
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["role"] == "admin"

    # 2. Query /api/auth/me
    token = data["token"]
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "admin"


def test_e2e_reconciliation_workflow():
    client = TestClient(app)

    # Login
    auth_res = client.post("/api/auth/login", json={"email": "admin@acme.com", "password": "Password123!"})
    token = auth_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Simulate a batch
    batch_res = client.post("/api/batches/simulate", json={"size": 30, "seed": 42}, headers=headers)
    assert batch_res.status_code == 200
    batch_data = batch_res.json()
    batch_id = batch_data["id"]
    assert batch_data["source"] == "simulated"

    # Step 2: Start a reconciliation run
    run_res = client.post("/api/runs", json={"batch_id": batch_id, "as_of": "2026-09-30T18:00:00Z"}, headers=headers)
    assert run_res.status_code == 200
    run_data = run_res.json()
    run_id = run_data["id"]
    assert run_data["status"] in ("queued", "running", "done")

    # Step 3: Fetch exceptions queue
    exc_res = client.get(f"/api/exceptions?run_id={run_id}", headers=headers)
    assert exc_res.status_code == 200
    exceptions = exc_res.json()
    assert len(exceptions) > 0

    # Step 4: Open a case dossier
    first_case = exceptions[0]
    case_id = first_case["id"]
    case_res = client.get(f"/api/cases/{case_id}", headers=headers)
    assert case_res.status_code == 200
    assert case_res.json()["id"] == case_id

    # Step 5: Record an analyst decision (Approved)
    dec_res = client.post(
        f"/api/cases/{case_id}/decision",
        json={"action": "APPROVE", "rationale": "Verified MDR contract volume exception.", "expected_version": 1},
        headers=headers,
    )
    assert dec_res.status_code == 200
    assert dec_res.json()["status"] == "APPROVED"
    assert dec_res.json()["version"] == 2

    # Step 6: Test 409 Conflict with stale version
    conflict_res = client.post(
        f"/api/cases/{case_id}/decision",
        json={"action": "REJECT", "rationale": "Dispute fee.", "expected_version": 1},
        headers=headers,
    )
    assert conflict_res.status_code == 409

    # Step 7: Check audit trail
    audit_res = client.get("/api/audit", headers=headers)
    assert audit_res.status_code == 200
    audits = audit_res.json()
    assert any(a["exception_id"] == case_id for a in audits)

    # Step 8: Fetch Metrics & Benchmark
    metrics_res = client.get(f"/api/metrics/{run_id}", headers=headers)
    assert metrics_res.status_code == 200
    metrics_data = metrics_res.json()
    assert "match_rate_pct" in metrics_data
    assert "benchmark" in metrics_data

    # Step 9: Export Report (JSON and CSV)
    json_report = client.get(f"/api/reports/{run_id}?format=json", headers=headers)
    assert json_report.status_code == 200

    csv_report = client.get(f"/api/reports/{run_id}?format=csv", headers=headers)
    assert csv_report.status_code == 200
    assert "Run ID" in csv_report.text


def test_config_versioning_and_lab():
    client = TestClient(app)

    auth_res = client.post("/api/auth/login", json={"email": "admin@acme.com", "password": "Password123!"})
    token = auth_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch config
    cfg_res = client.get("/api/config", headers=headers)
    assert cfg_res.status_code == 200
    old_version = cfg_res.json()["version"]

    # Update config (creates version N+1)
    new_values = cfg_res.json()["values"]
    new_values["fees"]["fee_bps"] = 250
    update_res = client.put(
        "/api/config",
        json={"values": new_values, "change_note": "Adjusted fee schedule for Q4"},
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["new_version"] == old_version + 1


def test_nova_status_endpoint():
    client = TestClient(app)
    auth_res = client.post("/api/auth/login", json={"email": "admin@acme.com", "password": "Password123!"})
    token = auth_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/nova/status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "rate_limit_per_min" in data
    assert "key_prefix" in data
