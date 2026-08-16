"""API keys for external apps.

Long-lived, revocable tokens that let non-human clients call the API as a
user without handing out a password or short-lived JWT. Keys are shown once at
creation; only a hash is stored. Sending ``Authorization: Bearer <key>`` works
everywhere a user JWT does (see ``app.api.deps.get_current_user``).
"""

from __future__ import annotations

import secrets

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import ApiKey, ApiKeyCreated, ApiKeyPublic, Message

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


class ApiKeyCreateIn(BaseModel):
    name: str


def _generate_key() -> str:
    return f"{settings.API_KEY_PREFIX}_{secrets.token_urlsafe(32)}"


def _to_public(key: ApiKey) -> ApiKeyPublic:
    return ApiKeyPublic(
        id=key.id,
        name=key.name,
        created_at=key.created_at,
        revoked_at=key.revoked_at,
    )


@router.get("/", response_model=list[ApiKeyPublic])
def list_api_keys(*, session: SessionDep, current_user: CurrentUser) -> list[ApiKeyPublic]:
    """List the current user's API keys (never the keys themselves)."""
    keys = session.exec(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(col(ApiKey.created_at).desc())
    ).all()
    return [_to_public(k) for k in keys]


@router.post("/", response_model=ApiKeyCreated)
def create_api_key(
    *, session: SessionDep, current_user: CurrentUser, payload: ApiKeyCreateIn
) -> ApiKeyCreated:
    """Issue a new API key. The plaintext key is returned exactly once."""
    name = payload.name.strip()
    if not name or len(name) > 100:
        raise HTTPException(status_code=400, detail="name is required (max 100 chars)")
    key = _generate_key()
    api_key = ApiKey(
        user_id=current_user.id,
        name=name,
        key_hash=get_password_hash(key),
    )
    session.add(api_key)
    session.commit()
    session.refresh(api_key)
    return ApiKeyCreated(
        id=api_key.id,
        name=api_key.name,
        key=key,
        created_at=api_key.created_at,
        revoked_at=api_key.revoked_at,
    )


@router.delete("/{api_key_id}", response_model=Message)
def revoke_api_key(
    *, session: SessionDep, current_user: CurrentUser, api_key_id: str
) -> Message:
    """Revoke an API key. Revoked keys are kept but can no longer authenticate."""
    api_key = session.get(ApiKey, api_key_id)
    if not api_key or api_key.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="API key not found")
    from app.models import get_datetime_utc

    api_key.revoked_at = get_datetime_utc()
    session.add(api_key)
    session.commit()
    return Message(message="API key revoked")
