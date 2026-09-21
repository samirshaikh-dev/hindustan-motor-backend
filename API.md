# Hindustan Electricals Winding Works — API Documentation

Comprehensive REST API reference for the **Hindustan Electricals Winding Works** Motor Workshop Management Backend.

---

## 1. Overview & Conventions

### Base URL
```text
http://localhost:5000/api/v1
```

### Actor Identification Header
There are no login or JWT endpoints in the MVP. Every request to `/api/v1/*` must include the header:
```http
X-Employee-Id: <employee_id>
```
The server validates that this employee exists and is active (`isActive: true`).

### Single Permission Rule
- Roles are **labels** (`OWNER`, `EMPLOYEE`).
- **Only an actor with role `OWNER` can assign or reassign tasks** (providing `assignedEmployeeId`).
- All other actions (registering motors, creating tasks, updating job/task status, uploading photos) are open to all active employees.

### Standard Response Envelope
All successful API responses return status `200` or `201` with this format:
```json
{
  "success": true,
  "message": "Human-readable success message",
  "data": {}
}
```

### Standard Error Envelope
All error responses return standard HTTP error status codes (`400`, `401`, `403`, `404`, `409`, `500`):
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE_STRING",
  "data": null
}
```

---

## 2. Health & System Endpoints

### 2.1 Health Check
Checks server uptime and Neon PostgreSQL connection status. Bypasses actor header check.

- **Method**: `GET`
- **URL**: `/health`
- **Headers**: None required

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Health check status",
  "data": {
    "status": "healthy",
    "database": "connected",
    "uptime": 124.58,
    "timestamp": "2026-09-21T10:00:00.000Z"
  }
}
```

---

### 2.2 Root Welcome Endpoint
Returns service information. Bypasses actor header check.

- **Method**: `GET`
- **URL**: `/`
- **Headers**: None required

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Hindustan Electricals Winding Works API is running",
  "data": {
    "docs": "/api/v1",
    "health": "/health"
  }
}
```

---

### 2.3 Application Version Check
Returns application name, semantic version, environment, and Node runtime version. Bypasses actor header check.

- **Method**: `GET`
- **URL**: `/version` or `/api/v1/version`
- **Headers**: None required

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Application version",
  "data": {
    "name": "hindustan-motor-backend",
    "version": "1.0.0",
    "environment": "development",
    "nodeVersion": "v20.x.x",
    "startTime": "2026-09-21T10:00:00.000Z",
    "uptime": 625,
    "timestamp": "2026-09-21T10:10:25.000Z"
  }
}
```

---

### 2.4 API v1 Overview Index
Returns the available endpoints and authentication instructions for API v1. Bypasses actor header check.

- **Method**: `GET`
- **URL**: `/api/v1`
- **Headers**: None required

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Hindustan Electricals Winding Works API v1",
  "data": {
    "version": "1.0.0",
    "endpoints": {
      "employees": "/api/v1/employees",
      "employeeStatus": "/api/v1/employees/status",
      "motors": "/api/v1/motors",
      "jobs": "/api/v1/jobs",
      "tasks": "/api/v1/tasks",
      "history": "/api/v1/history",
      "health": "/health",
      "version": "/version"
    },
    "authentication": {
      "type": "Header",
      "header": "X-Employee-Id",
      "description": "Provide an active employee ID in the X-Employee-Id header for all protected API requests"
    }
  }
}
```

---

## 3. Admin Authentication Module (`/api/v1/auth` and `/api/auth`)

The system features a single dedicated workshop owner/admin account with industry-standard **Access Token + Refresh Token** authentication.
- **Admin Credentials**: Strictly kept in environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) with **zero database credential storage**.
- **Access Tokens**: Short-lived (15 minutes) cryptographically signed JWTs passed via `Authorization: Bearer <token>`. Never stored in the database.
- **Refresh Tokens**: Long-lived (7 days) tokens delivered via **`HttpOnly, Secure` cookies**. Never exposed in JSON responses or `localStorage`.
- **Hashed Server-side Storage**: Refresh tokens are stored exclusively as SHA-256 hashes in the `AdminSession` table.
- **Token Rotation & Reuse Detection**: Every refresh rotates the refresh token. If an invalidated or already-rotated token is reused, the entire session family is automatically revoked to prevent session hijacking.

---

### 3.1 Admin Login
Authenticates the workshop admin, issues a short-lived access token, and sets a secure HttpOnly refresh token cookie.

- **Method**: `POST`
- **URL**: `/api/v1/auth/login` (or `/api/auth/login`)
- **Headers**: None required
- **Cookies Set**: `refreshToken=<token>; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; [Secure]`

#### Request Payload
```json
{
  "email": "admin@example.com",
  "password": "your-secure-password"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "15m",
    "admin": {
      "email": "admin@example.com",
      "role": "OWNER"
    }
  }
}
```

#### Error Responses
- **Invalid Credentials (`401 Unauthorized`)**:
  ```json
  {
    "success": false,
    "message": "Invalid email or password",
    "code": "INVALID_CREDENTIALS",
    "data": null
  }
  ```
- **Validation Error (`400 Bad Request`)**:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "data": [{ "field": "body.email", "message": "Invalid email address" }]
  }
  ```

