# Motor Workshop Task Management App — PRD

## 1. Product Overview

**Product:** Hindustan Electricals Winding Works — Motor Workshop Management App

The application will help the workshop owner and employees manage motors received for repair/rewinding, assign work to employees, track job/task status, and maintain a complete history of work performed on each motor.

The first release will focus only on the core workflow:

**Motor → Job → Task → Employee → Status → History**

The backend will be built first as a **modular monolith** using Node.js and will expose a REST API for a future React Native Expo mobile application.

---

## 2. Goals

### Primary Goals

- Register every motor received by the workshop.
- Maintain customer and motor information.
- Create and manage a job for each motor.
- Create tasks for a job.
- Assign tasks to employees.
- Track task and job status.
- Maintain an immutable activity/history timeline.
- Allow the mobile app to consume the backend through REST APIs.
- Store motor/job images using Cloudinary.
- Store application data in Neon PostgreSQL.

### Non-Goals for MVP

The first version will NOT include:

- Billing/invoices
- Payments
- Inventory management
- Accounting
- Customer-facing portal
- WhatsApp/SMS notifications
- Push notifications
- Advanced analytics/reports
- Web application
- Multiple workshops/branches
- Complex workflow automation

These can be added later without changing the core architecture significantly.

---

## 3. Roles (Labels Only)

There is **no login/authentication** in this app. The acting employee is identified on every request via an `X-Employee-Id` header, which the backend validates (employee exists and is active). The only permission enforced is that **only the admin (role `OWNER`) can assign tasks to employees**; every other operation is open to all actors.

### Admin

- Views a dashboard showing every employee and their current status
- Creates/updates employee records
- Registers motors and creates jobs
- Creates tasks and **assigns them to employees** (admin-only)
- Updates job/task status
- Uploads/view motor images

### Employee

- Registers new motors (auto-creates the related job)
- Creates tasks (assignment must be done by the admin)
- Updates job/task status
- Uploads/view motor images
- Views assigned tasks and related motor/job information

---

## 4. Core Domain Model

### Motor

Represents the physical motor received by the workshop.

Suggested fields:

- id
- motorNumber
- customerName
- customerPhone
- brand
- motorType
- power
- powerUnit
- rpm
- phase
- serialNumber
- complaint
- notes
- receivedAt
- expectedDeliveryAt
- images
- createdAt
- updatedAt

### Job

Represents the workshop work order associated with a motor.

A motor will normally have one active job in the MVP.

Suggested fields:

- id
- jobNumber
- motorId
- status
- notes
- createdAt
- updatedAt

### Task

Represents an individual piece of work within a job.

Examples:

- Inspection
- Dismantling
- Winding
- Varnishing
- Assembly
- Testing

Suggested fields:

- id
- jobId
- title
- description
- assignedEmployeeId
- status
- startedAt
- completedAt
- createdAt
- updatedAt

### Employee

Represents a workshop worker.

Suggested fields:

- id
- name
- phone
- role
- isActive
- createdAt
- updatedAt

Authentication/credential fields are not needed — employees are identified by name/phone, and the acting employee is supplied per request via a header.

### History

Represents an activity/event performed against a motor, job, or task.

Examples:

- Motor registered
- Job created
- Task created
- Task assigned
- Task started
- Task completed
- Job status changed
- Motor image uploaded

Suggested fields:

- id
- motorId
- jobId
- taskId
- actorUserId
- action
- description
- metadata
- createdAt

History should be append-only from the application perspective.

---

## 5. Statuses

### Job Status

Recommended initial statuses:

1. `RECEIVED`
2. `IN_PROGRESS`
3. `TESTING`
4. `READY_FOR_DELIVERY`
5. `DELIVERED`
6. `CANCELLED`

### Task Status

Recommended initial statuses:

1. `PENDING`
2. `ASSIGNED`
3. `IN_PROGRESS`
4. `COMPLETED`
5. `CANCELLED`

The backend should validate status transitions rather than allowing arbitrary values from the client.

---

## 6. Core Workflow

### Motor Registration

1. An employee registers a motor.
2. Backend validates the request.
3. Backend generates a unique motor number.
4. Backend creates the motor.
5. Backend creates the related job.
6. Backend records a history event.

### Task Assignment

1. An employee opens a job and creates a task (unassigned).
2. The admin assigns the task to an employee.
3. Backend validates that the actor is the admin and that the employee is active.
4. Task is assigned.
5. History event is recorded.

### Employee Work

1. Employee views assigned tasks.
2. Employee starts a task.
3. Backend updates task status to `IN_PROGRESS`.
4. History event is recorded.
5. Employee completes the task.
6. Backend updates task status to `COMPLETED`.
7. Completion timestamp is stored.
8. History event is recorded.

