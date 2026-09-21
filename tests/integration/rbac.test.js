const request = require('supertest');
const prisma = require('../../src/config/prisma');
const createApp = require('../../src/app');

describe('RBAC Middleware - Only OWNER can assign tasks', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should block EMPLOYEE role from assigning a task during task creation', async () => {
    vi.spyOn(prisma.employee, 'findUnique').mockResolvedValue({
      id: 'emp_worker',
      name: 'Worker',
      role: 'EMPLOYEE',
      isActive: true,
    });
    vi.spyOn(prisma.job, 'findUnique').mockResolvedValue({
      id: 'job_1',
      motorId: 'motor_1',
    });

    const res = await request(app)
      .post('/api/v1/jobs/job_1/tasks')
      .set('X-Employee-Id', 'emp_worker')
      .send({
        title: 'Rewind coil',
        assignedEmployeeId: 'emp_other',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ADMIN_ONLY');
  });

  it('should allow EMPLOYEE role to create an unassigned task', async () => {
    vi.spyOn(prisma.employee, 'findUnique').mockResolvedValue({
      id: 'emp_worker',
      name: 'Worker',
      role: 'EMPLOYEE',
      isActive: true,
    });
    vi.spyOn(prisma.job, 'findUnique').mockResolvedValue({
      id: 'job_1',
      motorId: 'motor_1',
    });
    vi.spyOn(prisma.task, 'create').mockResolvedValue({
      id: 'task_new',
      title: 'Dismantle rotor',
      status: 'PENDING',
      assignedEmployeeId: null,
    });
    vi.spyOn(prisma.history, 'create').mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/jobs/job_1/tasks')
      .set('X-Employee-Id', 'emp_worker')
      .send({
        title: 'Dismantle rotor',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
  });
});
