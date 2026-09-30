"""Unit tests for optimistic concurrency control (HTTP 409) and append-only audit logging.
"""

from src.db.repository import FinRepository


def test_optimistic_locking_and_audit_logging():
    repo = FinRepository()
    merchant_id = "00000000-0000-0000-0000-000000000001"
    actor_id = "00000000-0000-0000-0000-000000000011"

    # Create dummy exception
    exc_id = "exc_concurrency_test"
    repo._exceptions[exc_id] = {
        "id": exc_id,
        "run_id": "run_test",
        "merchant_id": merchant_id,
        "category": "FEE_MISMATCH",
        "severity": "medium",
        "amount_at_risk_paise": 5000,
        "status": "OPEN",
        "version": 1,
        "evidence": {"fee": 5000},
        "ai_suggestion": None,
    }

    # First reviewer approves with expected_version = 1 -> Should Succeed
    success1, updated_exc = repo.record_decision(
        exception_id=exc_id,
        merchant_id=merchant_id,
        actor_id=actor_id,
        action="APPROVE",
        rationale="Verified with merchant tier contract schedule.",
        expected_version=1,
    )
    assert success1 is True
    assert updated_exc.status == "APPROVED"
    assert updated_exc.version == 2

    # Second reviewer (or concurrent tab) submits decision with old expected_version = 1 -> Must Fail with 409 Conflict
    success2, conflict_exc = repo.record_decision(
        exception_id=exc_id,
        merchant_id=merchant_id,
        actor_id=actor_id,
        action="REJECT",
        rationale="Discrepancy too large.",
        expected_version=1,
    )
    assert success2 is False
    assert conflict_exc.version == 2
    assert conflict_exc.status == "APPROVED"

    # Verify immutable audit log recorded the action
    audit_trail = repo.list_audit_logs(merchant_id)
    assert len(audit_trail) > 0
    latest_audit = audit_trail[0]
    assert latest_audit.exception_id == exc_id
    assert latest_audit.action == "APPROVE"
    assert latest_audit.previous_state == "OPEN"
    assert latest_audit.new_state == "APPROVED"
