# Motor Workshop Backend — Implementation Plan

Source documents: `req.txt`, `docs/techstack.md`, `docs/prd.md`

## 1. Phase 0 — Project Scaffolding

- [ ] Init npm project (`npm init -y`), set `"type": "commonjs"`.
- [ ] Install production deps: `express`, `@prisma/client`, `@neondatabase/serverless`, `zod`, `jsonwebtoken`, `argon2`, `helmet`, `cors`, `express-rate-limit`, `cloudinary`, `winston`, `dotenv`.
- [ ] Install dev deps: `nodemon`, `vitest`, `supertest`, `eslint`, `prettier`.
- [ ] Add scripts:
  - `start` → node src/index.js
  - `dev` → nodemon src/index.js
  - `test` → vitest run
  - `lint` → eslint .
  - `format` → prettier --write .
- [ ] Configure ESLint + Prettier (`.eslintrc`, `.prettierrc`).
- [ ] Add `.env.example` (per techstack §13) and `.gitignore` (node_modules, .env, dist, coverage).
- [ ] Create folder skeleton:

```text
src/
├── app.js            (express app factory — routes, middleware, error handler)
├── index.js          (bootstrap: env, listen on PORT)
├── config/           (env validation via zod, logger, prisma client, cloudinary)
├── core/             (error classes, response helpers, asyncHandler, middlewares)
├── middlewares/      (auth, rbac, upload)
└── modules/
    ├── auth/
    ├── users/
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
User        (id, name, phone, passwordHash, role[OWNER|EMPLOYEE], isActive, ...)
Employee    (id, name, phone, role, isActive, userId?)
Motor       (motorNumber, customerName, customerPhone, brand, motorType, power,
             powerUnit, rpm, phase, serialNumber, complaint, notes,
             receivedAt, expectedDeliveryAt, images, ...)
MotorImage  (motorId, publicId, secureUrl, resourceType, width, height, ...)
Job         (jobNumber, motorId, status[RECEIVED|IN_PROGRESS|TESTING|
             READY_FOR_DELIVERY|DELIVERED|CANCELLED], notes, ...)
Task        (jobId, title, description, assignedEmployeeId,
             status[PENDING|ASSIGNED|IN_PROGRESS|COMPLETED|CANCELLED],
             startedAt, completedAt, ...)
History     (motorId, jobId, taskId, actorUserId, action, description,
             metadata JSON, createdAt)   -- append-only
```

- [ ] Enforce unique `motorNumber` / `jobNumber`; indexes on foreign keys and status.
- [ ] Run initial migration; push schema to Neon; generate client.

## 4. Phase 3 — Core Middleware

- [ ] `auth` — verify JWT access token, attach user to `req`.
- [ ] `rbac` — require role `OWNER` (or `OWNER|EMPLOYEE`) per route.
- [ ] `rate-limit` — stricter limits on `/auth/login`; general limit on API.
- [ ] Global middleware: `helmet`, `cors` (env `CORS_ORIGIN`), `express.json`, request logging, 404 handler, error handler.

## 5. Phase 4 — Auth & Users Module

- [ ] `POST /api/v1/auth/login` — verify phone/password with argon2; issue short-lived access token + secure refresh token.
- [ ] `POST /api/v1/auth/refresh` — rotate refresh token.
- [ ] `POST /api/v1/auth/logout` — revoke refresh token.
- [ ] `GET /api/v1/auth/me` — current user + role/permissions.
- [ ] Seed an initial `OWNER` user (documented, never committed with real secrets).
- [ ] Bonus (@techstack §5): short-lived access + secure refresh strategy.

## 6. Phase 5 — Employees Module

- [ ] CRUD: `POST/GET/GET :id/PATCH /api/v1/employees` (OWNER only for management).
- [ ] Create employee optionally creates a linked `User` login (argon2 hash).
- [ ] `GET /api/v1/employees/:id/tasks` — tasks assigned to the employee.
- [ ] Enforce `isActive` on assignment (PRD §8).

