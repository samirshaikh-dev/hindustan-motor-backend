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
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('database');
  });
});
