const request = require('supertest');
const prisma = require('../../src/config/prisma');
const createApp = require('../../src/app');

describe('Actor Middleware (X-Employee-Id enforcement)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject request when X-Employee-Id header is missing on protected routes', async () => {
    const res = await request(app).get('/api/v1/motors');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ACTOR_HEADER_MISSING');
  });

  it('should allow GET /api/v1/employees without X-Employee-Id header (public staff list for profile selection)', async () => {
    vi.spyOn(prisma.employee, 'findMany').mockResolvedValue([
      { id: 'emp_1', name: 'Ramesh Patel', role: 'EMPLOYEE', isActive: true },
    ]);
    vi.spyOn(prisma.employee, 'count').mockResolvedValue(1);

    const res = await request(app).get('/api/v1/employees?isActive=true&limit=100');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.employees).toHaveLength(1);
    expect(res.body.data.employees[0].name).toBe('Ramesh Patel');
  });

  it('should reject request when actor employee is not found in database', async () => {
    vi.spyOn(prisma.employee, 'findUnique').mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/employees')
      .set('X-Employee-Id', 'nonexistent_id');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ACTOR_NOT_FOUND');
  });

  it('should reject request when actor employee is inactive', async () => {
    vi.spyOn(prisma.employee, 'findUnique').mockResolvedValue({
      id: 'inactive_emp',
      name: 'Inactive User',
      role: 'EMPLOYEE',
      isActive: false,
    });

    const res = await request(app)
      .get('/api/v1/employees')
      .set('X-Employee-Id', 'inactive_emp');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ACTOR_INACTIVE');
  });

  it('should allow request when actor employee is active and valid', async () => {
    vi.spyOn(prisma.employee, 'findUnique').mockResolvedValue({
      id: 'active_admin',
      name: 'Admin User',
      role: 'OWNER',
      isActive: true,
    });
    vi.spyOn(prisma.employee, 'findMany').mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/employees')
      .set('X-Employee-Id', 'active_admin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