---

### 3.2 Refresh Access Token
Rotates the refresh token, revokes the old session, and issues a new access token and rotated refresh token cookie.

- **Method**: `POST`
- **URL**: `/api/v1/auth/refresh` (or `/api/auth/refresh`)
- **Headers**: None required (cookie read automatically)
- **Cookies Expected**: `refreshToken=<token>`
- **Cookies Set**: New rotated `refreshToken=<new_token>; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax; [Secure]`

#### Request Payload
None required (token is read from `refreshToken` cookie). Optionally accepts `{"refreshToken": "..."}` for non-browser API clients.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Access token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "15m"
  }
}
```

#### Error Responses
- **Missing Refresh Token (`401 Unauthorized`)**:
  ```json
  {
    "success": false,
    "message": "Refresh token required",
    "code": "REFRESH_TOKEN_REQUIRED",
    "data": null
  }
  ```
- **Reuse Detected / Session Compromise (`401 Unauthorized`)**:
  *(Automatically revokes all sessions associated with that token family and clears the cookie)*
  ```json
  {
    "success": false,
    "message": "Refresh token reuse detected. Session invalidated.",
    "code": "TOKEN_REUSE_DETECTED",
    "data": null
  }
  ```
- **Expired Refresh Token (`401 Unauthorized`)**:
  ```json
  {
    "success": false,
    "message": "Refresh token has expired",
    "code": "REFRESH_TOKEN_EXPIRED",
    "data": null
  }
  ```

---

### 3.3 Admin Logout
Revokes the server-side refresh session and clears the `refreshToken` cookie.

- **Method**: `POST`
- **URL**: `/api/v1/auth/logout` (or `/api/auth/logout`)
- **Headers**: None required
- **Cookies Expected**: `refreshToken=<token>`
- **Cookies Cleared**: `refreshToken=; Path=/; Max-Age=0`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

### 3.4 Get Current Admin Profile
Retrieves authenticated admin profile using the Bearer access token.

- **Method**: `GET`
- **URL**: `/api/v1/auth/me`
- **Headers**: `Authorization: Bearer <access_token>`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Admin profile retrieved",
  "data": {
    "email": "admin@example.com",
    "role": "OWNER"
  }
}
```

#### Error Responses
- **Missing Token (`401 Unauthorized`)**:
  ```json
  {
    "success": false,
    "message": "Admin authorization token required",
    "code": "TOKEN_REQUIRED",
    "data": null
  }
  ```
- **Invalid / Expired Token (`401 Unauthorized`)**:
  ```json
  {
    "success": false,
    "message": "Invalid or expired access token",
    "code": "INVALID_TOKEN",
    "data": null
  }
  ```


---

## 4. Employees Module (`/api/v1/employees`)

### 3.1 Register an Employee
Creates a new workshop employee or owner.

