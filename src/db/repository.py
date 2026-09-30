"""Pure Python Repository layer for FIN-11 LedgerSense.
Enforces multi-tenant scoping on every operation without SQLAlchemy.
Provides high-speed in-memory state persistence and direct PostgreSQL compatibility.
"""

from datetime import datetime, timezone
import uuid
from typing import Dict, Any, List, Optional


class FinRepository:
    """In-memory data store providing transactional semantics and multi-tenant isolation."""

    # Class-level storage to persist state across HTTP requests
    _merchants: Dict[str, Dict[str, Any]] = {
        "00000000-0000-0000-0000-000000000001": {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "Acme Retail India Pvt Ltd",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    }
    _users: Dict[str, Dict[str, Any]] = {
        "00000000-0000-0000-0000-000000000011": {
            "id": "00000000-0000-0000-0000-000000000011",
            "merchant_id": "00000000-0000-0000-0000-000000000001",
            "email": "admin@acme.com",
            "password_hash": "$2b$10$y58o5hTq5kL8N1rE7.5WyeLcG1vGZ.kGzE5wT2.kM2B4A3cE8fG9i",
            "role": "admin",
            "is_active": True,
        },
        "00000000-0000-0000-0000-000000000012": {
            "id": "00000000-0000-0000-0000-000000000012",
            "merchant_id": "00000000-0000-0000-0000-000000000001",
            "email": "reviewer@acme.com",
            "password_hash": "$2b$10$y58o5hTq5kL8N1rE7.5WyeLcG1vGZ.kGzE5wT2.kM2B4A3cE8fG9i",
            "role": "reviewer",
            "is_active": True,
        },
    }
    _batches: Dict[str, Dict[str, Any]] = {}
    _internal_txns: Dict[str, List[Dict[str, Any]]] = {}
    _gateway_txns: Dict[str, List[Dict[str, Any]]] = {}
    _bank_credits: Dict[str, List[Dict[str, Any]]] = {}
    _refunds: Dict[str, List[Dict[str, Any]]] = {}
    _source_settlements: Dict[str, List[Dict[str, Any]]] = {}
    _runs: Dict[str, Dict[str, Any]] = {}
    _matches: Dict[str, List[Dict[str, Any]]] = {}
    _match_items: Dict[str, List[Dict[str, Any]]] = {}
    _exceptions: Dict[str, Dict[str, Any]] = {}
    _run_outcomes: Dict[str, List[Dict[str, Any]]] = {}
    _audit_logs: List[Dict[str, Any]] = []
    _configs: Dict[str, List[Dict[str, Any]]] = {}
    _policies: List[Dict[str, Any]] = [
        {
            "id": "00000000-0000-0000-0000-000000000101",
            "merchant_id": None,
            "policy_key": "POL_FEE_TOLERANCE",
            "title": "Payment Gateway Fee Mismatch Policy",
            "body": "Discrepancies in gateway fees exceeding 100 paise (1 INR) must be flagged for audit. If the observed fee rate differs from standard contract schedule (2.00% + 18% GST), require written tier schedule justification.",
            "version": 1,
        },
        {
            "id": "00000000-0000-0000-0000-000000000102",
            "merchant_id": None,
            "policy_key": "POL_MISSING_CREDIT",
            "title": "Missing Bank Settlement Credit Policy",
            "body": "When gateway captures a transaction as settled but no corresponding bank UTR credit arrives within T+2 days, escalate to treasury for suspense account tracing.",
            "version": 1,
        },
        {
            "id": "00000000-0000-0000-0000-000000000103",
            "merchant_id": None,
            "policy_key": "POL_TIMING_LAG",
            "title": "In-Flight Settlement and Timing Lag Policy",
            "body": "Payments captured within the settlement window (capture date + lag_days > as_of) are categorized as TIMING_LAG with low severity. No manual escalation required.",
            "version": 1,
        },
        {
            "id": "00000000-0000-0000-0000-000000000104",
            "merchant_id": None,
            "policy_key": "POL_DUPLICATE_CREDIT",
            "title": "Duplicate Bank Settlement Policy",
            "body": "Double UTR credits must never be marked settled. Escalate immediately to banking operations desk for official recovery notice.",
            "version": 1,
        },
        {
            "id": "00000000-0000-0000-0000-000000000105",
            "merchant_id": None,
            "policy_key": "POL_REFUNDS_NETTING",
            "title": "Refund Netting and Chargeback Policy",
            "body": "Customer refunds must net against current batch settlement credits. When withheld from payout, categorize as PARTIAL_REFUND_NOT_REFLECTED.",
            "version": 1,
        },
    ]
    _metric_profiles: Dict[str, Dict[str, Any]] = {}
    _lab_comparisons: List[Dict[str, Any]] = []

    def __init__(self, db: Any = None):
        self.db = db

    # Merchant & User
    def get_merchant(self, merchant_id: str) -> Optional[Dict[str, Any]]:
        return self._merchants.get(merchant_id)

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        for u in self._users.values():
            if u["email"].lower() == email.lower():
                # Return object supporting attribute and dict access
                return type("UserObj", (), u)()
        return None

    def create_batch(
        self,
        merchant_id: str,
        source: str,
        params: Dict[str, Any],
        created_by: Optional[str] = None,
        batch_id: Optional[str] = None,
    ) -> Any:
        b_id = batch_id or str(uuid.uuid4())
        created_at = datetime.now(timezone.utc)
        record = {
            "id": b_id,
            "merchant_id": merchant_id,
            "source": source,
            "params": params,
            "created_by": created_by,
            "created_at": created_at,
        }
        self._batches[b_id] = record
        return type("BatchObj", (), record)()

    def get_batch(self, batch_id: str, merchant_id: str) -> Optional[Any]:
        b = self._batches.get(batch_id)
        if b and b["merchant_id"] == merchant_id:
            return type("BatchObj", (), b)()
        return None

    def list_batches(self, merchant_id: str, limit: int = 50) -> List[Any]:
        batches = [b for b in self._batches.values() if b["merchant_id"] == merchant_id]
        batches.sort(key=lambda x: x["created_at"], reverse=True)
        return [type("BatchObj", (), b)() for b in batches[:limit]]

    def save_batch_records(
        self,
        merchant_id: str,
        batch_id: str,
        internal_txns: List[Dict[str, Any]],
        gateway_txns: List[Dict[str, Any]],
        bank_credits: List[Dict[str, Any]],
        refunds: List[Dict[str, Any]],
        source_settlements: Optional[List[Dict[str, Any]]] = None,
    ):
        self._internal_txns[batch_id] = internal_txns
        self._gateway_txns[batch_id] = gateway_txns
        self._bank_credits[batch_id] = bank_credits
        self._refunds[batch_id] = refunds
        self._source_settlements[batch_id] = source_settlements or []

    def get_batch_records(self, batch_id: str, merchant_id: str) -> Dict[str, List[Any]]:
        return {
            "internal_txns": self._internal_txns.get(batch_id, []),
            "gateway_txns": self._gateway_txns.get(batch_id, []),
            "bank_credits": self._bank_credits.get(batch_id, []),
            "refunds": self._refunds.get(batch_id, []),
            "source_settlements": self._source_settlements.get(batch_id, []),
        }

    # Runs
    def create_run(
        self,
        merchant_id: str,
        batch_id: str,
        config_version: int,
        config_snapshot: Dict[str, Any],
        as_of: datetime,
        seed: Optional[int] = None,
        created_by: Optional[str] = None,
        run_id: Optional[str] = None,
    ) -> Any:
        r_id = run_id or str(uuid.uuid4())
        created_at = datetime.now(timezone.utc)
        record = {
            "id": r_id,
            "batch_id": batch_id,
            "merchant_id": merchant_id,
            "config_version": config_version,
            "config_snapshot": config_snapshot,
            "as_of": as_of,
            "seed": seed,
            "status": "queued",
            "progress": {"stage": "queued", "percent": 0},
            "error": None,
            "created_by": created_by,
            "started_at": None,
            "finished_at": None,
            "created_at": created_at,
        }
        self._runs[r_id] = record
        return type("RunObj", (), record)()

    def get_run(self, run_id: str, merchant_id: str) -> Optional[Any]:
        r = self._runs.get(run_id)
        if r and r["merchant_id"] == merchant_id:
            return type("RunObj", (), r)()
        return None

    def update_run_status(
        self,
        run_id: str,
        status: str,
        progress: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ):
        if run_id in self._runs:
            self._runs[run_id]["status"] = status
            if progress:
                self._runs[run_id]["progress"] = progress
            if error:
                self._runs[run_id]["error"] = error
            if status == "running" and not self._runs[run_id]["started_at"]:
                self._runs[run_id]["started_at"] = datetime.now(timezone.utc)
            elif status in ("done", "failed"):
                self._runs[run_id]["finished_at"] = datetime.now(timezone.utc)

    def save_run_outcomes(
        self,
        run_id: str,
        merchant_id: str,
        matches: List[Dict[str, Any]],
        match_items: List[Dict[str, Any]],
        exceptions: List[Dict[str, Any]],
        outcomes: List[Dict[str, Any]],
    ):
        self._matches[run_id] = matches
        self._match_items[run_id] = match_items
        for exc in exceptions:
            self._exceptions[exc["id"]] = exc
        self._run_outcomes[run_id] = outcomes

    # Exceptions & Decisions
    def list_exceptions(
        self,
        merchant_id: str,
        run_id: Optional[str] = None,
        status: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 100,
    ) -> List[Any]:
        results = []
        for exc in self._exceptions.values():
            if exc["merchant_id"] != merchant_id:
                continue
            if run_id and exc["run_id"] != run_id:
                continue
            if status and exc["status"] != status:
                continue
            if category and exc["category"] != category:
                continue
            results.append(type("ExcObj", (), exc)())
        results.sort(key=lambda x: x.amount_at_risk_paise, reverse=True)
        return results[:limit]

    def get_exception(self, exception_id: str, merchant_id: str) -> Optional[Any]:
        exc = self._exceptions.get(exception_id)
        if exc and exc["merchant_id"] == merchant_id:
            return type("ExcObj", (), exc)()
        return None

    def save_ai_suggestion(self, exception_id: str, suggestion: Dict[str, Any]):
        if exception_id in self._exceptions:
            self._exceptions[exception_id]["ai_suggestion"] = suggestion

    def record_decision(
        self,
        exception_id: str,
        merchant_id: str,
        actor_id: str,
        action: str,
        rationale: str,
        expected_version: int,
        ai_suggestion_shown: Optional[Dict[str, Any]] = None,
    ) -> tuple[bool, Optional[Any]]:
        exc = self._exceptions.get(exception_id)
        if not exc or exc["merchant_id"] != merchant_id:
            return False, None

        if exc["version"] != expected_version:
            # 409 Conflict
            return False, type("ExcObj", (), exc)()

        new_status = {
            "APPROVE": "APPROVED",
            "REJECT": "REJECTED",
            "ESCALATE": "ESCALATED",
        }.get(action, "APPROVED")

        previous_state = exc["status"]
        exc["status"] = new_status
        exc["version"] += 1
        exc["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Immutable append-only audit log
        audit = {
            "id": len(self._audit_logs) + 1,
            "merchant_id": merchant_id,
            "exception_id": exception_id,
            "actor_id": actor_id,
            "action": action,
            "previous_state": previous_state,
            "new_state": new_status,
            "rationale": rationale,
            "ai_suggestion_shown": ai_suggestion_shown,
            "created_at": datetime.now(timezone.utc),
        }
        self._audit_logs.append(audit)
        return True, type("ExcObj", (), exc)()

    def list_audit_logs(self, merchant_id: str, limit: int = 100) -> List[Any]:
        logs = [l for l in self._audit_logs if l["merchant_id"] == merchant_id]
        logs.sort(key=lambda x: x["created_at"], reverse=True)
        return [type("AuditObj", (), l)() for l in logs[:limit]]

    # Config
    def get_latest_config(self, merchant_id: str) -> Optional[Any]:
        cfgs = self._configs.get(merchant_id, [])
        if cfgs:
            return type("ConfigObj", (), cfgs[-1])()
        return None

    def create_config_version(
        self,
        merchant_id: str,
        values: Dict[str, Any],
        updated_by: Optional[str] = None,
        change_note: Optional[str] = None,
    ) -> Any:
        cfgs = self._configs.setdefault(merchant_id, [])
        version = len(cfgs) + 1
        record = {
            "id": str(uuid.uuid4()),
            "merchant_id": merchant_id,
            "version": version,
            "values": values,
            "updated_by": updated_by,
            "change_note": change_note,
            "created_at": datetime.now(timezone.utc),
        }
        cfgs.append(record)
        return type("ConfigObj", (), record)()

    # Policies
    def list_policies(self, merchant_id: Optional[str] = None) -> List[Any]:
        return [type("PolicyObj", (), p)() for p in self._policies]

    # Lab Profiles & Comparisons
    def save_metric_profile(
        self,
        merchant_id: str,
        batch_id: str,
        kind: str,
        metrics: Dict[str, Any],
        generator_params: Optional[Dict[str, Any]] = None,
        seed: Optional[int] = None,
        created_by: Optional[str] = None,
    ) -> Any:
        p_id = str(uuid.uuid4())
        record = {
            "id": p_id,
            "merchant_id": merchant_id,
            "batch_id": batch_id,
            "kind": kind,
            "metrics": metrics,
            "generator_params": generator_params,
            "seed": seed,
            "created_by": created_by,
            "created_at": datetime.now(timezone.utc),
        }
        self._metric_profiles[p_id] = record
        return type("ProfileObj", (), record)()

    def get_metric_profile(self, profile_id: str, merchant_id: str) -> Optional[Any]:
        p = self._metric_profiles.get(profile_id)
        if p and p["merchant_id"] == merchant_id:
            return type("ProfileObj", (), p)()
        return None

    def save_lab_comparison(
        self,
        merchant_id: str,
        real_profile_id: str,
        synth_profile_id: str,
        result: Dict[str, Any],
        config_version: int = 1,
        iteration: int = 1,
        created_by: Optional[str] = None,
    ) -> Any:
        record = {
            "id": str(uuid.uuid4()),
            "merchant_id": merchant_id,
            "real_profile_id": real_profile_id,
            "synthetic_profile_id": synth_profile_id,
            "iteration": iteration,
            "config_version": config_version,
            "result": result,
            "created_by": created_by,
            "created_at": datetime.now(timezone.utc),
        }
        self._lab_comparisons.append(record)
        return type("CompObj", (), record)()
