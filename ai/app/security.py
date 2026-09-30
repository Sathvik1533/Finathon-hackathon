"""Security middleware for FIN-11 LedgerSense AI Service.
Validates X-Internal-Key header using constant-time comparison.
"""

import hmac
import os
from fastapi import Header, HTTPException, status

INTERNAL_KEY = os.getenv("INTERNAL_KEY", "fin11-internal-secret-key")


def verify_internal_key(x_internal_key: str = Header(None, alias="X-Internal-Key")):
    """Ensure incoming request contains valid X-Internal-Key in constant time."""
    if not x_internal_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required X-Internal-Key header",
        )
    if not hmac.compare_digest(x_internal_key, INTERNAL_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-Internal-Key",
        )
    return True