- **Method**: `POST`
- **URL**: `/api/v1/employees`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Request Payload
```json
{
  "name": "Imran Shaikh",
  "phone": "9825272547",
  "role": "EMPLOYEE"
}
```
*Note: `role` is optional and defaults to `"EMPLOYEE"`. Allowed values: `"OWNER"`, `"EMPLOYEE"`.*

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "id": "cm7a1b2c3d4e5f6g7h8i9j0k",
    "name": "Imran Shaikh",
    "phone": "9825272547",
    "role": "EMPLOYEE",
    "isActive": true,
    "createdAt": "2026-09-21T10:00:00.000Z",
    "updatedAt": "2026-09-21T10:00:00.000Z"
  }
}
```

---

### 3.2 List All Employees
Retrieves all employees, with optional filtering and pagination.

- **Method**: `GET`
- **URL**: `/api/v1/employees`
- **Headers**: `X-Employee-Id: <actor_id>`
- **Query Parameters**:
  - `isActive` (optional, boolean): `true` or `false`
  - `role` (optional): `OWNER` or `EMPLOYEE`
  - `search` (optional): search by name or phone
  - `page` (optional, default: `1`): page number
  - `limit` (optional, default: `20`, max: `100`): items per page

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Employees retrieved successfully",
  "data": {
    "employees": [
      {
        "id": "cm7a1b2c3d4e5f6g7h8i9j0k",
        "name": "Imran Shaikh",
        "phone": "9825272547",
        "role": "OWNER",
        "isActive": true,
        "createdAt": "2026-09-21T10:00:00.000Z",
        "updatedAt": "2026-09-21T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```


---

### 3.3 Employee Status Dashboard
Returns all active workshop employees along with their active tasks and job progress.

- **Method**: `GET`
- **URL**: `/api/v1/employees/status`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Employee status dashboard retrieved successfully",
  "data": [
    {
      "id": "cm7a1b2c3d4e5f6g7h8i9j0k",
      "name": "Imran Shaikh",
      "phone": "9825272547",
      "role": "OWNER",
      "isActive": true,
      "activeTaskCount": 1,
      "activeTasks": [
        {
          "id": "task_123",
          "title": "Rotor Rewinding",
          "status": "IN_PROGRESS",
          "startedAt": "2026-09-21T10:15:00.000Z",
          "job": {
            "id": "job_123",
            "jobNumber": "JOB-20260921-A1B2C3",
            "status": "IN_PROGRESS",
            "motor": {
              "id": "motor_123",
              "motorNumber": "MTR-20260921-X1Y2Z3",
              "customerName": "Patel Industries"
            }
          }
        }
      ]
    }
  ]
}
```

---

### 3.4 Get Employee Details
Retrieves details for a specific employee.

- **Method**: `GET`
- **URL**: `/api/v1/employees/:id`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Employee retrieved successfully",
  "data": {
    "id": "cm7a1b2c3d4e5f6g7h8i9j0k",
    "name": "Imran Shaikh",
    "phone": "9825272547",
    "role": "OWNER",
    "isActive": true,
    "createdAt": "2026-09-21T10:00:00.000Z",
    "updatedAt": "2026-09-21T10:00:00.000Z"
  }
}
```

---

### 3.5 Update Employee
Updates employee information, role, or active status.

- **Method**: `PATCH`
- **URL**: `/api/v1/employees/:id`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Request Payload
```json
{
  "name": "Imran S. Shaikh",
  "phone": "9825272547",
  "role": "OWNER",
  "isActive": true
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {
    "id": "cm7a1b2c3d4e5f6g7h8i9j0k",
    "name": "Imran S. Shaikh",
    "phone": "9825272547",
    "role": "OWNER",
    "isActive": true,
    "updatedAt": "2026-09-21T10:20:00.000Z"
  }
}
```

---

### 3.6 Get Employee Tasks
Retrieves tasks assigned to a specific employee with pagination and status filtering.

- **Method**: `GET`
- **URL**: `/api/v1/employees/:id/tasks`
- **Headers**: `X-Employee-Id: <actor_id>`
- **Query Parameters**:
  - `status` (optional): `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
  - `page` (optional, default: `1`): page number
  - `limit` (optional, default: `20`, max: `100`): items per page

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Employee tasks retrieved successfully",
  "data": {
    "tasks": [
      {
        "id": "task_123",
        "jobId": "job_123",
        "title": "Stator Coil Replacement",
        "description": "Rewind 15 HP coil",
        "status": "IN_PROGRESS",
        "startedAt": "2026-09-21T10:15:00.000Z",
        "completedAt": null,
        "job": {
          "id": "job_123",
          "jobNumber": "JOB-20260921-A1B2C3",
          "status": "IN_PROGRESS",
          "motor": {
            "id": "motor_123",
            "motorNumber": "MTR-20260921-X1Y2Z3",
            "customerName": "Patel Industries",
            "customerPhone": "9825000000",
            "brand": "Kirloskar"
          }
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```


