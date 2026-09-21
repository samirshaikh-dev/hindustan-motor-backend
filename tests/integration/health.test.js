const request = require('supertest');
const createApp = require('../../src/app');

describe('Health and Root Endpoints', () => {
  const app = createApp();

  it('GET / should return 200 without actor header', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('health');
  });

  it('GET /health should return status without actor header', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
    expect(res.body.data).toHaveProperty('database');
  });

  it('GET /api/v1 should return API index without actor header', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('endpoints');
    expect(res.body.data.endpoints).toHaveProperty('employees');
  });

  it('GET /version should return version info without actor header', async () => {
    const res = await request(app).get('/version');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data).toHaveProperty('name');
    expect(res.body.data).toHaveProperty('startTime');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('timestamp');
  });

  it('GET /api/v1/version should return version info without actor header', async () => {
    const res = await request(app).get('/api/v1/version');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data).toHaveProperty('startTime');
  });
});
