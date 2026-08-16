from fastapi.testclient import TestClient

from app.core.config import settings


def test_api_keys_require_auth(client: TestClient) -> None:
    response = client.get(f"{settings.API_V1_STR}/api-keys/")
    assert response.status_code == 401


def test_api_key_lifecycle(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    headers = normal_user_token_headers

    # Create a key; the plaintext is returned exactly once.
    created = client.post(
        f"{settings.API_V1_STR}/api-keys/",
        headers=headers,
        json={"name": "my-app"},
    )
    assert created.status_code == 200
    body = created.json()
    assert body["name"] == "my-app"
    assert body["key"].startswith(f"{settings.API_KEY_PREFIX}_")
    key = body["key"]
    api_key_id = body["id"]

    try:
        # The key authenticates everywhere a user JWT does.
        me = client.get(f"{settings.API_V1_STR}/users/me", headers=headers)
        assert me.status_code == 200
        via_key = client.get(
            f"{settings.API_V1_STR}/users/me",
            headers={"Authorization": f"Bearer {key}"},
        )
        assert via_key.status_code == 200
        assert via_key.json()["email"] == me.json()["email"]

        # Listing returns the key without exposing the plaintext.
        listing = client.get(
            f"{settings.API_V1_STR}/api-keys/", headers=headers
        ).json()
        assert any(k["id"] == api_key_id for k in listing)
        assert all("key" not in k for k in listing)

        # Revoking kills the key.
        revoked = client.delete(
            f"{settings.API_V1_STR}/api-keys/{api_key_id}", headers=headers
        )
        assert revoked.status_code == 200

        denied = client.get(
            f"{settings.API_V1_STR}/users/me",
            headers={"Authorization": f"Bearer {key}"},
        )
        assert denied.status_code == 403
    finally:
        client.delete(
            f"{settings.API_V1_STR}/api-keys/{api_key_id}", headers=headers
        )


def test_api_key_name_required(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/api-keys/",
        headers=normal_user_token_headers,
        json={"name": "   "},
    )
    assert response.status_code == 400
