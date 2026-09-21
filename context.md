# context.md — Hindustan Motor Backend

Single source of truth for business facts, project conventions, and directory structure of the **Motor Workshop Management Backend** built for **Hindustan Electricals Winding Works**.

Read this file (plus `AGENTS.md`, `AI_RULE.md`, `gemini.md`) before implementing anything. When a statement below conflicts with another doc, this file wins.

---

## 1. Business Facts

- **Business:** Hindustan Electricals Winding Works — a real motor rewinding / repair workshop.
- **Contact / conversion CTAs (must remain consistent end-to-end):**
  - Instant Call: `tel:+919825272547`
  - WhatsApp: `https://wa.me/919825272547`
  - `contact.html` is the primary conversion page and must stay valid, functional, and consistent with those CTAs. Mobile conversion is top priority: Instant Call and WhatsApp must always be visible/functional, including a sticky mobile bottom CTA bar on screens < 768px.
- **Integrity Rule:** never invent or state unverified years of experience, certifications, brands serviced, warranty terms, capacities, or statistics. This backend provides the data model; derived claims exposed to users must be verified.
- **Real images only:** never fake or generate photos meant to represent actual business work.
- This repository is the **backend API** consumed by a future **React Native + Expo** mobile app. No web views live here (the marketing site is a separate project).

## 2. Product & Scope

Core workflow: **Motor → Job → Task → Employee → Status → History**.

### MVP includes
- Register every motor received, with customer + motor info.
- Auto-create a Job for each motor; create Tasks under Jobs.
- Assign tasks to employees (admin-only rule), track job/task status.
- Append-only History timeline for every major event.
- Motor images stored in **Cloudinary** (metadata in Postgres, no image binaries in DB).
- REST API under `/api/v1`.

### Out of scope (MVP)
Billing/invoices, payments, inventory, accounting, customer portal, WhatsApp/SMS/push notifications, analytics/reports, web app, multi-branch, workflow automation, and **no login/authentication** of any kind.

## 3. Core Decisions (non-negotiable)

- **No auth, no JWT, no passwords.** The acting employee is identified by the `X-Employee-Id` header on every request. Middleware validates the employee exists and is active, then attaches it as `req.actor`. History stores this id as `actorEmployeeId`.
- **One permission rule only:** only the admin (`OWNER` role) can assign/reassign tasks to employees. Everything else (motor registration, task creation, status updates, image uploads) is open to any active actor. All roles (`OWNER`, `EMPLOYEE`) are labels otherwise.
- **Employee model has no credentials** — name, phone, role, isActive only.
- Business logic lives in **services**, DB access in **repositories**, HTTP concerns in **controllers**, file structure per module (routes/controller/service/repository/schema).
- History is **append-only** — no update/delete endpoints.

## 4. Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js >= 20, plain JS (CommonJS, `"type": "commonjs"`) |
| Framework | Express 4 |
| ORM | Prisma 6 (`@prisma/client`, `prisma`) |
| Database | Neon PostgreSQL via `@neondatabase/serverless` + `@prisma/adapter-neon` (datasource provider postgresql) |
| Validation | Zod 3 (bodies, queries, params, env) |
| Media | Cloudinary 2 + Multer (memory storage) |
| Security | helmet, cors, express-rate-limit |
| Logging | winston (structured) |
| Config | dotenv |
| Tests | vitest + supertest |
| Quality | eslint 9 + prettier |

## 5. Directory Structure

