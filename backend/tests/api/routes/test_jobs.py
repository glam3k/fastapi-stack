from fastapi.testclient import TestClient

from app.core.config import settings
from app.jobs import base
from app.jobs.hello_world.job import HelloWorld


def test_list_jobs_requires_auth(client: TestClient) -> None:
    response = client.get(f"{settings.API_V1_STR}/jobs/")
    assert response.status_code == 401


def test_list_jobs(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    base.run_pending()

    response = client.get(
        f"{settings.API_V1_STR}/jobs/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert isinstance(content, list)
    for job in content:
        assert "id" in job
        assert "job" in job
        assert "status" in job
        assert "source" in job
        assert "runs" in job


def test_list_jobs_after_enqueue(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    record = base.enqueue(HelloWorld(name="listed"), tags=["user:test"])
    assert record.id is not None

    response = client.get(
        f"{settings.API_V1_STR}/jobs/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    ids = {job["id"] for job in content}
    assert record.id in ids

    match = next(job for job in content if job["id"] == record.id)
    assert match["job"] == "app.jobs.hello_world.job.HelloWorld"
    assert match["args"] == {"name": "listed"}
    assert match["tags"] == ["user:test"]


def test_list_jobs_tag_filter(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    owned = base.enqueue(HelloWorld(name="mine"), tags=["user:me"])
    other = base.enqueue(HelloWorld(name="theirs"), tags=["user:them"])
    assert owned.id is not None
    assert other.id is not None

    response = client.get(
        f"{settings.API_V1_STR}/jobs/?tag=user:me",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    ids = {job["id"] for job in content}
    assert owned.id in ids
    assert other.id not in ids
