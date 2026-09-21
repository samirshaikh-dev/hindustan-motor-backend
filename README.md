# Hindustan Electricals Winding Works — Motor Workshop Backend

A REST API backend built as a **modular monolith** with Node.js, Express, Prisma ORM, Neon PostgreSQL, and Cloudinary for the **Hindustan Electricals Winding Works** Motor Workshop Management Application.

---

## Features

- **No Passwords / Credentials**: Uses request-level actor header (`X-Employee-Id`) validated against active employees in Neon PostgreSQL.
- **Enforced Role Access**: Single rule: only the `OWNER` can assign tasks to employees; all other operations (motor registration, updates, task completion, media upload) are open to all active workshop workers.
- **Immutable History Audit**: Every major domain event (motor registered, job status changed, task created/assigned/started/completed, image uploaded) is atomically recorded in an append-only timeline.
- **Robust Validation**: Zod validation schemas for all requests, query parameters, route parameters, and environment variables.
- **Structured Logging & Error Envelopes**: Winston logger with consistent error envelopes matching `{ success, message, code, data }`.

---

## Directory Structure

```text
src/
├── app.js                          # Express app factory
├── index.js                        # Server entry point & graceful shutdown
├── config/
│   ├── env.js                      # Environment schema validation (Zod)
│   ├── logger.js                   # Winston structured logging
│   ├── prisma.js                   # Prisma Client configuration
│   └── cloudinary.js               # Cloudinary SDK setup
├── core/
│   ├── errors.js                   # Custom error classes
│   ├── response.js                 # Unified response helpers
│   ├── asyncHandler.js             # Async route handler wrapper
│   └── middlewares/
│       ├── errorHandler.js         # Centralized error handler
│       └── notFoundHandler.js      # 404 handler
├── middlewares/
│   ├── actor.js                    # X-Employee-Id identity header validation
│   ├── rbac.js                     # requireAdmin guard
│   ├── validate.js                 # Generic Zod validation middleware
│   └── rateLimiter.js              # Rate limiter
├── utils/
│   └── numberGenerator.js          # Unique motor/job number generator
└── modules/
    ├── employees/                  # Employee management & dashboard
    ├── motors/                     # Motor registration, details, and search
    ├── jobs/                       # Job workflow & status transitions
    ├── tasks/                      # Task creation, assignment, progress
    ├── history/                    # Append-only audit trail
    └── media/                      # Cloudinary photo upload & metadata
```

---

## Prerequisites

- **Node.js**: >= 20.x
- **npm**: >= 10.x
- **Neon PostgreSQL**: Connection URL
- **Cloudinary**: Account credentials for photo storage

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Key environment variables:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@ep-sample-pool.neon.tech/neondb?sslmode=require
ACTOR_HEADER=X-Employee-Id
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CORS_ORIGIN=*
```

### 3. Database Migration

Generate Prisma client and push the schema to Neon PostgreSQL:

```bash
npm run prisma:generate
npm run prisma:push
```

### 4. Running the Server

- **Development Mode** (with hot reloading):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```

---

## Running Tests & Quality Checks

```bash
# Run test suite (Vitest)
npm test

# Run ESLint
npm run lint

# Format code (Prettier)
npm run format
```

---

## API Documentation

All protected API endpoints require the `X-Employee-Id` HTTP header pointing to an active employee.

### Standard Response Envelope
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "data": [
    { "field": "body.customerPhone", "message": "Phone must be at least 10 digits" }
  ]
}
```

### Core Endpoints Overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/health` | Uptime and database health | Public |
| `POST` | `/api/v1/employees` | Register an employee | Active Employee |
| `GET` | `/api/v1/employees` | List employees | Active Employee |
| `GET` | `/api/v1/employees/status` | Employee status dashboard with active tasks | Active Employee |
| `GET` | `/api/v1/employees/:id` | Get employee details | Active Employee |
| `PATCH` | `/api/v1/employees/:id` | Update employee | Active Employee |
| `GET` | `/api/v1/employees/:id/tasks` | Get tasks assigned to employee | Active Employee |
| `POST` | `/api/v1/motors` | Register motor (auto-creates job + history) | Active Employee |
| `GET` | `/api/v1/motors` | List motors (search, filter, paginate) | Active Employee |
| `GET` | `/api/v1/motors/:id` | Get motor details with jobs and tasks | Active Employee |
| `PATCH` | `/api/v1/motors/:id` | Update motor details | Active Employee |
| `POST` | `/api/v1/motors/:id/images` | Upload motor image to Cloudinary | Active Employee |
| `GET` | `/api/v1/motors/:motorId/history` | Timeline of events for a motor | Active Employee |
| `GET` | `/api/v1/jobs` | List jobs | Active Employee |
| `GET` | `/api/v1/jobs/:id` | Get job details | Active Employee |
| `PATCH` | `/api/v1/jobs/:id/status` | Update job status (state machine) | Active Employee |
| `GET` | `/api/v1/jobs/:id/history` | Timeline of events for a job | Active Employee |
| `POST` | `/api/v1/jobs/:jobId/tasks` | Create task (assigning requires admin) | Active Employee (OWNER if assigning) |
| `GET` | `/api/v1/jobs/:jobId/tasks` | List tasks under a job | Active Employee |
| `GET` | `/api/v1/tasks/:id` | Get task details | Active Employee |
| `PATCH` | `/api/v1/tasks/:id` | Update task (assigning requires admin) | Active Employee (OWNER if assigning) |
| `PATCH` | `/api/v1/tasks/:id/status` | Advance task status (ASSIGNED -> IN_PROGRESS -> COMPLETED) | Active Employee |
