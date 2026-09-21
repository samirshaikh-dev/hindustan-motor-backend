const request = require('supertest');
const prisma = require('../../src/config/prisma');
const createApp = require('../../src/app');

describe('Employees Status Dashboard', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(prisma.employee, 'findUnique').mockResolvedValue({
      id: 'emp_admin',
      name: 'Admin Boss',
      role: 'OWNER',
      isActive: true,
    });
  });

  describe('GET /api/v1/employees/status', () => {
    it('returns active employees dashboard with active tasks count and details', async () => {
      vi.spyOn(prisma.employee, 'findMany').mockResolvedValue([
        {
          id: 'emp_1',
          name: 'Technician 1',
          phone: '9825272547',
          role: 'EMPLOYEE',
          isActive: true,
          assignedTasks: [
            {
              id: 'task_1',
              title: 'Winding Stator',
              status: 'IN_PROGRESS',
              startedAt: new Date().toISOString(),
              job: {
                id: 'job_1',
                jobNumber: 'JOB-20260921-A1B2C3',
                status: 'IN_PROGRESS',
                motor: {
                  id: 'motor_1',
                  motorNumber: 'MTR-20260921-X1Y2Z3',
                  customerName: 'Customer A',
                },
              },
            },
          ],
        },
      ]);

      const res = await request(app)
        .get('/api/v1/employees/status')
        .set('X-Employee-Id', 'emp_admin');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        id: 'emp_1',
        name: 'Technician 1',
        activeTaskCount: 1,
        activeTasks: expect.any(Array),
      });
      expect(res.body.data[0].activeTasks[0].job.jobNumber).toBe('JOB-20260921-A1B2C3');
    });
  });
});
