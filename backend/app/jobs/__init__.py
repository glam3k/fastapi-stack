"""Jobs package.

Each job lives in its own folder (``app/jobs/<job_name>/``) with its own tasks
(e.g. ``app/jobs/hello_world/tasks.py``). Import the job modules here so they
self-register with the worker; define new jobs in a new folder and add its
import below.
"""

from app.jobs.base import (
    enqueue,
    manager,
    register,
    run_pending,
    schedule,
    start,
    stop,
    worker,
)
from app.jobs.hello_world import job as hello_world_job

__all__ = [
    "enqueue",
    "hello_world_job",
    "manager",
    "register",
    "run_pending",
    "schedule",
    "start",
    "stop",
    "worker",
]
