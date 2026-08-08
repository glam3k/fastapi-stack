from fastapi.testclient import TestClient

from app.core.config import settings
from app.jobs import base
from app.jobs.hello_world.job import HelloWorld


def test_list_runs_requires_auth(client: TestClient) -> None:
    response = client.get(f"{settings.API_V1_STR}/jobs/")
    assert response.status_code == 401


def test_list_runs(client: TestClient, superuser_token_headers: dict[str, str]) -> None:
    base.run_pending()

    response = client.get(
        f"{settings.API_V1_STR}/jobs/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert isinstance(content, list)
    for run in content:
        assert "id" in run
        assert "job_id" in run
        assert "job" in run
        assert "status" in run
        assert "source" in run
        assert "tasks" in run


def test_list_runs_after_enqueue(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    record = base.enqueue(HelloWorld(name="listed"), tags=["user:test"])
    assert record.id is not None
    run_id = base.manager().runs(record.id)[0].id

    response = client.get(
        f"{settings.API_V1_STR}/jobs/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    run_ids = {run["id"] for run in content}
    assert run_id in run_ids

    match = next(run for run in content if run["id"] == run_id)
    assert match["job"] == "app.jobs.hello_world.job.HelloWorld"
    assert match["job_id"] == record.id
    assert match["args"] == {"name": "listed"}
    assert match["tags"] == ["user:test"]


def test_list_runs_tag_filter(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    owned = base.enqueue(HelloWorld(name="mine"), tags=["user:me"])
    other = base.enqueue(HelloWorld(name="theirs"), tags=["user:them"])
    assert owned.id is not None
    assert other.id is not None
    owned_run = base.manager().runs(owned.id)[0].id
    other_run = base.manager().runs(other.id)[0].id

    response = client.get(
        f"{settings.API_V1_STR}/jobs/?tag=user:me",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    run_ids = {run["id"] for run in content}
    assert owned_run in run_ids
    assert other_run not in run_ids


def test_enqueue_hello_world_scopes_to_current_user(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/jobs/hello-world/",
        json={"name": "button"},
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    run = response.json()
    assert run["job"] == "app.jobs.hello_world.job.HelloWorld"
    assert run["args"] == {"name": "button"}
    assert run["status"] == "ready"
    assert run["tags"] and run["tags"][0].startswith("user:")
    assert run["job_id"] is not None
    owner = run["tags"][0]

    listing = client.get(
        f"{settings.API_V1_STR}/jobs/?tag={owner}",
        headers=superuser_token_headers,
    )
    assert run["id"] in {entry["id"] for entry in listing.json()}
