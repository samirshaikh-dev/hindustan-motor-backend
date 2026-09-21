const request = require('supertest');
const createApp = require('../../src/app');
const prisma = require('../../src/config/prisma');

describe('Admin Authentication Module', () => {
  const app = createApp();
  let inMemorySessions = [];

  beforeEach(() => {
    vi.restoreAllMocks();
    inMemorySessions = [];

    if (!prisma.adminSession) {
      prisma.adminSession = {};
    }

    vi.spyOn(prisma.adminSession, 'create').mockImplementation(async ({ data }) => {
      const session = {
        id: 'session_' + Math.random().toString(36).substring(2, 9),
        adminEmail: data.adminEmail,
        tokenHash: data.tokenHash,
        family: data.family,
        isRevoked: false,
        expiresAt: data.expiresAt,
        revokedAt: null,
        replacedByTokenId: null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemorySessions.push(session);
      return session;
    });

    vi.spyOn(prisma.adminSession, 'findUnique').mockImplementation(async ({ where }) => {
      return inMemorySessions.find((s) => s.tokenHash === where.tokenHash) || null;
    });

    vi.spyOn(prisma.adminSession, 'update').mockImplementation(async ({ where, data }) => {
      const session = inMemorySessions.find((s) => s.id === where.id);
      if (!session) throw new Error('Session not found');
      Object.assign(session, data);
      return session;
    });

    vi.spyOn(prisma.adminSession, 'updateMany').mockImplementation(async ({ where, data }) => {
      let count = 0;
      for (const session of inMemorySessions) {
        let match = true;
        if (where.family && session.family !== where.family) match = false;
        if (where.adminEmail && session.adminEmail !== where.adminEmail) match = false;
        if (where.isRevoked !== undefined && session.isRevoked !== where.isRevoked) match = false;
        if (match) {
          Object.assign(session, data);
          count++;
        }
      }
      return { count };
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully log in admin with valid credentials and set HttpOnly refresh cookie', async () => {
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

      // Refresh token MUST NOT be in response JSON
      expect(res.body.data).not.toHaveProperty('refreshToken');

      // Refresh token MUST be in HttpOnly cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/HttpOnly/i);

      // Session must be recorded in hashed form
      expect(inMemorySessions).toHaveLength(1);
      expect(inMemorySessions[0].adminEmail).toBe('admin@example.com');
      expect(inMemorySessions[0].isRevoked).toBe(false);
      expect(inMemorySessions[0].tokenHash).toHaveLength(64); // SHA-256 hex length
    });

    it('should also work with alias route /api/auth/login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'test-secret-password-123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
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
      expect(inMemorySessions).toHaveLength(0);
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

  describe('POST /api/v1/auth/refresh', () => {
    function extractRefreshToken(res) {
      const cookies = res.headers['set-cookie'];
      if (!cookies) return null;
      const cookie = cookies.find((c) => c.startsWith('refreshToken='));
      if (!cookie) return null;
      return cookie.split(';')[0].split('=')[1];
    }

    it('should reject refresh when refresh cookie is missing', async () => {
      const res = await request(app).post('/api/v1/auth/refresh');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('REFRESH_TOKEN_REQUIRED');
    });

    it('should successfully rotate refresh token and issue new access token', async () => {
      // 1. Log in
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'test-secret-password-123',
        });

      const initialRefreshToken = extractRefreshToken(loginRes);
      expect(initialRefreshToken).toBeTruthy();
      expect(inMemorySessions).toHaveLength(1);

      // 2. Call refresh
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${initialRefreshToken}`);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.success).toBe(true);
      expect(refreshRes.body.data).toHaveProperty('token');
      expect(refreshRes.body.data.tokenType).toBe('Bearer');
      expect(refreshRes.body.data).not.toHaveProperty('refreshToken');

      // Check rotated cookie
      const rotatedRefreshToken = extractRefreshToken(refreshRes);
      expect(rotatedRefreshToken).toBeTruthy();
      expect(rotatedRefreshToken).not.toBe(initialRefreshToken);

      // Old session must be revoked
      expect(inMemorySessions).toHaveLength(2);
      expect(inMemorySessions[0].isRevoked).toBe(true);
      expect(inMemorySessions[1].isRevoked).toBe(false);
      expect(inMemorySessions[1].family).toBe(inMemorySessions[0].family);
    });

    it('should detect reuse of a revoked refresh token and revoke entire family', async () => {
      // 1. Log in
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'test-secret-password-123',
        });

      const token1 = extractRefreshToken(loginRes);

      // 2. Legitimate refresh (rotates token1 -> token2)
      const refreshRes1 = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${token1}`);

      expect(refreshRes1.status).toBe(200);
      const token2 = extractRefreshToken(refreshRes1);
      expect(token2).toBeDefined();

      // Verify token1 session is revoked, token2 session is active
      expect(inMemorySessions[0].isRevoked).toBe(true);
      expect(inMemorySessions[1].isRevoked).toBe(false);

      // 3. Stolen/Attacker reuse attempt: Presenting token1 again!
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${token1}`);

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.success).toBe(false);
      expect(reuseRes.body.code).toBe('TOKEN_REUSE_DETECTED');

      // Cookie should be cleared
      const setCookies = reuseRes.headers['set-cookie'];
      expect(setCookies).toBeDefined();
      const clearCookie = setCookies.find((c) => c.startsWith('refreshToken=;'));
      expect(clearCookie).toBeDefined();

      // ALL sessions in family must now be revoked (both token1 and token2)
      expect(inMemorySessions[0].isRevoked).toBe(true);
      expect(inMemorySessions[1].isRevoked).toBe(true);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    function extractRefreshToken(res) {
      const cookies = res.headers['set-cookie'];
      if (!cookies) return null;
      const cookie = cookies.find((c) => c.startsWith('refreshToken='));
      if (!cookie) return null;
      return cookie.split(';')[0].split('=')[1];
    }

    it('should revoke the active session and clear the cookie', async () => {
      // 1. Log in
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'test-secret-password-123',
        });

      const token = extractRefreshToken(loginRes);

      // 2. Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `refreshToken=${token}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Cookie cleared
      const cookies = logoutRes.headers['set-cookie'];
      const clearCookie = cookies.find((c) => c.startsWith('refreshToken=;'));
      expect(clearCookie).toBeDefined();

      // Session revoked
      expect(inMemorySessions[0].isRevoked).toBe(true);

      // Attempting to refresh with the logged out token should fail
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', `refreshToken=${token}`);

      expect(refreshRes.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current admin profile when Bearer token is provided', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'test-secret-password-123',
        });

      const token = loginRes.body.data.token;

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
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'test-secret-password-123',
        });

      const token = loginRes.body.data.token;

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