---

## 4. Motors Module (`/api/v1/motors`)

### 4.1 Register a Motor
Atomically registers a motor received by the workshop, auto-generates unique `motorNumber` and `jobNumber`, creates the associated `Job` (with status `RECEIVED`), and records the initial `History` audit log.

- **Method**: `POST`
- **URL**: `/api/v1/motors`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Request Payload
```json
{
  "customerName": "Patel Industries",
  "customerPhone": "9825000000",
  "brand": "Kirloskar",
  "motorType": "Three Phase Induction Motor",
  "power": 15,
  "powerUnit": "HP",
  "rpm": 1440,
  "phase": "3 Phase",
  "serialNumber": "KIR-2023-9988",
  "complaint": "Overheating and abnormal humming sound",
  "notes": "Urgent delivery required",
  "expectedDeliveryAt": "2026-09-25T18:00:00.000Z"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Motor registered and job created successfully",
  "data": {
    "id": "motor_123",
    "motorNumber": "MTR-20260921-A8F1C0",
    "customerName": "Patel Industries",
    "customerPhone": "9825000000",
    "brand": "Kirloskar",
    "motorType": "Three Phase Induction Motor",
    "power": 15,
    "powerUnit": "HP",
    "rpm": 1440,
    "phase": "3 Phase",
    "serialNumber": "KIR-2023-9988",
    "complaint": "Overheating and abnormal humming sound",
    "notes": "Urgent delivery required",
    "receivedAt": "2026-09-21T10:00:00.000Z",
    "expectedDeliveryAt": "2026-09-25T18:00:00.000Z",
    "createdAt": "2026-09-21T10:00:00.000Z",
    "updatedAt": "2026-09-21T10:00:00.000Z",
    "job": {
      "id": "job_123",
      "jobNumber": "JOB-20260921-B9D2E4",
      "motorId": "motor_123",
      "status": "RECEIVED",
      "notes": "Initial complaint: Overheating and abnormal humming sound",
      "createdAt": "2026-09-21T10:00:00.000Z",
      "updatedAt": "2026-09-21T10:00:00.000Z"
    }
  }
}
```

---

### 4.2 List Motors
Lists motors with pagination, text search (motorNumber, customerName, customerPhone, brand), and job status filtering.

