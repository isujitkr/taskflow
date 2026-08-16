# TaskFlow

Multi-tenant project management API. Node.js, Express, PostgreSQL, Redis + BullMQ for background email jobs.

## Folder structure

```
taskflow/
├── src/
│   ├── app.js                      # Express app setup, route mounting
│   ├── server.js                   # Entry point, starts the API server
│   ├── config/
│   │   ├── env.js                  # Loads/validates environment variables
│   │   ├── db.js                   # pg Pool + query()/withTransaction() helpers
│   │   └── redis.js                # ioredis connection (used by BullMQ)
│   ├── db/
│   │   ├── migrations/             # 001..009 *.up.sql / *.down.sql
│   │   ├── migrate.js              # Custom migration runner (up/down)
│   │   └── seed.js                 # Seed data script
│   ├── middleware/
│   │   ├── auth.js                 # requireAuth, requireOrgMembership, requireRole
│   │   ├── rateLimiter.js          # 10 req/min/IP limiter for auth routes
│   │   └── errorHandler.js         # Central error handler + 404 handler
│   ├── routes/
│   │   ├── authRoutes.js           # /auth/*
│   │   ├── orgsRoutes.js           # /orgs/*
│   │   ├── projectsRoutes.js       # /projects/*
│   │   ├── tasksRoutes.js          # /tasks/*
│   │   ├── commentsRoutes.js       # /tasks/:id/comments
│   │   └── jobsRoutes.js           # /jobs/:id
│   ├── controllers/
│   │   ├── authController.js       # register, login, refresh, logout
│   │   ├── orgsController.js       # org member management
│   │   ├── projectsController.js   # project CRUD + dashboard
│   │   ├── tasksController.js      # task CRUD, filters, assign/unassign
│   │   └── commentsController.js   # task comments
│   ├── services/
│   │   ├── authService.js          # auth business logic + token issuance
│   │   ├── orgsService.js          # org member business logic
│   │   ├── projectsService.js      # project queries/business logic
│   │   ├── tasksService.js         # task queries/business logic
│   │   └── commentsService.js      # comment queries
│   ├── utils/
│   │   ├── validators/
│   │   │   ├── authValidators.js       # Zod schemas for auth
│   │   │   ├── projectsValidators.js   # Zod schemas for projects
│   │   │   └── tasksValidators.js      # Zod schemas for tasks/comments
│   │   ├── apiError.js             # Consistent { error, code, details } error class
│   │   ├── password.js             # bcrypt hash/compare
│   │   ├── jwt.js                  # Access JWT + opaque refresh token helpers
│   │   └── pagination.js           # Offset pagination helper
│   └── jobs/
│       ├── queues/
│       │   └── emailQueue.js       # BullMQ queue producer
│       ├── processors/
│       │   └── emailProcessor.js   # Mock email sender (job handler)
│       └── workers/
│           └── emailWorker.js      # BullMQ worker entrypoint (npm run worker)
├── .env.example
└── package.json

```

## Architecture

