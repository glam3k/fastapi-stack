"""Read-only job listing.

Jobs are enqueued by app-specific endpoints (not here) — this only lists the
jobs, their runs, and task state so the UI can display the job dashboard.
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from app.api.deps import CurrentUser
from app.jobs import base

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
    status: str
    progress: float | None = None
    error: str | None = None
    worker_id: str | None = None
    created_at: datetime | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    tasks: list[TaskOut] = []


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int | None
    job: str
    queue: str
    status: str
    source: str
    priority: int
    max_attempts: int
    retries: int
    attempts: int
    args: dict[str, Any] | None = None
    tags: list[str] | None = None
    next_run_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    runs: list[RunOut] = []


@router.get("/", response_model=list[JobOut])
def list_jobs(
    current_user: CurrentUser,
    tag: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[JobOut]:
    """
    List jobs, newest first, with their runs and task state.

    Requires authentication. Pass ``tag`` (e.g. ``user:<id>``) to scope to a
    specific owner; superusers may omit it to list all jobs.
    """
    _ = current_user
    manager = base.manager()
    jobs = manager.list_jobs(limit=limit, offset=offset, tag=tag)
    out: list[JobOut] = []
    for record in jobs:
        if record.id is None:
            continue
        runs = []
        for run in manager.runs(record.id):
            if run.id is None:
                continue
            tasks = manager.tasks(run.id)
            runs.append(
                RunOut(
                    id=run.id,
                    status=run.status,
                    progress=run.progress,
                    error=run.error,
                    worker_id=run.worker_id,
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
        out.append(
            JobOut(
                id=record.id,
                job=record.job,
                queue=record.queue,
                status=record.status,
                source=record.source,
                priority=record.priority,
                max_attempts=record.max_attempts,
                retries=record.retries,
                attempts=record.attempts,
                args=record.args,
                tags=record.tags,
                next_run_at=record.next_run_at,
                created_at=record.created_at,
                updated_at=record.updated_at,
                runs=runs,
            )
        )
    return out
