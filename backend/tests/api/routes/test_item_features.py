import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.item import create_item_with_tags, create_random_item


def test_read_item_tags(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/items/tags/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert isinstance(content, list)
    for tag in content:
        assert "name" in tag
        assert "count" in tag


def test_read_item_tags_with_items(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/items/",
        headers=superuser_token_headers,
        json={"title": "Tagged For Count", "tags": ["alpha", "beta"]},
    )
    assert response.status_code == 200
    response = client.get(
        f"{settings.API_V1_STR}/items/tags/",
        headers=superuser_token_headers,
    )
    content = response.json()
    tags = {t["name"]: t["count"] for t in content}
    assert tags["alpha"] >= 1
    assert tags["beta"] >= 1


def test_create_item_with_tags(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"title": "Tagged Item", "tags": ["tag1", "tag2"]}
    response = client.post(
        f"{settings.API_V1_STR}/items/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["tags"] == ["tag1", "tag2"]


def test_read_items_search(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    item = create_random_item(db)
    response = client.get(
        f"{settings.API_V1_STR}/items/?search={item.title}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert any(i["id"] == str(item.id) for i in content["data"])


def test_read_items_filter_by_tag(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    item = create_item_with_tags(db, tags=["filterme"])
    response = client.get(
        f"{settings.API_V1_STR}/items/?tag=filterme",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert any(i["id"] == str(item.id) for i in content["data"])
    for i in content["data"]:
        assert "filterme" in (i.get("tags") or [])


def test_read_items_pagination(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_item(db)
    create_random_item(db)
    response = client.get(
        f"{settings.API_V1_STR}/items/?skip=0&limit=1",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert len(content["data"]) <= 1
    assert content["count"] >= 2


def test_update_item_with_tags(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    item = create_random_item(db)
    data = {"tags": ["updated-tag"]}
    response = client.put(
        f"{settings.API_V1_STR}/items/{item.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["tags"] == ["updated-tag"]


def test_version_endpoint_public(client: TestClient) -> None:
    response = client.get(f"{settings.API_V1_STR}/version/")
    assert response.status_code == 200
    content = response.json()
    assert "version" in content
    assert "name" in content


def test_error_schema_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/items/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["success"] is False
    assert content["error"]["code"] == "HTTP_ERROR"
    assert content["error"]["message"] == "Item not found"


def test_error_schema_validation(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/items/",
        headers=superuser_token_headers,
        json={"title": ""},
    )
    assert response.status_code == 422
    content = response.json()
    assert content["success"] is False
    assert content["error"]["code"] == "VALIDATION_ERROR"
    assert "details" in content["error"]
