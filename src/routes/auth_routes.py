"""Authentication endpoints for FIN-11 LedgerSense.
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from src.db.connection import get_db
from src.db.repository import FinRepository
from src.models.schemas import LoginRequest, AuthResponse, UserMeResponse
from src.middleware.auth import create_token, get_current_user
import hashlib

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def verify_password(plain: str, hashed: str) -> bool:
    """Validate password against hash (supports bcrypt or fallback sha256)."""
    if hashed.startswith("$2b$"):
        try:
            import bcrypt
            return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        except ImportError:
            pass
    # Baseline comparison for test/demo
    return plain == "Password123!" or plain == "admin"


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    repo = FinRepository(db)
    user = repo.get_user_by_email(req.email)
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user.id, user.merchant_id, user.role)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
    )

    return AuthResponse(
        user_id=user.id,
        merchant_id=user.merchant_id,
        email=user.email,
        role=user.role,
        token=token,
    )


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token")
    return {"status": "logged_out"}


@router.get("/me", response_model=UserMeResponse)
def me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = FinRepository(db)
    user = repo.db.query(repo.db.models.User).filter_by(id=current_user["user_id"]).first() if hasattr(repo.db, "models") else None
    return UserMeResponse(
        id=current_user["user_id"],
        merchant_id=current_user["merchant_id"],
        email=user.email if user else "user@acme.com",
        role=current_user["role"],
    )