- **Route → Controller → Service → DB** separation in every module: routes wire middleware, controllers validate (Zod) and shape HTTP, services hold business logic and SQL.
- **Multi-tenancy**: a user can belong to multiple orgs (`org_members`). Every request that touches org data must send an `X-Org-Id` header. The `requireOrgMembership` middleware re-verifies membership against the DB on **every request** — org context is never trusted from the client, only from a fresh DB check — and attaches `req.org = { id, role }`. All service-layer queries filter `WHERE org_id = req.org.id`, so cross-tenant access is structurally impossible, not just checked once at login.
- **Auth**: access JWT (15 min) carries only `sub` (user id). Refresh tokens are opaque random strings (not JWTs) — the raw value is shown once to the client, only `sha256(raw)` is stored in `refresh_tokens`, with `expires_at`/`revoked_at` for revocation. bcrypt cost factor 12.
- **Background jobs**: task assignment inserts the `task_assignments` row, then calls `queue.add()` on the BullMQ email queue **without awaiting job completion** — the HTTP response returns immediately. A separate worker process (`npm run worker`) consumes the queue, retries failed jobs 3x with exponential backoff (1s→2s→4s), and failed jobs simply remain in the `failed` state in Redis (BullMQ's dead-letter equivalent — no separate queue needed for this scale). `GET /jobs/:id` reports back one of `pending|active|completed|failed`.

## Data model

Tables: `users`, `organizations`, `org_members`, `projects`, `tasks`, `task_assignments`, `comments`, `refresh_tokens`.
Enums: `org_role` (`org_admin`, `member`), `task_status` (`todo`,`in_progress`,`review`,`done`), `task_priority` (`low`,`medium`,`high`,`urgent`).

FK cascade decisions (documented inline in each migration too):
- `organizations`/`users` deletions **CASCADE** into join/child tables that are meaningless without the parent (`org_members`, `task_assignments`, `refresh_tokens`, `projects`→`tasks`).
- `created_by` on `projects`/`tasks` and `user_id` on `comments` are **RESTRICT** — keeps an audit trail and blocks deleting a user who has authored content.

Indexes (justified inline as SQL comments in each migration):
- `org_members(org_id)`, `org_members(user_id)` — every request's tenant check.
- `projects(org_id)`, `tasks(org_id)` — tenant scoping on every list/read.
- `tasks(project_id)`, `tasks(status)`, `tasks(priority)`, `tasks(due_date)` — the required task filters.
- `task_assignments(task_id)`, `task_assignments(user_id)` — assignee lookups/filters.
- partial indexes on `deleted_at IS NULL` for soft-deleted tables.

## Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL running locally (create a DB + user matching `DATABASE_URL`)

### 2. Install
```bash
npm install
cp .env.example .env   # edit DATABASE_URL / secrets as needed
```

### 3. Create your Postgres DB/role (example, adjust to your local setup)
```bash
createuser taskflow -s
createdb -O taskflow taskflow
psql -c "ALTER USER taskflow PASSWORD 'taskflow';"
```
Make sure `DATABASE_URL` in `.env` matches.

### 4. Run migrations + seed
```bash
npm run migrate:up
npm run seed
```
Seeded users (password for all: `Password123!`): `alice@taskflow.dev`, `bob@taskflow.dev`, `carol@taskflow.dev`, `dave@taskflow.dev`, `erin@taskflow.dev` — spread across 2 orgs (Acme, Globex), 4 projects, 12 tasks with mixed statuses/priorities, assignments and comments.

### 5. Run the API and the worker (two processes)
```bash
npm run dev       # API on :3000
npm run worker    # in a second terminal - processes email jobs
```

## Environment variables

See `.env.example`. Notably: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (set real secrets before deploying), `BCRYPT_COST` (≥12), `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL_DAYS`.

## API overview

All endpoints except `/api/auth/*` and `/` require `Authorization: Bearer <accessToken>`. All endpoints except `/api/auth/*`, `/`, `/api/jobs/*` also require `X-Org-Id: <orgId>` (an org you're a member of).

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | `{email,password,name,orgName}` — creates user **and** a new org, caller becomes `org_admin` |
| POST | `/api/auth/login` | `{email,password}` → access + refresh token, list of orgs |
| POST | `/api/auth/refresh` | `{refreshToken}` → new access token |
| POST | `/api/auth/logout` | `{refreshToken}` → revokes that refresh token |
| GET | `/api/orgs/members` | list org members |
| POST | `/api/orgs/members` | admin only — add existing user by email |
| DELETE | `/api/orgs/members/:userId` | admin only |
| GET/POST | `/api/projects` | list (paginated) / create |
| GET/PATCH | `/api/projects/:id` | |
| DELETE | `/api/projects/:id` | admin only — soft delete |
| GET | `/api/projects/:id/dashboard` | task counts grouped by status |
| GET/POST | `/api/tasks` | list w/ `status`,`priority`,`assignee`,`dueFrom`,`dueTo`,`page`,`limit` filters / create |
| GET/PATCH/DELETE | `/api/tasks/:id` | |
| GET/POST | `/api/tasks/:id/assignments` | list assignees / assign (assignee must be in same org; enqueues email job) |
| DELETE | `/api/tasks/:id/assignments/:userId` | unassign |
| GET/POST | `/api/tasks/:id/comments` | |
| GET | `/api/jobs/:id` | BullMQ job status: `pending\|active\|completed\|failed` |

Auth endpoints are rate-limited to 10 req/min/IP. All errors follow `{ "error", "code", "details" }`. List endpoints follow `{ "data", "total", "page", "limit" }`.

## Verification

This backend was built and exercised end-to-end against real local Postgres + Redis instances during development: migrations up/down, seed, register → login → create project → create task → assign (fires async email job, confirmed processed by the worker log) → comment → dashboard counts, plus explicit cross-tenant isolation checks (wrong org header → 403, right-org-but-wrong-tenant resource id → 404) and RBAC checks (member blocked from deleting a project with 403, admin succeeds with 204), and the 10 req/min auth rate limit (11th request returns 429).
