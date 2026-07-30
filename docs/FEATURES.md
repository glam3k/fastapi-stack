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

### File Upload
`POST /api/v1/uploads/photo` — accepts multipart file, stores in MinIO, returns public URL. Uses `backend/app/core/storage.py` which wraps boto3 for S3-compatible storage.

### Import/Export
- `backend/app/core/io_utils.py` — `parse_import_data()`, `export_csv()`, `export_json()` for CSV/JSON data exchange.
- Designed for any CRUD model, not tied to a specific entity.

### Job Scheduler
- `Job` table in `backend/app/models.py` — SQL-backed job queue ready for a polling worker.
- Status tracking (pending/running/done/failed), retry support, error logging.
- Worker implementation to be built per-project.

### Version Endpoint
`GET /api/v1/version/` — returns `{"name": "...", "version": "..."}` from package metadata. Public, no auth required.

## Design Decisions

- **No Celery** — Jobs use the database, not Redis. Simpler infrastructure for small-to-medium apps.
- **No background worker yet** — The `Job` model exists but the polling loop is left for projects to implement.
- **MinIO for storage** — S3-compatible, runs in Docker, zero-cost for homelab.
