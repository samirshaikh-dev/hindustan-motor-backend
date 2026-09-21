# Motor Workshop Backend — Implementation Plan

Source documents: `req.txt`, `docs/techstack.md`, `docs/prd.md`

## Key Decisions (MVP)

- **No authentication / no users.** No login endpoints, no JWT, no password hashing, no `/auth/*`.
- **Actor identity via header.** Every request sends `X-Employee-Id`; middleware validates the employee exists and is active and attaches it as `req.actor`. History records `actorEmployeeId` from this header.
- **One permission rule.** Roles (`OWNER`, `EMPLOYEE`) act as labels; the single enforced rule is that **only the admin (OWNER) can assign tasks to employees**. Everything else — registering motors, creating/updating tasks, updating statuses, uploading images — is open to all actors.
- **Employee model has no credentials** — name, phone, role (label), isActive only.

---

## 1. Phase 0 — Project Scaffolding

- [ ] Init npm project, `"type": "commonjs"`.
- [ ] Install production deps: `express`, `@prisma/client`, `@neondatabase/serverless`, `zod`, `helmet`, `cors`, `express-rate-limit`, `cloudinary`, `winston`, `dotenv`. (No `jsonwebtoken`, no `argon2`.)
- [ ] Install dev deps: `nodemon`, `vitest`, `supertest`, `eslint`, `prettier`.
- [ ] Add scripts: `start`, `dev`, `test`, `lint`, `format`.
- [ ] Configure ESLint + Prettier, `.env.example`, `.gitignore`.
- [ ] Create folder skeleton:

```text
src/
├── app.js            (express app factory — routes, middleware, error handler)
├── index.js          (bootstrap: env, listen on PORT)
├── config/           (env validation via zod, logger, prisma client, cloudinary)
├── core/             (error classes, response helpers, asyncHandler, middlewares)
├── middlewares/      (actor, rbac, upload)
└── modules/
    ├── employees/
    ├── motors/
    ├── jobs/
    ├── tasks/
    ├── history/
    └── media/
```

## 2. Phase 1 — Configuration Layer

- [ ] `src/config/env.js` — zod schema validating all env vars; fails fast on missing/invalid.
- [ ] `src/config/prisma.js` — PrismaClient with `@neondatabase/serverless` adapter.
- [ ] `src/config/logger.js` — Winston structured logger; formats per NODE_ENV; never logs secrets.
- [ ] `src/config/cloudinary.js` — Cloudinary SDK init from env.
- [ ] `src/core/response.js` — consistent envelope `{ success, message, code, data }` (PRD §11).
- [ ] `src/core/errors.js` — custom AppError + error mapping to `code` strings; central error handler in app.
- [ ] `src/core/asyncHandler.js` — wrapper so controllers can `await` cleanly.
- [ ] Health check: `GET /health` returning app + DB status (PRD §13).

## 3. Phase 2 — Database Schema (Prisma)

- [ ] Define models per PRD §4 with relations:

```text
Employee    (id, name, phone, role[OWNER|EMPLOYEE], isActive,
             createdAt, updatedAt)                         -- no credentials

Motor       (motorNumber, customerName, customerPhone, brand, motorType, power,
             powerUnit, rpm, phase, serialNumber, complaint, notes,
             receivedAt, expectedDeliveryAt, images, ...)

MotorImage  (motorId, publicId, secureUrl, resourceType, width, height, ...)

Job         (jobNumber, motorId, status[RECEIVED|IN_PROGRESS|TESTING|
             READY_FOR_DELIVERY|DELIVERED|CANCELLED], notes, ...)

Task        (jobId, title, description, assignedEmployeeId,
             status[PENDING|ASSIGNED|IN_PROGRESS|COMPLETED|CANCELLED],
             startedAt, completedAt, ...)

History     (motorId, jobId, taskId, actorEmployeeId, action, description,
             metadata JSON, createdAt)                     -- append-only
```

- [ ] Enforce unique `motorNumber` / `jobNumber`; indexes on foreign keys and status.
- [ ] Run initial migration; push schema to Neon; generate client.

## 4. Phase 3 — Core Middleware

- [ ] `actor` middleware — read `X-Employee-Id`, look up active employee → `req.actor`; reject missing/unknown/inactive IDs.
- [ ] `rbac` middleware — simple `requireAdmin` guard used on the task-assignment paths only.
- [ ] Per the PRD, the **only** admin-only action is **assigning tasks to employees**; no other admin enforcement.
- [ ] `rate-limit` — general API limiting.
- [ ] Global middleware: `helmet`, `cors` (env `CORS_ORIGIN`), `express.json`, request logging, 404 handler, error handler.
- [ ] **No auth / JWT / RBAC middleware.**

