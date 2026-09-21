const request = require('supertest');
const prisma = require('../../src/config/prisma');
const createApp = require('../../src/app');

describe('Standard Error Responses and 404', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.employee, 'findUnique').mockResolvedValue({
      id: 'active_emp',
      name: 'Active Employee',
      role: 'EMPLOYEE',
      isActive: true,
    });
  });

  it('should return standardized 404 envelope for non-existent route', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route').set('X-Employee-Id', 'active_emp');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Cannot GET /api/v1/nonexistent-route',
      code: 'NOT_FOUND',
      data: null,
    });
  });

  it('should return standardized 400 envelope for validation failure', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('X-Employee-Id', 'active_emp')
      .send({ name: 'A' }); // missing phone, name too short

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