- **Method**: `GET`
- **URL**: `/api/v1/motors`
- **Headers**: `X-Employee-Id: <actor_id>`
- **Query Parameters**:
  - `search` (optional): search string
  - `status` (optional): `RECEIVED`, `IN_PROGRESS`, `TESTING`, `READY_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`
  - `page` (optional, default: `1`): page number
  - `limit` (optional, default: `20`, max: `100`): items per page

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Motors retrieved successfully",
  "data": {
    "motors": [
      {
        "id": "motor_123",
        "motorNumber": "MTR-20260921-A8F1C0",
        "customerName": "Patel Industries",
        "customerPhone": "9825000000",
        "brand": "Kirloskar",
        "power": 15,
        "powerUnit": "HP",
        "receivedAt": "2026-09-21T10:00:00.000Z",
        "images": [],
        "jobs": [
          {
            "id": "job_123",
            "jobNumber": "JOB-20260921-B9D2E4",
            "status": "RECEIVED"
          }
        ]
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 4.3 Get Motor Details
Retrieves complete details of a motor, including its jobs, tasks, assigned employees, and images.

- **Method**: `GET`
- **URL**: `/api/v1/motors/:id`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Motor retrieved successfully",
  "data": {
    "id": "motor_123",
    "motorNumber": "MTR-20260921-A8F1C0",
    "customerName": "Patel Industries",
    "customerPhone": "9825000000",
    "brand": "Kirloskar",
    "power": 15,
    "powerUnit": "HP",
    "rpm": 1440,
    "phase": "3 Phase",
    "serialNumber": "KIR-2023-9988",
    "complaint": "Overheating",
    "notes": "Urgent delivery",
    "images": [
      {
        "id": "img_123",
        "secureUrl": "https://res.cloudinary.com/demo/image/upload/v1/motors/motor_123.jpg",
        "width": 1920,
        "height": 1080
      }
    ],
    "jobs": [
      {
        "id": "job_123",
        "jobNumber": "JOB-20260921-B9D2E4",
        "status": "RECEIVED",
        "tasks": [
          {
            "id": "task_123",
            "title": "Initial Dismantling",
            "status": "ASSIGNED",
            "assignedEmployee": {
              "id": "emp_123",
              "name": "Imran Shaikh",
              "phone": "9825272547"
            }
          }
        ]
      }
    ]
  }
}
```

---

### 4.4 Update Motor Details
Updates editable fields of a motor and records a history audit log.

- **Method**: `PATCH`
- **URL**: `/api/v1/motors/:id`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Request Payload
```json
{
  "complaint": "Overheating and worn-out bearings",
  "expectedDeliveryAt": "2026-09-26T12:00:00.000Z"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Motor updated successfully",
  "data": {
    "id": "motor_123",
    "motorNumber": "MTR-20260921-A8F1C0",
    "complaint": "Overheating and worn-out bearings",
    "expectedDeliveryAt": "2026-09-26T12:00:00.000Z",
    "updatedAt": "2026-09-21T10:30:00.000Z"
  }
}
```

---

### 4.5 Upload Motor Image
Uploads a workshop image for a motor to Cloudinary, stores image metadata in Neon PostgreSQL, and writes an activity record.

- **Method**: `POST`
- **URL**: `/api/v1/motors/:id/images`
- **Headers**:
  - `X-Employee-Id: <actor_id>`
  - `Content-Type: multipart/form-data`
- **Body**: Form data containing field `image` (binary file: JPEG, PNG, or WebP; max 10MB)

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Motor image uploaded successfully",
  "data": {
    "id": "img_123",
    "motorId": "motor_123",
    "publicId": "motors/MTR-20260921-A8F1C0/xyz123",
    "secureUrl": "https://res.cloudinary.com/demo/image/upload/v12345/motors/MTR-20260921-A8F1C0/xyz123.jpg",
    "resourceType": "image",
    "width": 1920,
    "height": 1080,
    "bytes": 456789,
    "format": "jpg",
    "createdAt": "2026-09-21T10:35:00.000Z"
  }
}
```

---

### 4.6 Get Motor History Timeline
Retrieves the chronological audit timeline for a motor.

- **Method**: `GET`
- **URL**: `/api/v1/motors/:motorId/history`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Motor history retrieved successfully",
  "data": [
    {
      "id": "hist_1",
      "action": "MOTOR_IMAGE_UPLOADED",
      "description": "Image uploaded for motor MTR-20260921-A8F1C0",
      "createdAt": "2026-09-21T10:35:00.000Z",
      "actorEmployee": {
        "id": "emp_123",
        "name": "Imran Shaikh",
        "role": "OWNER"
      }
    },
    {
      "id": "hist_0",
      "action": "MOTOR_REGISTERED",
      "description": "Motor MTR-20260921-A8F1C0 registered for customer Patel Industries",
      "createdAt": "2026-09-21T10:00:00.000Z",
      "actorEmployee": {
        "id": "emp_123",
        "name": "Imran Shaikh",
        "role": "OWNER"
      }
    }
  ]
}
```

---

## 5. Jobs Module (`/api/v1/jobs`)

### 5.1 Create a Job
Creates an additional job order for an existing motor (if needed).

- **Method**: `POST`
- **URL**: `/api/v1/jobs`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Request Payload
```json
{
  "motorId": "motor_123",
  "notes": "Second service warranty check"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": "job_456",
    "jobNumber": "JOB-20260921-C7D8E9",
    "motorId": "motor_123",
    "status": "RECEIVED",
    "notes": "Second service warranty check",
    "createdAt": "2026-09-21T10:40:00.000Z"
  }
}
```

---

### 5.2 List Jobs
Lists workshop jobs with filters and pagination.

- **Method**: `GET`
- **URL**: `/api/v1/jobs`
- **Headers**: `X-Employee-Id: <actor_id>`
- **Query Parameters**:
  - `status` (optional): `RECEIVED`, `IN_PROGRESS`, `TESTING`, `READY_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`
  - `motorId` (optional): ID of specific motor
  - `page` (optional, default: `1`)
  - `limit` (optional, default: `20`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": {
    "jobs": [
      {
        "id": "job_123",
        "jobNumber": "JOB-20260921-B9D2E4",
        "status": "IN_PROGRESS",
        "motor": {
          "id": "motor_123",
          "motorNumber": "MTR-20260921-A8F1C0",
          "customerName": "Patel Industries",
          "customerPhone": "9825000000",
          "brand": "Kirloskar"
        },
        "_count": {
          "tasks": 3
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 5.3 Get Job Details
Retrieves details of a job, including motor specifications, assigned tasks, and workers.

- **Method**: `GET`
- **URL**: `/api/v1/jobs/:id`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "id": "job_123",
    "jobNumber": "JOB-20260921-B9D2E4",
    "status": "IN_PROGRESS",
    "motor": {
      "id": "motor_123",
      "motorNumber": "MTR-20260921-A8F1C0",
      "customerName": "Patel Industries"
    },
    "tasks": [
      {
        "id": "task_123",
        "title": "Varnishing & Baking",
        "status": "IN_PROGRESS",
        "assignedEmployee": {
          "id": "emp_123",
          "name": "Imran Shaikh",
          "phone": "9825272547",
          "role": "OWNER"
        }
      }
    ]
  }
}
```

