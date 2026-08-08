# FastAPI Stack

A fork of the official [FastAPI Full Stack Template](https://github.com/fastapi/full-stack-fastapi-template) with improvements for real-world CRUD apps.

## Why This Fork Exists

The original template is a great starting point but lacks several things needed for production apps:

- **File storage** — No file upload infrastructure
- **Background jobs** — No scheduler or job queue
- **Import/export** — No CSV/JSON data exchange utilities
- **Version endpoint** — No `GET /api/v1/version/`

This fork adds those as optional modules you can use or remove per project.

## What's Added

| Feature | Status | Module |
|---------|--------|--------|
| MinIO file upload | ✅ | `backend/app/core/storage.py`, `routes/uploads.py` |
| Background jobs (pyreljob) | ✅ | `backend/app/jobs/` |
| Import/export utilities | ✅ | `backend/app/core/io_utils.py` |
| Version API | ✅ | `GET /api/v1/version/` |
| Sidebar version | ✅ | AppSidebar shows name + version |

## Quick Start

```bash
# Copy .env and configure
cp .env.example .env

# Start everything
docker compose up -d --build

# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs
# MinIO Console: http://localhost:9001
```

## Tech Stack

- **Backend**: FastAPI, SQLModel, PostgreSQL, Alembic, Pydantic
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Infrastructure**: Docker Compose, Traefik, MinIO, Mailcatcher
- **Auth**: JWT, password hashing (argon2), email recovery

## Project Structure

```
backend/
├── app/
│   ├── api/routes/     # API endpoints
│   │   ├── items.py    # Example CRUD
│   │   ├── uploads.py  # File upload
│   │   ├── login.py    # Auth
│   │   └── ...
│   ├── core/
│   │   ├── storage.py  # MinIO/S3 utilities
│   │   ├── io_utils.py # CSV/JSON import/export
│   │   └── errors.py   # Global error handling
│   ├── jobs/           # pyreljob jobs (each job in its own folder)
│   │   ├── base.py     # wrappers: register/enqueue/schedule/worker
│   │   └── hello_world/ # example job with its own tasks
│   └── models.py       # SQLModel definitions

frontend/
├── src/
│   ├── client/         # Auto-generated API client
│   ├── components/     # UI components
│   ├── routes/         # Page routes
│   └── hooks/          # Custom hooks
```

## Building a New CRUD

1. Define model in `backend/app/models.py`
2. Create route in `backend/app/api/routes/`
3. Generate frontend client: `cd frontend && bun run generate-client`
4. Build UI in `frontend/src/routes/`

## License

MIT
