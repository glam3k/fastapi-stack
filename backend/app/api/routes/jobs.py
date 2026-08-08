"""Jobs API.

Runs are the operational unit: every execution of a job (on-demand enqueues
create one run each; maintained jobs fire many runs over time). ``GET`` lists
runs newest-first with their task state. Enqueueing is done by app-specific
endpoints — the template provides ``POST /jobs/hello-world`` as the example.
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from app.api.deps import CurrentUser
from app.jobs import base
from app.jobs.hello_world.job import HelloWorld

router = APIRouter(prefix="/jobs", tags=["jobs"])


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None
    position: int
    task_name: str
    status: str
    attempts: int
    error: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None
    job_id: int | None
    job: str
    source: str
    args: dict[str, Any] | None = None
    tags: list[str] | None = None
    status: str
    progress: float | None = None
    error: str | None = None
    worker_id: str | None = None
    scheduled_at: datetime | None = None
    created_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    tasks: list[TaskOut] = []


@router.get("/", response_model=list[RunOut])
def list_runs(
    current_user: CurrentUser,
    tag: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[RunOut]:
    """
    List runs, newest first, with their owning job's context and task state.

    Requires authentication. Pass ``tag`` (e.g. ``user:<id>``) to scope to a
    specific owner; superusers may omit it to list all runs.
    """
    _ = current_user
    manager = base.manager()
    out: list[RunOut] = []
    for entry in manager.list_runs(limit=limit, offset=offset, tag=tag):
        run, job = entry.run, entry.job
        if run.id is None:
            continue
        tasks = manager.tasks(run.id)
        out.append(
            RunOut(
                id=run.id,
                job_id=job.id,
                job=job.job,
                source=job.source,
                args=job.args,
                tags=job.tags,
                status=run.status,
                progress=run.progress,
                error=run.error,
                worker_id=run.worker_id,
                scheduled_at=run.scheduled_at,
                created_at=run.created_at,
                started_at=run.started_at,
                finished_at=run.finished_at,
                tasks=[
                    TaskOut(
                        id=t.id,
                        position=t.position,
                        task_name=t.task_name,
                        status=t.status,
                        attempts=t.attempts,
                        error=t.error,
                        started_at=t.started_at,
                        finished_at=t.finished_at,
                    )
                    for t in tasks
                ],
            )
        )
    return out


class HelloWorldRunIn(BaseModel):
    name: str = "world"


@router.post("/hello-world/", response_model=RunOut)
def enqueue_hello_world(
    payload: HelloWorldRunIn,
    current_user: CurrentUser,
) -> RunOut:
    """Enqueue a HelloWorld job owned by the current user (runs on demand)."""
    record = base.enqueue(
        HelloWorld(name=payload.name),
        tags=[base.owner_tag(current_user.id)],
    )
    manager = base.manager()
    runs = manager.runs(record.id) if record.id else []
    run = runs[0] if runs else None
    if run is None or run.id is None:
        raise RuntimeError("enqueue did not create a run")
    tasks = manager.tasks(run.id)
    return RunOut(
        id=run.id,
        job_id=record.id,
        job=record.job,
        source=record.source,
        args=record.args,
        tags=record.tags,
        status=run.status,
        progress=run.progress,
        error=run.error,
        worker_id=run.worker_id,
        scheduled_at=run.scheduled_at,
        created_at=run.created_at,
        started_at=run.started_at,
        finished_at=run.finished_at,
        tasks=[
            TaskOut(
                id=t.id,
                position=t.position,
                task_name=t.task_name,
                status=t.status,
                attempts=t.attempts,
                error=t.error,
                started_at=t.started_at,
                finished_at=t.finished_at,
            )
            for t in tasks
        ],
    )