---

### 5.4 Update Job Status
Updates job status using the server-side state machine. Atomically records a `JOB_STATUS_CHANGED` history entry.

**Allowed State Transitions:**
- `RECEIVED` → `IN_PROGRESS`, `CANCELLED`
- `IN_PROGRESS` → `TESTING`, `READY_FOR_DELIVERY`, `CANCELLED`
- `TESTING` → `IN_PROGRESS`, `READY_FOR_DELIVERY`, `CANCELLED`
- `READY_FOR_DELIVERY` → `DELIVERED`, `IN_PROGRESS`, `CANCELLED`
- `DELIVERED` → (Terminal state)
- `CANCELLED` → `RECEIVED`, `IN_PROGRESS` (Can be reopened)

- **Method**: `PATCH`
- **URL**: `/api/v1/jobs/:id/status`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Request Payload
```json
{
  "status": "IN_PROGRESS",
  "notes": "Motor disassembled; rewinding started"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Job status updated to IN_PROGRESS successfully",
  "data": {
    "id": "job_123",
    "jobNumber": "JOB-20260921-B9D2E4",
    "status": "IN_PROGRESS",
    "notes": "Motor disassembled; rewinding started",
    "updatedAt": "2026-09-21T10:45:00.000Z"
  }
}
```

#### Invalid Transition Error (`400 Bad Request`)
```json
{
  "success": false,
  "message": "Invalid status transition from RECEIVED to DELIVERED. Allowed next states: IN_PROGRESS, CANCELLED",
  "code": "INVALID_STATUS_TRANSITION",
  "data": null
}
```

---

### 5.5 Get Job History Timeline
Retrieves the complete audit trail of status changes and events for a job.

