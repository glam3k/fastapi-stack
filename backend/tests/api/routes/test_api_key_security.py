"""The API key: how it is generated, stored and looked up.

A key is 256 bits of random noise, not a password a human chose, so it is
hashed fast and it carries its own id. Both matter for the same reason: an
unauthenticated request with a made-up key must cost almost nothing.
"""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.core.security import (
    generate_api_key,
    hash_api_key,
    parse_api_key,
    verify_api_key,
)
from app.models import ApiKey, User


def test_a_generated_key_parses_back_to_its_id() -> None:
    key_id = uuid.uuid4()
    parsed = parse_api_key(generate_api_key(key_id))
    assert parsed is not None
    assert parsed[0] == key_id
    assert parsed[1]


def test_a_made_up_key_costs_nothing() -> None:
    """A token that does not even parse is rejected without touching the database.

    The old scheme scanned every key and hashed each one with a slow password
    hash — so an unauthenticated request carrying garbage cost a table scan of
    argon2 hashes. That is a denial-of-service lever.
    """
    assert parse_api_key("total-nonsense") is None
    assert parse_api_key("stack_not-a-uuid_abc") is None
    assert parse_api_key("stack_") is None
    # A key with a valid id but a wrong secret is one comparison, not a scan.
    key_id = uuid.uuid4()
    stored = hash_api_key("the-real-secret")
    assert not verify_api_key("the-wrong-secret", stored)
    assert verify_api_key("the-real-secret", stored)


def test_a_key_authenticates_and_a_wrong_secret_does_not(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    with Session(engine) as session:
        owner = session.exec(
            select(User).where(User.email == settings.FIRST_SUPERUSER)
        ).first()
        assert owner is not None
        key_id = uuid.uuid4()
        secret = "a" * 43
        key = f"{settings.API_KEY_PREFIX}_{key_id.hex}_{secret}"
        session.add(
            ApiKey(
                id=key_id,
                user_id=owner.id,
                name="test key",
                key_hash=hash_api_key(secret),
            )
        )
        session.commit()

    me = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {key}"},
    )
    assert me.status_code == 200, me.text

    forged = f"{settings.API_KEY_PREFIX}_{key_id.hex}_{'b' * 43}"
    denied = client.get(
        f"{settings.API_V1_STR}/users/me",
        headers={"Authorization": f"Bearer {forged}"},
    )
    assert denied.status_code in (401, 403), denied.text