## 7. Phase 6 — Motors Module

- [ ] `POST /api/v1/motors` — validate, generate unique `motorNumber`, create Motor + Job in a transaction, record History "Motor registered" + "Job created" (PRD §6).
- [ ] `GET /api/v1/motors` — list with filters (search by number/customer/phone, pagination).
- [ ] `GET /api/v1/motors/:id` — detail with jobs, tasks, images, latest history.
- [ ] `PATCH /api/v1/motors/:id` — update fields (not immutable ones).
- [ ] `GET /api/v1/motors/:motorId/history` — append-only timeline.

## 8. Phase 7 — Media Module (Cloudinary)

- [ ] Upload middleware (memory multer or streaming upload).
- [ ] `POST /api/v1/motors/:id/images` — upload to Cloudinary; store metadata in `MotorImage`; record History "Motor image uploaded".
- [ ] Validate file type/size; never store binaries in PostgreSQL (techstack §7).

## 9. Phase 8 — Jobs Module

- [ ] `POST/GET/GET :id/PATCH /api/v1/jobs`.
- [ ] Job status transitions validated server-side (PRD §5) — e.g. RECEIVED → IN_PROGRESS → TESTING → READY_FOR_DELIVERY → DELIVERED, plus CANCELLED.
- [ ] Every status change writes a History record atomically.
- [ ] `GET /api/v1/jobs/:id/history`.

## 10. Phase 9 — Tasks Module

- [ ] `POST /api/v1/jobs/:jobId/tasks` — create + optionally assign (validates employee active).
- [ ] `GET /api/v1/jobs/:jobId/tasks`, `GET /api/v1/tasks/:id`.
- [ ] `PATCH /api/v1/tasks/:id` — update title/description/assignment (records History "Task assigned").
- [ ] `PATCH /api/v1/tasks/:id/status` — employee-driven transitions:
  - ASSIGNED → IN_PROGRESS (set `startedAt`, History "Task started")
  - IN_PROGRESS → COMPLETED (set `completedAt`, History "Task completed")
  - → CANCELLED
- [ ] Employees only see/transition tasks assigned to them (PRD §3).

## 11. Phase 10 — History Module

- [ ] Central `history.service` used by all modules to append events.
- [ ] Enforce append-only (no update/delete endpoints; ignore writes on replica processing).
- [ ] Expose `GET /api/v1/motors/:motorId/history` and `GET /api/v1/jobs/:jobId/history`.
- [ ] Include actor, action, description, and structured `metadata`.

## 12. Phase 11 — Testing & Quality

- [ ] Unit tests (Vitest): env validation, zod schemas, status-transition guards, number generators.
- [ ] Integration tests (Vitest + Supertest) priority areas (techstack §12): auth, authorization, motor creation, job creation, task assignment, task status transitions, history creation, DB transactions.
- [ ] Test setup: isolated test DB (Neon dev DB or SQLite where compatible), cleanup between tests.
- [ ] Run ESLint + Prettier; ensure `npm test` and `npm run lint` pass.

## 13. Phase 12 — Docs & Handover

- [ ] Document API contracts (`docs/` or `README.md`) — request/response examples per endpoint, all wrapped in `{ success, message, code, data }`.
- [ ] `.env.example` complete with all vars.
- [ ] README: setup, migrate, seed, run, test, deploy notes.
- [ ] Final self-verification against MVP acceptance criteria (PRD §14).

## Milestones

| Milestone | Scope | Exit criteria |
|-----------|-------|---------------|
| M0 | Scaffolding + config | Server boots, `/health` OK, env validated |
| M1 | DB schema + auth | Owner + employee login works; roles enforced |
| M2 | Motors + jobs + tasks + employees | Core workflow end-to-end via API |
| M3 | Media + history | Image upload + full timeline working |
| M4 | Tests + hardening | `npm test` / `npm run lint` green; acceptance criteria met |