- **Method**: `GET`
- **URL**: `/api/v1/jobs/:id/history`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Job history retrieved successfully",
  "data": [
    {
      "id": "hist_2",
      "action": "JOB_STATUS_CHANGED",
      "description": "Job JOB-20260921-B9D2E4 status changed from RECEIVED to IN_PROGRESS",
      "metadata": {
        "oldStatus": "RECEIVED",
        "newStatus": "IN_PROGRESS",
        "notes": "Motor disassembled; rewinding started"
      },
      "createdAt": "2026-09-21T10:45:00.000Z",
      "actorEmployee": {
        "id": "emp_123",
        "name": "Imran Shaikh",
        "role": "OWNER"
      }
    }
  ]
}
```

---

## 6. Tasks Module (`/api/v1/jobs/:jobId/tasks` and `/api/v1/tasks`)

### 6.1 Create a Task Under a Job
Creates an unassigned or assigned task. Any employee can create an unassigned task (`status: PENDING`). If `assignedEmployeeId` is provided, the actor **must be an admin (role `OWNER`)**.

- **Method**: `POST`
- **URL**: `/api/v1/jobs/:jobId/tasks`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Request Payload (Unassigned Task — Any Employee)
```json
{
  "title": "Bearing Replacement",
  "description": "Replace front and rear 6205 bearings"
}
```

#### Request Payload (Assigned Task — Admin/OWNER only)
```json
{
  "title": "Bearing Replacement",
  "description": "Replace front and rear 6205 bearings",
  "assignedEmployeeId": "emp_worker_123"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": "task_456",
    "jobId": "job_123",
    "title": "Bearing Replacement",
    "description": "Replace front and rear 6205 bearings",
    "assignedEmployeeId": "emp_worker_123",
    "status": "ASSIGNED",
    "startedAt": null,
    "completedAt": null,
    "createdAt": "2026-09-21T10:50:00.000Z"
  }
}
```

#### Forbidden Error if Non-Admin attempts assignment (`403 Forbidden`)
```json
{
  "success": false,
  "message": "Only admin (OWNER) can assign tasks to employees",
  "code": "ADMIN_ONLY",
  "data": null
}
```

---

### 6.2 List Tasks for a Job
Lists all tasks associated with a job with pagination and status filtering.

- **Method**: `GET`
- **URL**: `/api/v1/jobs/:jobId/tasks`
- **Headers**: `X-Employee-Id: <actor_id>`
- **Query Parameters**:
  - `status` (optional): `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
  - `page` (optional, default: `1`): page number
  - `limit` (optional, default: `20`, max: `100`): items per page

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": {
    "tasks": [
      {
        "id": "task_456",
        "title": "Bearing Replacement",
        "status": "ASSIGNED",
        "assignedEmployee": {
          "id": "emp_worker_123",
          "name": "Zubair Shaikh",
          "role": "EMPLOYEE"
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```


---

### 6.3 Get Task Details
Retrieves details for a specific task.

- **Method**: `GET`
- **URL**: `/api/v1/tasks/:id`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Task retrieved successfully",
  "data": {
    "id": "task_456",
    "jobId": "job_123",
    "title": "Bearing Replacement",
    "description": "Replace front and rear 6205 bearings",
    "assignedEmployeeId": "emp_worker_123",
    "status": "ASSIGNED",
    "startedAt": null,
    "completedAt": null,
    "assignedEmployee": {
      "id": "emp_worker_123",
      "name": "Zubair Shaikh",
      "phone": "9825111111",
      "role": "EMPLOYEE"
    },
    "job": {
      "id": "job_123",
      "jobNumber": "JOB-20260921-B9D2E4",
      "motor": {
        "id": "motor_123",
        "motorNumber": "MTR-20260921-A8F1C0",
        "customerName": "Patel Industries"
      }
    }
  }
}
```

---

### 6.4 Update Task / Assign Task
Updates task details. If changing `assignedEmployeeId`, **the actor must be an admin (`OWNER`)**.

- **Method**: `PATCH`
- **URL**: `/api/v1/tasks/:id`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Request Payload
```json
{
  "title": "Bearing & Oil Seal Replacement",
  "assignedEmployeeId": "emp_worker_123"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "id": "task_456",
    "title": "Bearing & Oil Seal Replacement",
    "assignedEmployeeId": "emp_worker_123",
    "status": "ASSIGNED",
    "updatedAt": "2026-09-21T10:55:00.000Z"
  }
}
```

---

### 6.5 Update Task Status (Work Progress)
Employees advance task status during their work.
- `ASSIGNED` → `IN_PROGRESS` (automatically records `startedAt` and logs `TASK_STARTED`)
- `IN_PROGRESS` → `COMPLETED` (automatically records `completedAt` and logs `TASK_COMPLETED`)
- Any status → `CANCELLED`

- **Method**: `PATCH`
- **URL**: `/api/v1/tasks/:id/status`
- **Headers**: `X-Employee-Id: <actor_id>`

#### Request Payload
```json
{
  "status": "IN_PROGRESS"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Task status updated to IN_PROGRESS successfully",
  "data": {
    "id": "task_456",
    "title": "Bearing & Oil Seal Replacement",
    "status": "IN_PROGRESS",
    "startedAt": "2026-09-21T10:56:00.000Z",
    "completedAt": null,
    "updatedAt": "2026-09-21T10:56:00.000Z"
  }
}
```

---

## 7. History Module (`/api/v1/history`)

### 7.1 Motor History Timeline
Retrieves chronological history logs for a specific motor with pagination.

- **Method**: `GET`
- **URL**: `/api/v1/history/motors/:motorId` (or `/api/v1/motors/:motorId/history`)
- **Headers**: `X-Employee-Id: <actor_id>`
- **Query Parameters**:
  - `page` (optional, default: `1`): page number
  - `limit` (optional, default: `20`, max: `100`): items per page

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Motor history retrieved successfully",
  "data": {
    "history": [
      {
        "id": "hist_1",
        "motorId": "motor_123",
        "action": "MOTOR_REGISTERED",
        "description": "Motor MTR-20260921-A8F1C0 registered for customer Patel Industries",
        "metadata": {
          "motorNumber": "MTR-20260921-A8F1C0",
          "customerName": "Patel Industries"
        },
        "createdAt": "2026-09-21T10:00:00.000Z",
        "actorEmployee": {
          "id": "emp_123",
          "name": "Imran Shaikh",
          "role": "OWNER"
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 7.2 Job History Timeline
Retrieves chronological history logs for a specific job with pagination.

- **Method**: `GET`
- **URL**: `/api/v1/history/jobs/:jobId` (or `/api/v1/jobs/:jobId/history`)
- **Headers**: `X-Employee-Id: <actor_id>`
- **Query Parameters**:
  - `page` (optional, default: `1`): page number
  - `limit` (optional, default: `20`, max: `100`): items per page

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Job history retrieved successfully",
  "data": {
    "history": [
      {
        "id": "hist_2",
        "jobId": "job_123",
        "action": "JOB_STATUS_CHANGED",
        "description": "Job JOB-20260921-B9D2E4 status changed from RECEIVED to IN_PROGRESS",
        "metadata": {
          "oldStatus": "RECEIVED",
          "newStatus": "IN_PROGRESS"
        },
        "createdAt": "2026-09-21T10:45:00.000Z",
        "actorEmployee": {
          "id": "emp_123",
          "name": "Imran Shaikh",
          "role": "OWNER"
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```


---

## 8. Common HTTP Error Codes

| Status Code | Error Code | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request body or query parameters failed Zod schema validation. Field-level details are provided in `data`. |
| `400` | `INVALID_STATUS_TRANSITION` | Attempted an illegal status change on a job or task. |
| `400` | `INVALID_FILE_TYPE` | Uploaded file was not an allowed image format (JPEG, PNG, WebP). |
| `401` | `ACTOR_HEADER_MISSING` | The request was missing the `X-Employee-Id` header. |
| `401` | `ACTOR_NOT_FOUND` | The employee ID in `X-Employee-Id` does not exist in the database. |
| `401` | `ACTOR_INACTIVE` | The employee ID in `X-Employee-Id` belongs to an inactive employee (`isActive: false`). |
| `403` | `ADMIN_ONLY` | Action is restricted to the workshop admin (actor `role` must be `OWNER`). |
| `404` | `NOT_FOUND` | The requested route does not exist. |
| `404` | `MOTOR_NOT_FOUND` | Motor with the specified ID does not exist. |
| `404` | `JOB_NOT_FOUND` | Job with the specified ID does not exist. |
| `404` | `TASK_NOT_FOUND` | Task with the specified ID does not exist. |
| `404` | `EMPLOYEE_NOT_FOUND` | Employee with the specified ID does not exist. |
| `409` | `PHONE_ALREADY_EXISTS` | An employee with that phone number is already registered. |
| `409` | `DUPLICATE_RESOURCE` | Database unique constraint violation. |
| `429` | `RATE_LIMIT_EXCEEDED` | Request threshold exceeded. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server exception. |
