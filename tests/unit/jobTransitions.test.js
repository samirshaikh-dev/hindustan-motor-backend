// Mock prisma and history service before requiring job.service
vi.mock('../../src/config/prisma', () => ({
  motor: {
    findUnique: vi.fn(),
  },
  job: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('../../src/modules/history/history.service', () => ({
  recordHistory: vi.fn().mockResolvedValue({}),
}));

const jobService = require('../../src/modules/jobs/job.service');
const jobRepo = require('../../src/modules/jobs/job.repository');

describe('Job Status Transitions State Machine', () => {
  const mockActor = { id: 'emp_owner', role: 'OWNER' };

  it('should allow valid transition from RECEIVED to IN_PROGRESS', async () => {
    vi.spyOn(jobRepo, 'findById').mockResolvedValue({
      id: 'job_1',
      jobNumber: 'JOB-001',
      status: 'RECEIVED',
      motorId: 'motor_1',
    });

    vi.spyOn(jobRepo, 'updateStatusWithHistory').mockResolvedValue({
      id: 'job_1',
      status: 'IN_PROGRESS',
    });

    const result = await jobService.updateJobStatus('job_1', 'IN_PROGRESS', null, mockActor);
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('should reject invalid transition from RECEIVED to DELIVERED', async () => {
    vi.spyOn(jobRepo, 'findById').mockResolvedValue({
      id: 'job_1',
      jobNumber: 'JOB-001',
      status: 'RECEIVED',
      motorId: 'motor_1',
    });

    await expect(
      jobService.updateJobStatus('job_1', 'DELIVERED', null, mockActor)
    ).rejects.toThrow('Invalid status transition');
  });

  it('should reject transition from DELIVERED (terminal state)', async () => {
    vi.spyOn(jobRepo, 'findById').mockResolvedValue({
      id: 'job_1',
      jobNumber: 'JOB-001',
      status: 'DELIVERED',
      motorId: 'motor_1',
    });

    await expect(
      jobService.updateJobStatus('job_1', 'IN_PROGRESS', null, mockActor)
    ).rejects.toThrow('Invalid status transition');
  });

  it('should return unchanged job if newStatus equals current status', async () => {
    vi.spyOn(jobRepo, 'findById').mockResolvedValue({
      id: 'job_1',
      jobNumber: 'JOB-001',
      status: 'IN_PROGRESS',
      motorId: 'motor_1',
    });

    const result = await jobService.updateJobStatus('job_1', 'IN_PROGRESS', null, mockActor);
    expect(result.status).toBe('IN_PROGRESS');
  });
});
