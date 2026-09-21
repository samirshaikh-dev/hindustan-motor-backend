const request = require('supertest');
const createApp = require('../../src/app');
const prisma = require('../../src/config/prisma');

describe('Admin Authentication Module', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully log in admin with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'test-secret-password-123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.tokenType).toBe('Bearer');
      expect(res.body.data.admin.email).toBe('admin@example.com');
      expect(res.body.data.admin.role).toBe('OWNER');
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'wrong-password',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with incorrect email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'notadmin@example.com',
          password: 'test-secret-password-123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email-format',
          password: 'test-secret-password-123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current admin profile when Bearer token is provided', async () => {
      // 1. Login first to get token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'test-secret-password-123',
        });

      const token = loginRes.body.data.token;

      // 2. Request profile with token
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.success).toBe(true);
      expect(meRes.body.data.email).toBe('admin@example.com');
      expect(meRes.body.data.role).toBe('OWNER');
    });

    it('should reject when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('TOKEN_REQUIRED');
    });

    it('should reject when Authorization token is invalid or tampered', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('Admin Bearer Token for Domain Operations', () => {
    it('should allow admin to assign a task using Bearer token without X-Employee-Id', async () => {
      // 1. Login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'test-secret-password-123',
        });

      const token = loginRes.body.data.token;

      // 2. Mock job and employee lookup
      vi.spyOn(prisma.job, 'findUnique').mockResolvedValue({
        id: 'job_1',
        motorId: 'motor_1',
      });
      vi.spyOn(prisma.employee, 'findUnique').mockResolvedValue({
        id: 'emp_worker',
        name: 'Worker',
        isActive: true,
      });
      vi.spyOn(prisma.task, 'create').mockResolvedValue({
        id: 'task_assigned',
        title: 'Rewind coil',
        status: 'ASSIGNED',
        assignedEmployeeId: 'emp_worker',
      });
      vi.spyOn(prisma.history, 'create').mockResolvedValue({});

      // 3. Assign task as Admin with Bearer token
      const res = await request(app)
        .post('/api/v1/jobs/job_1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Rewind coil',
          assignedEmployeeId: 'emp_worker',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ASSIGNED');
    });
  });
});
