"""Financial guardrails (G1 to G5) for FIN-11 LedgerSense AI Service.
- G1: Input shaping (truncation, control characters, <data> delimiters, injection defense)
- G2: Output schema validation
- G3: Number check (all output numbers must exist in the bundle or be small ints <= 10)
- G4: Citation check (all cited policy IDs must exist in the retrieved policy set)
- G5: Refusal of decisions (neutralize autonomous 'approve' or 'reject' imperative directives)
"""

import re
from typing import Dict, Any, List, Set


class AiGuardError(Exception):
    """Raised when an AI response fails financial guardrails."""
    pass


def guard_g1_input_shaping(text: str, max_chars: int = 300) -> str:
    """G1 Input Shaping: sanitize untrusted text and neutralize prompt injections."""
    if not text:
        return ""
    # Strip non-printable control characters
    cleaned = "".join(ch for ch in str(text) if ch.isprintable() or ch in "\n\t")
    cleaned = cleaned[:max_chars].strip()

    # Neutralize injection markers
    cleaned = re.sub(
        r"(ignore\s+(all\s+)?previous\s+instructions|system\s+prompt|disregard\s+prior|you\s+are\s+now)",
        "[REDACTED_INJECTION]",
        cleaned,
        flags=re.IGNORECASE,
    )
    return f'<data field="untrusted">{cleaned}</data>'


def guard_g3_number_check(output_text: str, evidence_bundle: Dict[str, Any]) -> bool:
    """G3 Number Check: numbers in model output must exist in the bundle or be small integers <= 10."""
    bundle_str = str(evidence_bundle)
    # Extract all digit sequences directly from original text
    raw_numbers = re.findall(r"\d+(?:\.\d+)?", output_text)
    numbers = [int(float(n)) for n in raw_numbers]

    for num in numbers:
        if num <= 10:
            continue
        num_str = str(num)
        if num_str in bundle_str:
            continue
        # Also check rupee representation (/100) or paise representation (*100)
        rupee_str = f"{num / 100:.2f}"
        if rupee_str in bundle_str or str(num * 100) in bundle_str:
            continue
        # Inventory numbers > 10 not present in bundle are disallowed
        if num > 10:
            return False
    return True


def guard_g4_citation_check(cited_policy_ids: List[str], valid_policy_ids: Set[str]) -> List[str]:
    """G4 Citation Check: prune any citations that do not exist in the retrieved policies."""
    return [pid for pid in cited_policy_ids if pid in valid_policy_ids]


def guard_g5_refusal_of_decisions(action_text: str) -> str:
    """G5 Refusal of Decisions: ensure AI never commands approval or rejection directly."""
    lower = action_text.lower().strip()
    if lower.startswith("approve") or " approve " in lower:
        return "Verify supporting documents under policy rules before human decision."
    if lower.startswith("reject") or " reject " in lower:
        return "Verify discrepancy under policy rules before human rejection."
    return action_text
