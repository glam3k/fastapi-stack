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
from sqlalchemy import String as SAString
from sqlalchemy import cast, func, select
from sqlmodel import Session

from app.api.deps import CurrentUser, SessionDep
from app.core.db import engine
from app.jobs import base
from app.jobs.hello_world.job import HelloWorld
from pyreljob.models.orm import JobModel, RunModel, TaskModel

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


class ScheduledJobOut(BaseModel):
    id: int | None = None
    job: str
    status: str
    args: dict[str, Any] | None = None
    tags: list[str] | None = None
    next_run_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class RunsResponse(BaseModel):
    data: list[RunOut]
    count: int


class ScheduledResponse(BaseModel):
    data: list[ScheduledJobOut]
    count: int


def _build_run_conditions(
    search: str | None, tag: str | None, user_id: Any, is_superuser: bool
) -> list:
    """Build WHERE conditions for run queries."""
    conditions = []
    if not is_superuser:
        conditions.append(cast(JobModel.tags, SAString).contains(f'"user:{user_id}"'))
    elif tag:
        conditions.append(cast(JobModel.tags, SAString).contains(f'"{tag}"'))
    if search:
        s = f"%{search}%"
        conditions.append(
            cast(JobModel.job, SAString).ilike(s)
            | cast(RunModel.status, SAString).ilike(s)
            | cast(RunModel.error, SAString).ilike(s)
            | cast(JobModel.tags, SAString).ilike(s)
        )
    return conditions


def _build_scheduled_conditions(
    search: str | None, tag: str | None, user_id: Any, is_superuser: bool
) -> list:
    """Build WHERE conditions for scheduled job queries."""
    conditions = [
        JobModel.source == "scheduled",
        JobModel.status == "active",
    ]
    if not is_superuser:
        conditions.append(cast(JobModel.tags, SAString).contains(f'"user:{user_id}"'))
    elif tag:
        conditions.append(cast(JobModel.tags, SAString).contains(f'"{tag}"'))
    if search:
        s = f"%{search}%"
        conditions.append(
            cast(JobModel.job, SAString).ilike(s)
            | cast(JobModel.tags, SAString).ilike(s)
        )
    return conditions


def _run_from_row(run: RunModel, job: JobModel, manager: Any) -> RunOut:
    """Build a RunOut from ORM row + tasks."""
    tasks = manager.tasks(run.id) if run.id else []
    return RunOut(
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


@router.get("/", response_model=RunsResponse)
def list_runs(
    current_user: CurrentUser,
    tag: str | None = None,
    search: str | None = None,
    limit: int = 50,
    skip: int = 0,
) -> RunsResponse:
    """
    List runs, newest first, with their owning job's context and task state.

    Non-superusers are always restricted to their own runs.
    """
    manager = base.manager()
    conditions = _build_run_conditions(
        search, tag, current_user.id, current_user.is_superuser
    )

    with Session(engine) as session:
        count_stmt = select(func.count()).select_from(RunModel).join(
            JobModel, JobModel.id == RunModel.job_id
        )
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total = session.exec(count_stmt).one()

        stmt = (
            select(RunModel, JobModel)
            .join(JobModel, JobModel.id == RunModel.job_id)
            .order_by(RunModel.id.desc())
        )
        if conditions:
            stmt = stmt.where(*conditions)
        stmt = stmt.offset(skip).limit(limit)
        rows = session.execute(stmt).all()

    out = [
        _run_from_row(run, job, manager)
        for run, job in rows
        if run.id is not None
    ]
    return RunsResponse(data=out, count=total)


@router.get("/scheduled/", response_model=ScheduledResponse)
def list_scheduled_jobs(
    current_user: CurrentUser,
    tag: str | None = None,
    search: str | None = None,
    limit: int = 50,
    skip: int = 0,
) -> ScheduledResponse:
    """
    List the maintained (recurring) jobs and their next run time.
    """
    conditions = _build_scheduled_conditions(
        search, tag, current_user.id, current_user.is_superuser
    )

    with Session(engine) as session:
        count_stmt = select(func.count()).select_from(JobModel)
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total = session.exec(count_stmt).one()

        stmt = select(JobModel).order_by(JobModel.id.asc())
        if conditions:
            stmt = stmt.where(*conditions)
        stmt = stmt.offset(skip).limit(limit)
        models = session.execute(stmt).scalars().all()

    out = [
        ScheduledJobOut(
            id=m.id,
            job=m.job,
            status=m.status,
            args=m.args,
            tags=m.tags,
            next_run_at=m.next_run_at,
            created_at=m.created_at,
            updated_at=m.updated_at,
        )
        for m in models
    ]
    return ScheduledResponse(data=out, count=total)


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
