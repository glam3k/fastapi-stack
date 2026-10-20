import hashlib
import hmac
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import settings

password_hash = PasswordHash(
    (
        Argon2Hasher(),
        BcryptHasher(),
    )
)


ALGORITHM = "HS256"


def create_access_token(subject: str | Any, expires_delta: timedelta) -> str:
    expire = datetime.now(UTC) + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(
    plain_password: str, hashed_password: str
) -> tuple[bool, str | None]:
    return password_hash.verify_and_update(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return password_hash.hash(password)


# --- API keys -------------------------------------------------------------
#
# An API key is 256 bits of random noise, not a password a human chose. That
# changes the right hash:
#
# - A *slow* hash (argon2/bcrypt) protects a secret that can be brute-forced.
#   This one cannot be — 256 bits of entropy is unguessable — so the slow hash
#   buys nothing and costs a lot.
# - A *fast* hash (SHA-256) is right, and it must be **keyed by an id** so the
#   lookup is one indexed row rather than every key in the table. Scanning them
#   all and running a slow hash on each means an unauthenticated request with a
#   made-up token costs a table scan of password hashes — a denial-of-service
#   lever, not just a slow path.

#: The prefix that marks a token as an API key.
API_KEY_PREFIX = "stack"


def hash_api_key(secret: str) -> str:
    """The stored hash of an API key's *secret* part.

    The id part of the key is in the token in the clear — it is the lookup
    key, not a secret — so only the secret is hashed.
    """
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def verify_api_key(secret: str, key_hash: str) -> bool:
    """Whether a secret matches a stored hash, in constant time."""
    return hmac.compare_digest(hash_api_key(secret), key_hash)


def generate_api_key(key_id: uuid.UUID) -> str:
    """A new API key: ``<prefix>_<key id>_<secret>``.

    The id is in the token so the row can be found without a scan, and the
    secret is the part that is actually compared.
    """
    return f"{API_KEY_PREFIX}_{key_id.hex}_{secrets.token_urlsafe(32)}"


def parse_api_key(token: str) -> tuple[uuid.UUID, str] | None:
    """Split an API key into its id and secret, or None if it is not one."""
    # The secret is base64url, so it may itself contain "_" — split only twice,
    # so everything after the id is the secret.
    parts = token.split("_", 2)
    if len(parts) != 3 or parts[0] != API_KEY_PREFIX:
        return None
    try:
        key_id = uuid.UUID(parts[1])
    except ValueError:
        return None
    if not parts[2]:
        return None
    return key_id, parts[2]
