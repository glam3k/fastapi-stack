# AGENTS.md — fastapi-stack template

Guidance for AI agents (and humans) working in this repo and in projects
generated from it.

## This is a template

`fastapi-stack` is a **Copier template** (see `docs/TEMPLATE_WORKFLOW.md`).
Downstream projects (JCRM, iggo, …) are separate git repos with **no shared
history** — they are generated with `copier copy` and later updated either via
`copier update` (Option A) or by cherry-picking individual template commits
(Option B).

### Sync caveats

- **Never assume a file is identical between the template and a downstream
  project.** Even when two files look the same, a downstream project may have
  diverged. Before overwriting a file from the template into a project, `diff`
  them and check for project-specific edits.
- **The sidebar is per-app customized.** `frontend/src/components/Sidebar/AppSidebar.tsx`
  is NOT template-only — each app adds its own nav entries (e.g. iggo adds
  `Drive`, JCRM adds `Contacts`/`Integrations`/`Reminders`/`Todos`). Copying
  the template's `AppSidebar.tsx` over a project will silently drop those
  entries. Preserve app-specific items and only apply the intended icon/label
  change.
- **Migrations have separate chains.** When porting a template migration into a
  project, re-point its `down_revision` to the project's current chain head.
- **Frontend files that ship "whole"** (e.g. `theme-provider.tsx`,
  `index.css`, `Appearance.tsx`) can be copied verbatim only after confirming
  the downstream file matches the pre-change template; otherwise merge the
  specific change.

## Dev commands

```bash
# backend
cd backend && uv sync && uv run fastapi dev app/main.py --port 8000
uv run pytest            # backend tests
uv run alembic upgrade head

# frontend
cd frontend && bun install
bun run dev              # http://localhost:5173
bun run build            # typecheck + vite build
bun run lint             # biome check --write --unsafe

# regenerate the API client after backend route changes
bash scripts/generate-client.sh
```

## Feature docs

- `docs/TEMPLATE_WORKFLOW.md` — template ↔ downstream sync
- `docs/ADD_A_JOB.md` — add a pyreljob background job
- `docs/ARCHITECTURE.md` — backend layout
- `docs/DEPLOYMENT.md` — deploy
- `docs/FEATURES.md` — feature reference