## 5. Phase 4 — Employees Module

- [ ] CRUD: `POST/GET/GET :id/PATCH /api/v1/employees` (any actor).
- [ ] `GET /api/v1/employees/status` — admin dashboard: every employee with current active tasks + job status counts.
- [ ] `GET /api/v1/employees/:id/tasks` — tasks assigned to the employee.
- [ ] Enforce `isActive` on assignment (PRD §8).

## 6. Phase 5 — Motors Module

- [ ] `POST /api/v1/motors` — validate, generate unique `motorNumber`, create Motor + Job in a **transaction**, record History "Motor registered" + "Job created" (actor from header) (PRD §6).
- [ ] `GET /api/v1/motors` — list with filters (search by number/customer/phone, pagination).
- [ ] `GET /api/v1/motors/:id` — detail with jobs, tasks, images, latest history.
- [ ] `PATCH /api/v1/motors/:id` — update fields (not immutable ones).
- [ ] `GET /api/v1/motors/:motorId/history` — append-only timeline.

## 7. Phase 6 — Media Module (Cloudinary)

- [ ] Upload middleware (memory multer or streaming upload).
- [ ] `POST /api/v1/motors/:id/images` — upload to Cloudinary; store metadata in `MotorImage`; record History "Motor image uploaded".
- [ ] Validate file type/size; never store binaries in PostgreSQL (techstack §7).

## 8. Phase 7 — Jobs Module

- [ ] `POST/GET/GET :id/PATCH /api/v1/jobs`.
- [ ] Job status transitions validated server-side (PRD §5) — e.g. RECEIVED → IN_PROGRESS → TESTING → READY_FOR_DELIVERY → DELIVERED, plus CANCELLED.
- [ ] Every status change writes a History record atomically.
- [ ] `GET /api/v1/jobs/:id/history`.

## 9. Phase 8 — Tasks Module

- [ ] `POST /api/v1/jobs/:jobId/tasks` — create a task; setting `assignedEmployeeId` (assignment) is **admin-only** via `requireAdmin` (validates employee active).
- [ ] `GET /api/v1/jobs/:jobId/tasks`, `GET /api/v1/tasks/:id`.
- [ ] `PATCH /api/v1/tasks/:id` — update title/description; assignment changes are **admin-only** (records History "Task assigned").
- [ ] `PATCH /api/v1/tasks/:id/status` — employee-driven transitions:
  - ASSIGNED → IN_PROGRESS (set `startedAt`, History "Task started")
  - IN_PROGRESS → COMPLETED (set `completedAt`, History "Task completed")
  - → CANCELLED
- [ ] Employees can create tasks but **cannot assign them** — assignment is admin-only (PRD §3).

## 10. Phase 9 — History Module

- [ ] Central `history.service` used by all modules to append events.
- [ ] Enforce append-only (no update/delete endpoints).
- [ ] Expose `GET /api/v1/motors/:motorId/history` and `GET /api/v1/jobs/:jobId/history`.
- [ ] Include `actorEmployeeId` (from header), action, description, and structured `metadata`.

## 11. Phase 10 — Testing & Quality

- [ ] Unit tests (Vitest): env validation, zod schemas, status-transition guards, number generators.
- [ ] Integration tests (Vitest + Supertest) priority areas (techstack §12): actor-header middleware, admin-only assignment guard, motor creation, job creation, task assignment, task status transitions, history creation + actor recording, DB transactions.
- [ ] Test setup: isolated test DB (Neon dev DB or SQLite where compatible), cleanup between tests.
- [ ] Run ESLint + Prettier; ensure `npm test` and `npm run lint` pass.

## 12. Phase 11 — Docs & Handover

- [ ] Document API contracts (`docs/` or `README.md`) — request/response examples per endpoint, all wrapped in `{ success, message, code, data }`, noting the `X-Employee-Id` header requirement.
- [ ] `.env.example` complete with all vars (incl. `ACTOR_HEADER=X-Employee-Id`).
- [ ] README: setup, migrate, seed, run, test, deploy notes.
- [ ] Final self-verification against MVP acceptance criteria (PRD §14, minus login items).

## Milestones

| Milestone | Scope | Exit criteria |
|-----------|-------|---------------|
| M0 | Scaffolding + config | Server boots, `/health` OK, env validated |
| M1 | Schema + actor middleware + employees/dashboard | Header identity enforced; employee CRUD + status dashboard work |
| M2 | Motors + jobs + tasks | Core workflow end-to-end via API |
| M3 | Media + history | Image upload + full timeline working |
| M4 | Tests + hardening | `npm test` / `npm run lint` green; acceptance criteria met |