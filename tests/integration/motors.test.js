const request = require('supertest');
const prisma = require('../../src/config/prisma');
const motorRepo = require('../../src/modules/motors/motor.repository');
const createApp = require('../../src/app');

describe('Motors Module Integration Tests', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.employee, 'findUnique').mockResolvedValue({
      id: 'emp_1',
      name: 'Workshop Technician',
      role: 'EMPLOYEE',
      isActive: true,
    });
  });

  it('should successfully register a motor and trigger transaction', async () => {
    const mockCreatedMotor = {
      id: 'motor_1',
      motorNumber: 'MTR-20260921-A1B2C3',
      customerName: 'Anil Steel Works',
      customerPhone: '9825123456',
      job: {
        id: 'job_1',
        jobNumber: 'JOB-20260921-X1Y2Z3',
        status: 'RECEIVED',
      },
    };

    vi.spyOn(motorRepo, 'createMotorWithJob').mockResolvedValue(mockCreatedMotor);

    const res = await request(app)
      .post('/api/v1/motors')
      .set('X-Employee-Id', 'emp_1')
      .send({
        customerName: 'Anil Steel Works',
        customerPhone: '9825123456',
        brand: 'Siemens',
        power: 10,
        powerUnit: 'HP',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.motorNumber).toBe('MTR-20260921-A1B2C3');
    expect(res.body.data.job.status).toBe('RECEIVED');
  });

  it('should reject registration when customerName is missing', async () => {
    const res = await request(app)
      .post('/api/v1/motors')
      .set('X-Employee-Id', 'emp_1')
      .send({
        customerPhone: '9825123456',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
