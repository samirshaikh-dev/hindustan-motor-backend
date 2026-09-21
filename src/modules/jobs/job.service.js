const jobRepo = require('./job.repository');
const prisma = require('../../config/prisma');
const historyService = require('../history/history.service');
const { generateUniqueNumber } = require('../../utils/numberGenerator');
const { NotFoundError, BadRequestError } = require('../../core/errors');

const VALID_TRANSITIONS = {
  RECEIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['TESTING', 'READY_FOR_DELIVERY', 'CANCELLED'],
  TESTING: ['IN_PROGRESS', 'READY_FOR_DELIVERY', 'CANCELLED'],
  READY_FOR_DELIVERY: ['DELIVERED', 'IN_PROGRESS', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: ['RECEIVED', 'IN_PROGRESS'],
};

class JobService {
  async createJob(data, actorEmployee) {
    const motor = await prisma.motor.findUnique({
      where: { id: data.motorId },
    });

    if (!motor) {
      throw new NotFoundError('Motor not found', 'MOTOR_NOT_FOUND');
    }

    const jobNumber = generateUniqueNumber('JOB');

    const job = await jobRepo.create({
      jobNumber,
      motorId: data.motorId,
      status: 'RECEIVED',
      notes: data.notes,
    });

    await historyService.recordHistory({
      motorId: motor.id,
      jobId: job.id,
      actorEmployeeId: actorEmployee.id,
      action: 'JOB_CREATED',
      description: `New Job ${job.jobNumber} created`,
      metadata: { jobNumber: job.jobNumber },
    });

    return job;
  }

  async getJobById(id) {
    const job = await jobRepo.findById(id);
    if (!job) {
      throw new NotFoundError('Job not found', 'JOB_NOT_FOUND');
    }
    return job;
  }

  async getAllJobs(query) {
    return jobRepo.findAll(query);
  }

  async updateJob(id, data, actorEmployee) {
    const job = await this.getJobById(id);

    const updated = await jobRepo.update(id, data);

    await historyService.recordHistory({
      motorId: job.motorId,
      jobId: job.id,
      actorEmployeeId: actorEmployee.id,
      action: 'JOB_UPDATED',
      description: `Job ${job.jobNumber} details updated`,
      metadata: data,
    });

    return updated;
  }

  async updateJobStatus(id, newStatus, notes, actorEmployee) {
    const job = await this.getJobById(id);

    if (job.status === newStatus) {
      return job;
    }

    const allowed = VALID_TRANSITIONS[job.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from ${job.status} to ${newStatus}. Allowed next states: ${allowed.join(', ') || 'None (Terminal state)'}`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    return jobRepo.updateStatusWithHistory(id, newStatus, actorEmployee.id, notes);
  }

  async deleteJob(id, actorEmployee) {
    return jobRepo.deleteJobWithCascade({
      jobId: id,
      actorEmployeeId: actorEmployee.id,
    });
  }
}

module.exports = new JobService();
