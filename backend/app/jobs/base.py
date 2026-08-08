"""Internal wrappers around pyreljob for this template.

Lets you define a job as a folder under ``app/jobs/<job_name>/`` with its own
tasks, register it with :func:`register`, and enqueue/schedule it via
:func:`enqueue` / :func:`schedule` without touching pyreljob's API directly.

A worker is started/stopped with the FastAPI app via :func:`start` /
:func:`stop` (see ``app.main``). Every job class is registered by its fully
qualified module path so the worker can resolve it from the database.
"""

from __future__ import annotations

import asyncio
import threading
from datetime import datetime

from pyreljob import Job, JobManager
from pyreljob.job import JobRecord
from pyreljob.worker import Worker

from app.core.config import settings

_registry: dict[str, type[Job]] = {}
_manager: JobManager | None = None
_worker: Worker | None = None
_worker_thread: threading.Thread | None = None


def register(*job_cls: type[Job]) -> None:
    """Register job classes so the worker can resolve them from the DB.

    Pass the job classes from your job modules at import time, e.g.::

        # app/jobs/hello_world/job.py
        from app.jobs import base

        base.register(HelloWorld)
    """
    for cls in job_cls:
        _registry[f"{cls.__module__}.{cls.__name__}"] = cls


def manager() -> JobManager:
    """The process-wide JobManager bound to the app database."""
    global _manager
    if _manager is None:
        _manager = JobManager(str(settings.SQLALCHEMY_DATABASE_URI))
        _manager.migrate()
    return _manager


def worker() -> Worker:
    """The process-wide Worker, aware of every registered job class."""
    global _worker
    if _worker is None:
        _worker = Worker(manager().backend, registry=dict(_registry))
    return _worker


def enqueue(
    job: Job,
    *,
    queue: str | None = None,
    priority: int | None = None,
    max_attempts: int = 3,
    retries: int = 0,
    idempotency_key: str | None = None,
    scheduled_at: datetime | None = None,
    tags: list[str] | None = None,
) -> JobRecord:
    """Create a durable job and its first run.

    ``tags`` are app-agnostic strings. Tag a job with :func:`owner_tag` so it
    is scoped to (and only visible to) that user in the jobs dashboard.
    """
    return manager().enqueue(
        job,
        queue=queue,
        priority=priority,
        max_attempts=max_attempts,
        retries=retries,
        idempotency_key=idempotency_key,
        scheduled_at=scheduled_at,
        tags=tags,
    )


def schedule(
    job: Job,
    *,
    queue: str | None = None,
    max_attempts: int = 3,
    retries: int = 0,
    tags: list[str] | None = None,
) -> JobRecord:
    """Register a maintained (recurring) job."""
    return manager().schedule(
        job,
        queue=queue,
        max_attempts=max_attempts,
        retries=retries,
        tags=tags,
    )


def owner_tag(user_id: str | object) -> str:
    """The tag used to scope a job to its owner (a signed-in user)."""
    return f"user:{user_id}"


def start() -> None:
    """Start the worker in a background thread. Idempotent."""
    global _worker_thread
    if _worker_thread is not None and _worker_thread.is_alive():
        return
    w = worker()
    _worker_thread = threading.Thread(target=w.run_forever, daemon=True)
    _worker_thread.start()


def stop() -> None:
    """Stop the worker and drain in-flight runs. Idempotent."""
    global _worker_thread
    if _worker_thread is None:
        return
    worker().stop()
    _worker_thread.join(timeout=10)
    _worker_thread = None


def run_pending() -> None:
    """Execute any pending runs synchronously (handy for tests/one-offs)."""
    w = worker()

    async def _drain() -> None:
        while manager().counts().get("ready", 0) > 0:
            await w._tick()

    asyncio.run(_drain())
