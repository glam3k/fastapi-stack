# FastAPI Stack — Feature Reference

## Built-in

- User authentication (register, login, password reset)
- JWT-based API security
- Superuser admin panel
- Items CRUD (example template model)
- Email sending via SMTP
- Dark mode
- Accessible UI (shadcn/ui)

## Added Modules

### Global Error Handling
- `backend/app/core/errors.py` — consistent error response schema for all API errors.
- Every error returns: `{"success": false, "error": {"code", "message", "details"?}}`.
- Registered in `backend/app/main.py` via `register_exception_handlers(app)`.
- Handlers cover: HTTP errors (404/401/etc → `HTTP_ERROR`), validation errors (422 → `VALIDATION_ERROR` with field details), business errors (`ApiError` → custom codes), and a catch-all (500 → `INTERNAL_ERROR` with stack trace logged, never leaked to client).
- Raise `ApiError(message, code="...", status_code=...)` in routes for business-rule failures.

### File Upload
`POST /api/v1/uploads/photo` — accepts multipart file, stores in MinIO, returns public URL. Uses `backend/app/core/storage.py` which wraps boto3 for S3-compatible storage.

### Import/Export
- `backend/app/core/io_utils.py` — `parse_import_data()`, `export_csv()`, `export_json()` for CSV/JSON data exchange.
- Designed for any CRUD model, not tied to a specific entity.

### Centralized Logging
- `backend/app/core/logging.py` — `setup_logging()` configures log level + format; `RequestLoggingMiddleware` logs every request as `METHOD /path -> status (duration)`.

### Jobs (pyreljob)
- Durable, SQL-backed job framework via [`pyreljob`](https://github.com/glam3k/pyreljob) — installed from git in `backend/pyproject.toml`, not vendored.
- **Adding a new job?** Follow [`docs/ADD_A_JOB.md`](ADD_A_JOB.md).
- Each job lives in its own folder: `backend/app/jobs/<job_name>/` with its own tasks (e.g. `backend/app/jobs/hello_world/{tasks.py, job.py}`).
- Wrappers in `backend/app/jobs/base.py`: `register()`, `enqueue()`, `schedule()`, `start()`/`stop()` (worker lifecycle), `manager()`, `worker()`, `run_pending()`, `owner_tag()`.
- A worker runs in-process with the FastAPI app (lifespan) when `JOBS_WORKER_ENABLED=true` (default). Set it to `false` to run workers as a separate process.
- Jobs are registered in `backend/app/jobs/__init__.py`; add new job folders and import them there.
- `GET /api/v1/jobs/` — runs-first dashboard: every **run** (execution) is listed newest-first with its owning job's context and task state. Runs are the operational unit: on-demand enqueues create one run each; maintained jobs fire many runs over time.
- `POST /api/v1/jobs/hello-world/` — the template's example of an app-specific enqueue endpoint (the dashboard's "Run Hello World" button calls this); it tags the job with the current user's owner tag.
- **Owner scoping**: jobs carry app-agnostic `tags` (pyreljob v10 migration). Tag a job with `owner_tag(user.id)` (`user:<id>`) at enqueue time, then list runs with `?tag=user:<id>`; the frontend Jobs tab does this automatically so each user only sees their own runs. Superusers can omit `tag` to see everything.

### Version Endpoint
`GET /api/v1/version/` — returns `{"name": "...", "version": "..."}` from package metadata. Public, no auth required.

## Design Decisions

- **No Celery** — Jobs use the database (pyreljob on the app Postgres), not Redis. Simpler infrastructure for small-to-medium apps.
- **pyreljob for background work** — durable `Job → Run → Task` model with retries, compensation, and scheduled jobs, running through the template's `app/jobs` wrappers.
- **MinIO for storage** — S3-compatible, runs in Docker, zero-cost for homelab.
- **Structured errors** — Uniform error envelope with machine-readable codes (pattern used by Stripe, Twilio, etc).
