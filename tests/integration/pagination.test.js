const request = require('supertest');
const createApp = require('../../src/app');
const prisma = require('../../src/config/prisma');

describe('Pagination Across All List Endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();

    // Default active actor
    vi.spyOn(prisma.employee, 'findUnique').mockResolvedValue({
      id: 'emp_active',
      name: 'Workshop Owner',
      role: 'OWNER',
      isActive: true,
    });
  });

  describe('GET /api/v1/motors pagination', () => {
    it('should return motors with standard pagination metadata', async () => {
      const mockMotors = [
        { id: 'mtr_1', motorNumber: 'MTR-1', customerName: 'Customer A' },
        { id: 'mtr_2', motorNumber: 'MTR-2', customerName: 'Customer B' },
      ];

      vi.spyOn(prisma.motor, 'findMany').mockResolvedValue(mockMotors);
      vi.spyOn(prisma.motor, 'count').mockResolvedValue(15);

      const res = await request(app)
        .get('/api/v1/motors?page=2&limit=5')
        .set('X-Employee-Id', 'emp_active');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.motors).toHaveLength(2);
      expect(res.body.data.pagination).toEqual({
        total: 15,
        page: 2,
        limit: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('should reject invalid page or limit values', async () => {
      const res = await request(app)
        .get('/api/v1/motors?page=0&limit=500')
        .set('X-Employee-Id', 'emp_active');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/jobs pagination', () => {
    it('should return jobs with standard pagination metadata', async () => {
      const mockJobs = [{ id: 'job_1', jobNumber: 'JOB-1', status: 'RECEIVED' }];

      vi.spyOn(prisma.job, 'findMany').mockResolvedValue(mockJobs);
      vi.spyOn(prisma.job, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/jobs?page=1&limit=10')
        .set('X-Employee-Id', 'emp_active');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobs).toHaveLength(1);
      expect(res.body.data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });
  });

  describe('GET /api/v1/jobs/:jobId/tasks pagination', () => {
    it('should return job tasks with pagination metadata', async () => {
      vi.spyOn(prisma.job, 'findUnique').mockResolvedValue({ id: 'job_1' });
      vi.spyOn(prisma.task, 'findMany').mockResolvedValue([
        { id: 'task_1', title: 'Rewind coil', status: 'IN_PROGRESS' },
      ]);
      vi.spyOn(prisma.task, 'count').mockResolvedValue(12);

      const res = await request(app)
        .get('/api/v1/jobs/job_1/tasks?page=1&limit=5')
        .set('X-Employee-Id', 'emp_active');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tasks).toHaveLength(1);
      expect(res.body.data.pagination).toEqual({
        total: 12,
        page: 1,
        limit: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });
  });

  describe('GET /api/v1/employees pagination', () => {
    it('should return employees with pagination metadata', async () => {
      vi.spyOn(prisma.employee, 'findMany').mockResolvedValue([
        { id: 'emp_1', name: 'Imran', role: 'OWNER' },
        { id: 'emp_2', name: 'Worker', role: 'EMPLOYEE' },
      ]);
      vi.spyOn(prisma.employee, 'count').mockResolvedValue(2);

      const res = await request(app)
        .get('/api/v1/employees?page=1&limit=10')
        .set('X-Employee-Id', 'emp_active');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.employees).toHaveLength(2);
      expect(res.body.data.pagination).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });
  });

  describe('GET /api/v1/employees/:id/tasks pagination', () => {
    it('should return employee tasks with pagination metadata', async () => {
      vi.spyOn(prisma.employee, 'findUnique')
        .mockResolvedValueOnce({ id: 'emp_active', isActive: true, role: 'OWNER' })
        .mockResolvedValueOnce({ id: 'emp_worker', isActive: true });

      vi.spyOn(prisma.task, 'findMany').mockResolvedValue([
        { id: 'task_1', title: 'Inspection', status: 'ASSIGNED' },
      ]);
      vi.spyOn(prisma.task, 'count').mockResolvedValue(8);

      const res = await request(app)
        .get('/api/v1/employees/emp_worker/tasks?page=1&limit=5')
        .set('X-Employee-Id', 'emp_active');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tasks).toHaveLength(1);
      expect(res.body.data.pagination).toEqual({
        total: 8,
        page: 1,
        limit: 5,
        totalPages: 2,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });
  });

  describe('GET /api/v1/history pagination', () => {
    it('should return motor history with pagination metadata', async () => {
      vi.spyOn(prisma.history, 'findMany').mockResolvedValue([
        { id: 'hist_1', action: 'MOTOR_REGISTERED' },
      ]);
      vi.spyOn(prisma.history, 'count').mockResolvedValue(5);

      const res = await request(app)
        .get('/api/v1/history/motors/motor_1?page=1&limit=2')
        .set('X-Employee-Id', 'emp_active');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.history).toHaveLength(1);
      expect(res.body.data.pagination).toEqual({
        total: 5,
        page: 1,
        limit: 2,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it('should return job history with pagination metadata', async () => {
      vi.spyOn(prisma.history, 'findMany').mockResolvedValue([
        { id: 'hist_1', action: 'JOB_CREATED' },
      ]);
      vi.spyOn(prisma.history, 'count').mockResolvedValue(4);

      const res = await request(app)
        .get('/api/v1/history/jobs/job_1?page=2&limit=2')
        .set('X-Employee-Id', 'emp_active');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.history).toHaveLength(1);
      expect(res.body.data.pagination).toEqual({
        total: 4,
        page: 2,
        limit: 2,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });
  });
});
