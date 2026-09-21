const request = require('supertest');
const prisma = require('../../src/config/prisma');
const createApp = require('../../src/app');
const motorRepo = require('../../src/modules/motors/motor.repository');
const jobRepo = require('../../src/modules/jobs/job.repository');
const taskRepo = require('../../src/modules/tasks/task.repository');
const employeeRepo = require('../../src/modules/employees/employee.repository');
const { NotFoundError } = require('../../src/core/errors');

describe('Soft Delete Endpoints', () => {
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

  describe('DELETE /api/v1/motors/:id', () => {
    it('soft deletes an existing motor', async () => {
      const mockDeleted = {
        id: 'motor_1',
        motorNumber: 'MTR-20260921-A1B2C3',
        deletedAt: new Date().toISOString(),
      };
      vi.spyOn(motorRepo, 'deleteMotorWithCascade').mockResolvedValue(mockDeleted);

      const res = await request(app).delete('/api/v1/motors/motor_1').set('X-Employee-Id', 'emp_1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedAt).toBeDefined();
      expect(motorRepo.deleteMotorWithCascade).toHaveBeenCalledWith({
        motorId: 'motor_1',
        actorEmployeeId: 'emp_1',
      });
    });

    it('returns 404 when the motor is already soft deleted', async () => {
      vi.spyOn(motorRepo, 'deleteMotorWithCascade').mockRejectedValue(
        new NotFoundError('Motor not found', 'MOTOR_NOT_FOUND')
      );

      const res = await request(app).delete('/api/v1/motors/motor_1').set('X-Employee-Id', 'emp_1');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('MOTOR_NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/jobs/:id', () => {
    it('soft deletes an existing job', async () => {
      const mockDeleted = {
        id: 'job_1',
        jobNumber: 'JOB-20260921-X1Y2Z3',
        deletedAt: new Date().toISOString(),
      };
      vi.spyOn(jobRepo, 'deleteJobWithCascade').mockResolvedValue(mockDeleted);

      const res = await request(app).delete('/api/v1/jobs/job_1').set('X-Employee-Id', 'emp_1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(jobRepo.deleteJobWithCascade).toHaveBeenCalledWith({
        jobId: 'job_1',
        actorEmployeeId: 'emp_1',
      });
    });

    it('returns 404 when the job does not exist', async () => {
      vi.spyOn(jobRepo, 'deleteJobWithCascade').mockRejectedValue(
        new NotFoundError('Job not found', 'JOB_NOT_FOUND')
      );

      const res = await request(app).delete('/api/v1/jobs/job_1').set('X-Employee-Id', 'emp_1');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('JOB_NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('soft deletes an existing task', async () => {
      const mockDeleted = { id: 'task_1', title: 'Rewind coil', deletedAt: new Date().toISOString() };
      vi.spyOn(taskRepo, 'deleteTask').mockResolvedValue(mockDeleted);

      const res = await request(app).delete('/api/v1/tasks/task_1').set('X-Employee-Id', 'emp_1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(taskRepo.deleteTask).toHaveBeenCalledWith({
        taskId: 'task_1',
        actorEmployeeId: 'emp_1',
      });
    });

    it('returns 404 when the task does not exist', async () => {
      vi.spyOn(taskRepo, 'deleteTask').mockRejectedValue(
        new NotFoundError('Task not found', 'TASK_NOT_FOUND')
      );

      const res = await request(app).delete('/api/v1/tasks/task_1').set('X-Employee-Id', 'emp_1');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('TASK_NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/employees/:id', () => {
    it('soft deletes an existing employee', async () => {
      const mockDeleted = {
        id: 'emp_2',
        name: 'Electrician',
        deletedAt: new Date().toISOString(),
        isActive: false,
      };
      vi.spyOn(employeeRepo, 'deleteEmployee').mockResolvedValue(mockDeleted);

      const res = await request(app).delete('/api/v1/employees/emp_2').set('X-Employee-Id', 'emp_1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deletedAt).toBeDefined();
      expect(res.body.data.isActive).toBe(false);
      expect(employeeRepo.deleteEmployee).toHaveBeenCalledWith({
        employeeId: 'emp_2',
        actorEmployeeId: 'emp_1',
      });
    });

    it('returns 404 when the employee does not exist', async () => {
      vi.spyOn(employeeRepo, 'deleteEmployee').mockRejectedValue(
        new NotFoundError('Employee not found', 'EMPLOYEE_NOT_FOUND')
      );

      const res = await request(app).delete('/api/v1/employees/emp_2').set('X-Employee-Id', 'emp_1');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('EMPLOYEE_NOT_FOUND');
    });
  });
});