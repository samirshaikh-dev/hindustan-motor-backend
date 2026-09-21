const prisma = require('../../src/config/prisma');
const historyService = require('../../src/modules/history/history.service');
const taskService = require('../../src/modules/tasks/task.service');
const taskRepo = require('../../src/modules/tasks/task.repository');

describe('Task Transitions and Permissions', () => {
  const workerActor = { id: 'emp_worker', role: 'EMPLOYEE' };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(historyService, 'recordHistory').mockResolvedValue({});
  });

  it('should block non-admin employee from assigning task during creation', async () => {
    vi.spyOn(prisma.job, 'findUnique').mockResolvedValue({ id: 'job_1', motorId: 'motor_1' });

    await expect(
      taskService.createTask(
        'job_1',
        { title: 'Testing', assignedEmployeeId: 'emp_other' },
        workerActor
      )
    ).rejects.toThrow('Only admin (OWNER) can assign tasks to employees');
  });

  it('should allow valid status transition from ASSIGNED to IN_PROGRESS and set startedAt', async () => {
    vi.spyOn(taskRepo, 'findById').mockResolvedValue({
      id: 'task_1',
      title: 'Testing',
      status: 'ASSIGNED',
      jobId: 'job_1',
      job: { motorId: 'motor_1' },
      startedAt: null,
    });

    vi.spyOn(taskRepo, 'update').mockImplementation((id, data) => Promise.resolve({ id, ...data }));

    const updated = await taskService.updateTaskStatus('task_1', 'IN_PROGRESS', workerActor);
    expect(updated.status).toBe('IN_PROGRESS');
    expect(updated.startedAt).toBeInstanceOf(Date);
  });

  it('should allow transition from IN_PROGRESS to COMPLETED and set completedAt', async () => {
    vi.spyOn(taskRepo, 'findById').mockResolvedValue({
      id: 'task_1',
      title: 'Testing',
      status: 'IN_PROGRESS',
      jobId: 'job_1',
      job: { motorId: 'motor_1' },
      startedAt: new Date(),
      completedAt: null,
    });

    vi.spyOn(taskRepo, 'update').mockImplementation((id, data) => Promise.resolve({ id, ...data }));

    const updated = await taskService.updateTaskStatus('task_1', 'COMPLETED', workerActor);
    expect(updated.status).toBe('COMPLETED');
    expect(updated.completedAt).toBeInstanceOf(Date);
  });

  it('should reject invalid transition from PENDING directly to COMPLETED', async () => {
    vi.spyOn(taskRepo, 'findById').mockResolvedValue({
      id: 'task_1',
      title: 'Testing',
      status: 'PENDING',
      jobId: 'job_1',
      job: { motorId: 'motor_1' },
    });

    await expect(
      taskService.updateTaskStatus('task_1', 'COMPLETED', workerActor)
    ).rejects.toThrow('Invalid status transition');
  });
});
