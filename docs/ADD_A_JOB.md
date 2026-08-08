# Adding a Background Job to the Template

This template ships with a durable, SQL-backed background job framework
([`pyreljob`](https://github.com/glam3k/pyreljob)). This guide walks through
adding a brand-new job — both the backend (job + tasks + optional enqueue
endpoint) and the frontend (a button/trigger). The shipped `hello_world` job
is the worked example; follow its structure.

## Model in one breath

- **Job** — a durable entity, defined as a `@dataclass`. Its fields are the
  job's parameters; its class-level `tasks` list declares the ordered steps.
- **Task** — an atomic unit of work (`async def run(ctx)`). One job = an
  ordered list of tasks.
- **Run** — a single execution of a job. On-demand enqueues create one run;
  scheduled (maintained) jobs fire many runs over time.
- **Worker** — the executor. Runs in-process with the FastAPI app (lifespan)
  when `JOBS_WORKER_ENABLED=true` (default).

Everything is stored in your app's Postgres (`jobs`, `runs`, `tasks` tables).
No Redis/Celery.

---

## 1. Create the job folder

```
backend/app/jobs/<job_name>/__init__.py     (empty, optional)
backend/app/jobs/<job_name>/tasks.py        (the Task classes)
backend/app/jobs/<job_name>/job.py          (the Job class + registration)
```

### `tasks.py` — the work

Each task is a class with an `async def run(ctx)`. Use `ctx.args` for the
job's parameters, `ctx.result("ClassName")` to read an earlier task's result,
`ctx.state` for mutable shared state, and `await ctx.set_progress(x)` (0–1) to
report progress. Return a value to store it as the task's result.

```python
from pyreljob import Task, TaskContext

class FetchData(Task):
    async def run(self, ctx: TaskContext) -> list[str]:
        rows = await pull(ctx.args["source"])
        await ctx.set_progress(0.5)          # optional, 0..1
        return rows

class SendReport(Task):
    async def run(self, ctx: TaskContext) -> str:
        rows = ctx.result("FetchData")       # previous task's result
        url = await upload(rows)
        return url
```

Optional but useful:
- `async def undo(self, ctx)` — compensation, run in reverse on failure (saga).
- `name = "human-name"` — friendly task name shown in the UI.
- `max_attempts = 5` — override the job's retry budget for this task.
- `timeout = 60` — watchdog; task fails if it exceeds this (seconds).

### `job.py` — the durable definition

A `@dataclass` subclass of `Job` whose fields become the serialized `args`.

```python
from dataclasses import dataclass
from typing import ClassVar

from pyreljob import Job

from app.jobs.base import register
from app.jobs.report.tasks import FetchData, SendReport


@dataclass
class Report(Job):
    source: str
    email: str = "ops@example.com"

    tasks: ClassVar = [FetchData, SendReport]


register(Report)        # MUST register: lets the worker resolve it from the DB
```

Registering in `job.py` is what lets the worker turn a persisted row back into
a callable class.

---

## 2. Import it so it self-registers

Edit `backend/app/jobs/__init__.py` and add an import for the job module. This
is what loads the module at app startup, which triggers `register(...)`.

```python
from app.jobs.hello_world import job as hello_world_job
from app.jobs.report import job as report_job   # add this

__all__ = [
    ...,
    "report_job",          # add this
]
```

That's the full backend wiring for the job itself — the worker (via the
lifespan in `app/main.py`) will now pick up and execute it.

---

## 3. Enqueue it (backend)

Use the template wrappers in `app/jobs/base.py` — never pyreljob directly.

### On-demand (one-off) — e.g. from an API route

```python
from fastapi import APIRouter
from pydantic import BaseModel

from app.api.deps import CurrentUser
from app.jobs import base
from app.jobs.report.job import Report

router = APIRouter(prefix="/reports", tags=["reports"])


class ReportIn(BaseModel):
    source: str


@router.post("/")
def run_report(payload: ReportIn, current_user: CurrentUser) -> dict:
    record = base.enqueue(
        Report(source=payload.source),
        tags=[base.owner_tag(current_user.id)],   # scope it to the user
    )
    return {"job_id": record.id}
```

- `tags=[base.owner_tag(current_user.id)]` is the **owner-scoping convention**:
  it tags the job `user:<id>` so it only appears to that user in the Jobs UI.
- Optional `idempotency_key="..."` de-dupes re-enqueues of the same work.
- Optional `scheduled_at=<datetime>` delays the first run.

### Scheduled / recurring — via `schedule()`

```python
base.schedule(
    Report(source="daily"),
    tags=[base.owner_tag(current_user.id)],
)
```

`schedule()` registers a maintained job that fires a new run whenever the
job's `next_runtime()` says so. Override `next_runtime` on the Job to control
the cadence:

```python
from datetime import datetime, timedelta

@dataclass
class Report(Job):
    source: str
    tasks: ClassVar = [FetchData, SendReport]

    def next_runtime(self, last_run, ctx) -> datetime | None:
        if last_run is None:
            return datetime.now()                # fire immediately on first schedule
        return last_run.finished_at + timedelta(days=1)   # then daily
```

Returning `None` fires as soon as due. `schedule()` is idempotent on the job
class, so re-registering on app start won't create duplicates.

---

## 4. See it in the UI

- **Jobs page** (`GET /api/v1/jobs/`): lists **runs** newest-first, each with
  its job's name/source/args/tags and per-task state. Auto-refreshes every 5s.
  Non-superusers see only their own runs (owner-tag scoping); superusers see
  all.
- **Your trigger**: any UI that calls your enqueue endpoint. To mirror the
  template's "Run Hello World" dashboard button, call the endpoint from a
  React component (see `frontend/src/routes/_layout/index.tsx`) and invalidate
  the jobs query so the new run appears:

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { JobsService } from "@/client"

const qc = useQueryClient()
const run = useMutation({
  mutationFn: () => JobsService.enqueueHelloWorld({ requestBody: {} }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs", "runs"] }),
})
```

If you added new API endpoints, regenerate the typed client:

```bash
./scripts/generate-client.sh
```

---

## 5. Test it

Follow `backend/tests/jobs/test_hello_world.py` — enqueue, drain synchronously
with `run_pending()`, then assert the run succeeded:

```python
from pyreljob import RunStatus

from app.jobs import base
from app.jobs.report.job import Report


def test_report_job_runs() -> None:
    record = base.enqueue(Report(source="x"))
    assert record.id is not None

    base.run_pending()                     # execute synchronously

    runs = base.manager().runs(record.id)
    assert len(runs) == 1
    assert runs[0].status == RunStatus.SUCCEEDED
```

Run the backend suite (the worker is disabled in tests via
`JOBS_WORKER_ENABLED=false` in `conftest.py`, so tests drive jobs manually):

```bash
cd backend && uv run pytest tests/
```

---

## Checklist

- [ ] `backend/app/jobs/<job_name>/tasks.py` — `Task` classes with `async run(ctx)`
- [ ] `backend/app/jobs/<job_name>/job.py` — `@dataclass Job` + `register(Job)`
- [ ] Imported in `backend/app/jobs/__init__.py`
- [ ] Enqueued via `app.jobs.base.enqueue`/`schedule` (tagged with `owner_tag`)
- [ ] (Optional) API route + regenerated client + a UI trigger
- [ ] Test added under `backend/tests/jobs/`

The `hello_world` job (`backend/app/jobs/hello_world/`) is the minimal
reference — copy its shape, then add your own tasks.
