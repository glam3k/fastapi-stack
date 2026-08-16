from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.models import TokenPayload, User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator[Session]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    # API keys: tokens that are not JWTs are looked up by their hash.
    if not _looks_like_jwt(token):
        user = _get_user_by_api_key(session, token)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Could not validate credentials",
            )
        return user

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.get(User, token_data.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def _looks_like_jwt(token: str) -> bool:
    """JWTs are three dot-separated base64 segments; API keys use a prefix."""
    return token.count(".") == 2


def _get_user_by_api_key(session: SessionDep, token: str) -> User | None:
    """Resolve a user from a valid, non-revoked API key."""
    from sqlmodel import select

    from app.core.security import verify_password
    from app.models import ApiKey

    keys = session.exec(select(ApiKey).where(ApiKey.revoked_at.is_(None))).all()
    for api_key in keys:
        ok, _ = verify_password(token, api_key.key_hash)
        if ok:
            return session.get(User, api_key.user_id)
    return None


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user
