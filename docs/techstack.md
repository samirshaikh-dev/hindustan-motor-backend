# Motor Workshop Backend — Tech Stack

## 1. Backend

### Node.js

Runtime for the backend API.

### JavaScript (Node.js)

Primary programming language (Modern JavaScript / Node.js).

Benefits:

- Simplicity and rapid development
- Native Node.js execution without build/transpilation step
- Lightweight toolchain and fast startup

### Express.js

REST API framework running on Node.js.

---

## 2. Architecture

### Modular Monolith

The backend will be one deployable application divided into independent business modules.

Initial modules:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── employees/
│   ├── motors/
│   ├── jobs/
│   ├── tasks/
│   ├── history/
│   └── media/
```

Each module can contain:

```text
module/
├── controller/
├── service/
├── repository/
├── routes/
├── schema/
└── ...
```

The exact organization can be adjusted as implementation grows.

---

## 3. Database

### Neon PostgreSQL

Managed PostgreSQL database.

Used for:

- Users
- Employees
- Motors
- Jobs
- Tasks
- History
- Authentication-related data
- Other relational application data

PostgreSQL is appropriate because the application has clear relationships between motors, jobs, tasks, employees, and history.

---

## 4. ORM / Database Access

### Prisma ORM

Recommended for database access.

Responsibilities:

- Database schema
- Migrations
- Query building
- Relations
- Transactions

Example relationship:

```text
Motor
  └── Job
       └── Tasks
            └── Employee
```

---

## 5. Authentication

### JWT

Use access-token based authentication for the mobile application.

Recommended approach:

- Short-lived access token
- Secure refresh-token strategy
- Password hashing with Argon2 or bcrypt
- Role-based authorization

Roles:

```text
OWNER
EMPLOYEE
```

---

## 6. Validation

### Zod

Use Zod for:

- Request body validation
- Query parameter validation
- Route parameter validation
- Environment variable validation
- API input validation

---

## 7. Image Storage

### Cloudinary

Used for motor/job images.

PostgreSQL stores metadata, while Cloudinary stores the actual image files.

Database example:

```text
MotorImage
├── motorId
├── publicId
├── secureUrl
├── width
├── height
└── createdAt
```

---

## 8. API Style

### REST API

Base URL:

```text
/api/v1
```

Example:

```text
GET    /api/v1/motors
POST   /api/v1/motors
GET    /api/v1/motors/:id
PATCH  /api/v1/motors/:id
```

The API will be consumed by the React Native Expo mobile application.

---

## 9. Security

Recommended packages/tools:

- Helmet
- CORS
- Rate limiting
- Argon2 or bcrypt
- Zod
- JWT

Security principles:

- Never store plaintext passwords.
- Never commit secrets.
- Validate every external input.
- Authorize every protected resource.
- Do not trust role/status values from the client.

---

## 10. Logging

Use a structured logger such as **Winston**.

Log:

- Request information
- Errors
- Important application events
- Authentication failures
- Unexpected exceptions

Do not log passwords, tokens, or other secrets.

---

## 11. Development Tools

Recommended:

- Node.js LTS
- npm
- ESLint
- Prettier
- Git
- GitHub
- Postman or Insomnia

---

## 12. Testing

Recommended:

- Vitest or Jest for unit tests
- Supertest for API/integration tests

Priority test areas:

- Authentication
- Authorization
- Motor creation
- Job creation
- Task assignment
- Task status transitions
- History creation
- Database transactions

---

## 13. Environment Variables

Example:

```env
NODE_ENV=development
PORT=5000

DATABASE_URL=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

CORS_ORIGIN=
```

Never commit `.env` files containing secrets.

Provide `.env.example` instead.

---

## 14. Deployment

Backend can be deployed on a Node.js-compatible hosting platform.

Database:

```text
Neon PostgreSQL
```

Media:

```text
Cloudinary
```

Mobile client:

```text
React Native + Expo
```

---

## 15. Final Stack

```text
Mobile
└── React Native
    └── Expo

Backend
└── Node.js
    ├── JavaScript
    ├── Express.js
    ├── Prisma
    ├── Zod
    ├── JWT
    ├── Winston
    └── Helmet/CORS/Rate Limit

Database
└── Neon PostgreSQL

Media
└── Cloudinary

Development
├── Git
├── GitHub
├── ESLint
├── Prettier
└── Postman/Insomnia
```