### Job Progress

Job status can be updated by any employee according to the defined workflow.

Every important status change must create a history record.

---

## 7. API Requirements

The backend will expose REST APIs under `/api/v1`.

No login endpoints exist. Every request carries an `X-Employee-Id` header identifying the acting employee (validated against active employees by middleware).

### Motors

- `POST /api/v1/motors`
- `GET /api/v1/motors`
- `GET /api/v1/motors/:id`
- `PATCH /api/v1/motors/:id`
- `POST /api/v1/motors/:id/images`

### Jobs

- `POST /api/v1/jobs`
- `GET /api/v1/jobs`
- `GET /api/v1/jobs/:id`
- `PATCH /api/v1/jobs/:id`
- `GET /api/v1/jobs/:id/history`

### Tasks

- `POST /api/v1/jobs/:jobId/tasks`
- `GET /api/v1/jobs/:jobId/tasks`
- `GET /api/v1/tasks/:id`
- `PATCH /api/v1/tasks/:id`
- `PATCH /api/v1/tasks/:id/status`

### Employees

- `POST /api/v1/employees`
- `GET /api/v1/employees`
- `GET /api/v1/employees/:id`
- `PATCH /api/v1/employees/:id`
- `GET /api/v1/employees/:id/tasks`

### History

- `GET /api/v1/motors/:motorId/history`
- `GET /api/v1/jobs/:jobId/history`

Exact API contracts should be documented separately as the implementation progresses.

---

## 8. Validation Requirements

The backend must validate:

- Required fields
- Phone number format
- Valid IDs
- Active employee assignment
- Admin-only task assignment (actor role `OWNER`)
- Valid enum/status values
- Status transitions
- Duplicate motor/job numbers
- File/image metadata where applicable

Client-side validation must not replace backend validation.

---

## 9. Image Requirements

Images will be stored in **Cloudinary**.

The database should store Cloudinary metadata such as:

- publicId
- secureUrl
- resourceType
- width
- height
- createdAt

The backend should control upload authorization and should not store image binary data in PostgreSQL.

---

## 10. Security Requirements

- The actor `X-Employee-Id` header is validated against active employees on every request.
- Only the admin (role `OWNER`) can assign tasks to employees; enforced server-side.
- Secrets must be stored in environment variables.
- Request validation must happen on the server.
- Consistent error responses must be returned.
- Sensitive fields must not be exposed unnecessarily.
- CORS must be configured for the mobile client/environment.
- Rate limiting may be applied to the API.

---

## 11. Error Response Format

Use a consistent structure:

```json
{
  "success": false,
  "message": "Task not found",
  "code": "TASK_NOT_FOUND",
  "data": null
}
```

Successful responses:

```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {}
}
```

Validation errors may include field-level details.

---

## 12. Architecture

The backend will use a **Modular Monolith** architecture.

Each business domain owns its:

- Routes
- Controllers
- Services
- Validation
- Database/repository logic
- Domain-specific types

Example modules:

- Employees
- Motors
- Jobs
- Tasks
- History
- Media

Modules live inside one deployable Node.js application.

---

## 13. Non-Functional Requirements

### Maintainability

- Clean, modular JavaScript (Node.js) throughout the backend.
- Clear module boundaries.
- Business logic should live in services, not controllers.
- Database access should not be scattered throughout the application.

### Reliability

- Use database transactions for operations that modify multiple related records.
- History creation should happen atomically with important business operations where appropriate.

### Scalability

The initial application will be a monolith, but modules should remain sufficiently decoupled so individual domains can be changed later.

### Observability

- Structured application logging.
- Request/error logging.
- Health check endpoint.

Suggested:

`GET /health`

---

## 14. MVP Acceptance Criteria

The MVP is considered functional when:

- The acting employee is identified via an `X-Employee-Id` header; missing/inactive IDs are rejected.
- The admin can view every employee and their current status.
- A new motor can be registered.
- A job can be created for a motor.
- Tasks can be created for a job.
- Tasks can be assigned to employees (admin/OWNER only).
- Employees can see their assigned tasks.
- Employees can start and complete tasks.
- Job status can be updated by any employee.
- Motor/job history is automatically recorded.
- Motor images can be uploaded to Cloudinary.
- Data persists correctly in Neon PostgreSQL.
- REST APIs are usable by the future React Native Expo application.

---

## 15. Future Extensions

Possible later modules:

- Customers
- Billing/invoices
- Payments
- Inventory/spare parts
- Estimates
- Delivery tracking
- Push notifications
- WhatsApp integration
- Reports
- Search improvements
- Audit logs
- Multi-branch support