```text
src/
├── app.js                    # Express app factory: helmet, cors, json, rate limiter, logger,
│                             # /health + /, actor middleware on /api/v1, routers, 404 + error handlers
├── index.js                  # Bootstrap: listen on PORT, graceful shutdown (SIGTERM/SIGINT)
├── config/
│   ├── env.js                # Zod env schema (fails fast on missing/invalid)
│   ├── logger.js             # Winston; JSON in production, colorized in dev
│   ├── prisma.js             # PrismaClient (query logging in dev only)
│   └── cloudinary.js         # Cloudinary SDK init (skips config if creds absent)
├── core/
│   ├── errors.js             # AppError + BadRequest/Validation/Unauthorized/Forbidden/NotFound/Conflict
│   ├── response.js           # sendSuccess / sendError envelope helpers
│   ├── asyncHandler.js       # Async wrapper -> next(err)
│   └── middlewares/
│       ├── errorHandler.js   # Zod, Prisma P2002/P2025 mapping, 500 logging
│       └── notFoundHandler.js
├── middlewares/
│   ├── actor.js              # X-Employee-Id header -> active employee -> req.actor
│   ├── rbac.js               # requireAdmin guard (OWNER only)
│   ├── validate.js           # Generic Zod schema validation (body/query/params)
│   └── rateLimiter.js        # express-rate-limit
├── utils/
│   └── numberGenerator.js    # generateUniqueNumber(prefix) -> PREFIX-YYYYMMDD-6HEX
└── modules/
    ├── employees/            # CRUD, status dashboard, tasks-by-employee
    ├── motors/               # Register (motor+job+history in tx), list/search, detail, update
    ├── jobs/                 # Create, list, detail, update, status transitions, history
    ├── tasks/                # Create (optional assign), list, detail, update, status transitions
    ├── history/              # recordHistory service + motor/job history endpoints
    └── media/                # Multer upload middleware, Cloudinary upload, MotorImage row + history

prisma/schema.prisma          # Source of truth for the DB schema
tests/                        # unit/ + integration/ (Vitest + Supertest)
docs/prd.md                   # Product requirements
docs/techstack.md             # Tech stack rationale
plan.md                       # Implementation plan (phases, milestones)
```

## 6. Domain Model (Prisma — `prisma/schema.prisma`)

### Enums
- `Role`: `OWNER | EMPLOYEE`
- `JobStatus`: `RECEIVED | IN_PROGRESS | TESTING | READY_FOR_DELIVERY | DELIVERED | CANCELLED`
- `TaskStatus`: `PENDING | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED`

### Models
- **Employee** `id(cuid) name phone(unique) role(default EMPLOYEE) isActive(default true) createdAt updatedAt` — relations: assignedTasks, historyActions. Indexes: isActive, role.
- **Motor** `id motorNumber(unique) customerName customerPhone brand? motorType? power(Float)? powerUnit(default "HP") rpm(Int)? phase? serialNumber? complaint? notes? receivedAt(default now) expectedDeliveryAt? createdAt updatedAt` — relations: images, jobs, histories. Indexes: customerPhone, customerName, createdAt.
- **MotorImage** `id motorId publicId secureUrl resourceType(default "image") width? height? bytes? format? createdAt` — onDelete Cascade; index motorId. (No binary data — Cloudinary only.)
- **Job** `id jobNumber(unique) motorId status(default RECEIVED) notes? createdAt updatedAt` — relations: motor, tasks, histories. Indexes: motorId, status, createdAt.
- **Task** `id jobId title description? assignedEmployeeId? status(default PENDING) startedAt? completedAt? createdAt updatedAt` — onDelete Cascade on job; SetNull on employee; relations: job, assignedEmployee, histories. Indexes: jobId, assignedEmployeeId, status.
- **History** `id motorId? jobId? taskId? actorEmployeeId action description? metadata(Json)? createdAt` — append-only; onDelete Restrict on actorEmployee, Cascade on motor/job/task. Indexes: motorId, jobId, taskId, actorEmployeeId, createdAt.

### Number generation
`PREFIX-YYYYMMDD-6HEX` via crypto.randomBytes (e.g. `MTR-20260921-A1B2C3`, `JOB-20260921-X1Y2Z3`). Uniqueness enforced by DB unique constraint.

## 7. Status Transition Rules (server-enforced)

