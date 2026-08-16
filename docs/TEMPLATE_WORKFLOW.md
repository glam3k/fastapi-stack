# Template Workflow — fastapi-stack ↔ downstream projects

How the `fastapi-stack` template relates to projects generated from it (like
JCRM), and the two ways a downstream project gets template updates.

## Relationship

`fastapi-stack` is a **Copier template**. Projects are created with:

```
copier copy /path/to/fastapi-stack ./my-project
```

A generated project is a **clean snapshot** — it has no shared git history with
the template. `copier.yml` fills in project-specific answers (name, secrets,
etc.) and writes them to `.copier/.copier-answers.yml`.

There is **no fork / no rebase / no shared history** between the template and a
generated project. They are separate git repos with a common file layout.

## How a downstream project gets template updates

### Option A — Copier update (native, for projects that stayed close)

Copier is designed for this. From inside the generated project:

```
copier update /path/to/fastapi-stack     # or https://github.com/glam3k/fastapi-stack.git
```

- Re-applies the template on top of your project.
- **3-way merges** template changes with your local edits — your
  project-specific code is preserved.
- Reuses your saved answers from `.copier/.copier-answers.yml`.
- Files in `copier.yml` `_exclude` are never overwritten.

**Requirement:** the project must have a committed `.copier/.copier-answers.yml`
recording its original answers. JCRM does **not** currently (only the `.jinja`
template exists), so `copier update` cannot run cleanly from JCRM without
recreating that answers file.

### Option B — Cherry-pick (how JCRM does it today)

JCRM diverged heavily (170+ commits) from the template, so a full `copier
update` would produce large conflicts. Instead, individual template features
are cherry-picked:

```
# in the downstream repo (e.g. JCRM)
git remote add template /Users/glam3k/projects/fastapi-stack   # once
git fetch template
git cherry-pick <template-commit-sha>
```

- Each template feature is a **single commit** in fastapi-stack.
- Cherry-pick applies it onto the downstream repo's HEAD.
- Resolve conflicts; the downstream repo keeps its own linear history.

**Migration caveat:** the template's Alembic migrations and the downstream
repo's migrations are **separate chains**. When cherry-picking a commit that
adds a migration, re-point the migration's `down_revision` to the downstream
repo's current chain head (not the template's head). Example: JCRM's chain head
was `2e2c4a7afd21`; the cherry-picked `add_api_keys_table` migration was
re-chained to it.

## Which to use

| Situation | Use |
|---|---|
| Project stays close to the template, wants everything | `copier update` |
| Project diverged, wants a specific feature | `git cherry-pick` |
| Spawning a brand-new project | `copier copy` |

## Template feature commits (so far)

- `493594b` — API keys for external apps (issue/list/revoke, bearer auth,
  Settings → API keys tab)
- `a1f150d` — Items page UX (frontend instant search, backend search button,
  include/exclude tags, sort dropdown)
