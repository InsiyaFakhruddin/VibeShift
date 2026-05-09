from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
import jwt
import os

from database import User, get_session

_bearer = HTTPBearer()
_jwks_client = None


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        url = os.getenv("CLERK_JWKS_URL", "")
        if not url:
            raise RuntimeError("CLERK_JWKS_URL not set in environment")
        _jwks_client = jwt.PyJWKClient(url, cache_keys=True)
    return _jwks_client


def _verify_token(token: str) -> str:
    """Verify a Clerk JWT and return the Clerk user ID (sub claim)."""
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        data = jwt.decode(token, signing_key.key, algorithms=["RS256"])
        return data["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_clerk_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    return _verify_token(credentials.credentials)


def get_current_user(
    clerk_user_id: str = Depends(get_clerk_user_id),
    session: Session = Depends(get_session),
) -> User:
    user = session.exec(select(User).where(User.clerk_user_id == clerk_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Call POST /auth/sync first.")
    return user