### Job (`src/modules/jobs/job.service.js` VALID_TRANSITIONS)
- `RECEIVED` → `IN_PROGRESS`, `CANCELLED`
- `IN_PROGRESS` → `TESTING`, `READY_FOR_DELIVERY`, `CANCELLED`
- `TESTING` → `IN_PROGRESS`, `READY_FOR_DELIVERY`, `CANCELLED`
- `READY_FOR_DELIVERY` → `DELIVERED`, `IN_PROGRESS`, `CANCELLED`
- `DELIVERED` → (terminal — no transitions)
- `CANCELLED` → `RECEIVED`, `IN_PROGRESS`

No-op when status unchanged. Invalid transition → `BadRequestError` `INVALID_STATUS_TRANSITION`.

### Task (`src/modules/tasks/task.service.js` VALID_TASK_TRANSITIONS)
- `PENDING` → `ASSIGNED`, `CANCELLED`
- `ASSIGNED` → `IN_PROGRESS` (sets `startedAt`), `CANCELLED`
- `IN_PROGRESS` → `COMPLETED` (sets `completedAt`), `CANCELLED`
- `COMPLETED` → (terminal)
- `CANCELLED` → `PENDING`, `ASSIGNED`

## 8. API Surface (`/api/v1`)

All endpoints except `GET /` and `GET /health` require the `X-Employee-Id` header naming an active employee.

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/health` | Public; DB ping, uptime, timestamp; 200 healthy / 503 degraded |
| GET | `/` | Public welcome / info |
| POST | `/api/v1/employees` | Any active actor |
| GET | `/api/v1/employees` | Filters: isActive, role |
| GET | `/api/v1/employees/status` | Dashboard: active employee + current active tasks (ASSIGNED/IN_PROGRESS) |
| GET | `/api/v1/employees/:id` | |
| PATCH | `/api/v1/employees/:id` | name/phone/role/isActive |
| GET | `/api/v1/employees/:id/tasks` | Filter: ?status= |
| POST | `/api/v1/motors` | Registers Motor + Job + 2 History rows in one transaction |
| GET | `/api/v1/motors` | Search (number/customer/phone/brand), ?status=, pagination |
| GET | `/api/v1/motors/:id` | Include images, jobs, tasks, assigned employees |
| PATCH | `/api/v1/motors/:id` | Non-immutable fields; records `MOTOR_UPDATED` |
| POST | `/api/v1/motors/:id/images` | Multipart `image` field (jpeg/png/webp, ≤10MB) → Cloudinary → `MotorImage` + history |
| GET | `/api/v1/motors/:motorId/history` | Timeline (also mounted at `/api/v1/history/motors/:motorId`) |
| POST | `/api/v1/jobs` | Requires existing motorId |
| GET | `/api/v1/jobs` | ?status=, ?motorId=, pagination |
| GET | `/api/v1/jobs/:id` | Include motor, images, tasks |
| PATCH | `/api/v1/jobs/:id` | notes only; records `JOB_UPDATED` |
| PATCH | `/api/v1/jobs/:id/status` | State machine; records `JOB_STATUS_CHANGED` in tx |
| GET | `/api/v1/jobs/:jobId/history` | Timeline (also `/api/v1/history/jobs/:jobId`) |
| POST | `/api/v1/jobs/:jobId/tasks` | Assigning (`assignedEmployeeId`) is OWNER-only → task status `ASSIGNED`; else `PENDING` |
| GET | `/api/v1/jobs/:jobId/tasks` | |
| GET | `/api/v1/tasks/:id` | |
| PATCH | `/api/v1/tasks/:id` | title/description + OWNER-only assign/reassign (records `TASK_ASSIGNED`) |
| PATCH | `/api/v1/tasks/:id/status` | State machine; records `TASK_STARTED`/`TASK_COMPLETED` |

### History actions emitted
`MOTOR_REGISTERED`, `JOB_CREATED`, `MOTOR_UPDATED`, `JOB_UPDATED`, `JOB_STATUS_CHANGED`, `TASK_CREATED`, `TASK_ASSIGNED`, `TASK_STARTED`, `TASK_COMPLETED`, `TASK_STATUS_CHANGED`, `MOTOR_IMAGE_UPLOADED`.

## 9. Conventions

### Response envelope
```json
{ "success": true, "message": "...", "data": { } }
{ "success": false, "message": "...", "code": "CODE", "data": null }
```
Helpers `sendSuccess` / `sendError` in `src/core/response.js`.

### Error codes (subset)
- Zod → `VALIDATION_ERROR` (400, field-level `data` array)
- Prisma P2002 → `DUPLICATE_RESOURCE` (409); P2025 → `RESOURCE_NOT_FOUND` (404)
- Actor: `ACTOR_HEADER_MISSING`, `ACTOR_NOT_FOUND`, `ACTOR_INACTIVE` (all 401)
- RBAC: `ADMIN_ONLY` (403)
- Business: `INVALID_STATUS_TRANSITION`, `INVALID_EMPLOYEE`, `PHONE_ALREADY_EXISTS`, `MOTOR_NOT_FOUND`, `JOB_NOT_FOUND`, `TASK_NOT_FOUND`, `EMPLOYEE_NOT_FOUND`, `INVALID_FILE_TYPE`, `FILE_REQUIRED`, `UPLOAD_FAILED`, `RATE_LIMIT_EXCEEDED`.

### Naming
- Files: `kebab-case` (`motor.service.js`). Classes `PascalCase`, singletons exported via `module.exports = new XService()`.
- Controllers thin, services handle business logic + history, repositories wrap Prisma.
- DB access always through repositories (except service-level existence checks using shared `prisma`).

## 10. Environment Variables (`src/config/env.js` determines required)

| Var | Default | Required |
|---|---|---|
| NODE_ENV | development | enum dev/prod/test |
| PORT | 5000 | no |
| DATABASE_URL | — | **yes** |
| ACTOR_HEADER | X-Employee-Id | no |
| CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET | — | no (upload fails without them) |
| CORS_ORIGIN | * | no |
| RATE_LIMIT_WINDOW_MS | 900000 | no |
| RATE_LIMIT_MAX | 1000 | no |
| LOG_LEVEL | debug (dev) / info (prod) | no |

Secrets never committed; see `.env.example`.

## 11. Commands

```bash
npm start                 # production start
npm run dev               # nodemon
npm test                  # vitest run
npm run test:watch        # vitest watch
npm run lint              # eslint .
npm run format            # prettier --write .
npm run prisma:generate   # prisma generate
npm run prisma:push       # prisma db push
```

## 12. Testing

- **Unit (Vitest, mocked Prisma):** number generator, Zod schemas, job/task transition state machines.
- **Integration (Vitest + Supertest):** health/root, actor middleware (missing/unknown/inactive header), RBAC (OWNER-only assignment), motor registration + validation, standardized error envelopes + 404.
- `tests/setup.js` forces `NODE_ENV=test` and a mock `DATABASE_URL`; integration tests mock Prisma methods via `vi.spyOn`. Setup/teardown uses `vi.restoreAllMocks()` in `beforeEach`.

## 13. Current Status

- Scaffolded and implemented per `plan.md` (Phases 0–10 complete): config, schema, middleware, all six modules, and test suite present.
- Repo state: `src/`, `prisma/`, `tests/`, configs are uncommitted/new; recent commits added docs (`AGENTS.md` wiring, `docs/prd.md`, `docs/techstack.md`, `plan.md`).
- `README.md` exists at root with setup instructions and endpoint table.
- `AI_RULE.md` and `agents/skills/` are referenced by `opencode.jsonc` / `AGENTS.md` but are **not yet present** in this repo — should be created to satisfy the mandatory pre-implementation protocol.