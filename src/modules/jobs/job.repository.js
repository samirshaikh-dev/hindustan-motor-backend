const defaultPrisma = require('../../config/prisma');
const { NotFoundError } = require('../../core/errors');
const { softDelete } = require('../../core/softDelete');
const { getPaginationParams, createPagination } = require('../../utils/pagination');

class JobRepository {
  async create(data) {
    return defaultPrisma.job.create({
      data,
      include: {
        motor: true,
      },
    });
  }

  async findById(id) {
    return defaultPrisma.job.findUnique({
      where: { id },
      include: {
        motor: {
          include: {
            images: {
              where: { deletedAt: null },
            },
          },
        },
        tasks: {
          where: { deletedAt: null },
          include: {
            assignedEmployee: {
              select: { id: true, name: true, phone: true, role: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findAll({ status, motorId, page = 1, limit = 20 }) {
    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);
    const where = {};

    if (status) {
      where.status = status;
    }

    if (motorId) {
      where.motorId = motorId;
    }

    const [jobs, total] = await Promise.all([
      defaultPrisma.job.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          motor: {
            select: {
              id: true,
              motorNumber: true,
              customerName: true,
              customerPhone: true,
              brand: true,
            },
          },
          _count: {
            select: {
              tasks: {
                where: { deletedAt: null },
              },
            },
          },
        },
      }),
      defaultPrisma.job.count({ where }),
    ]);

    return {
      jobs,
      pagination: createPagination(total, currentPage, currentLimit),
    };
  }

  async update(id, data) {
    return defaultPrisma.job.update({
      where: { id },
      data,
      include: {
        motor: true,
      },
    });
  }

  async updateStatusWithHistory(jobId, newStatus, actorEmployeeId, notes = null) {
    return defaultPrisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
      });

      const oldStatus = job.status;

      const updatedJob = await tx.job.update({
        where: { id: jobId },
        data: {
          status: newStatus,
          notes: notes !== null ? notes : job.notes,
        },
        include: {
          motor: true,
        },
      });

      await tx.history.create({
        data: {
          motorId: job.motorId,
          jobId: job.id,
          actorEmployeeId,
          action: 'JOB_STATUS_CHANGED',
          description: `Job ${job.jobNumber} status changed from ${oldStatus} to ${newStatus}`,
          metadata: {
            oldStatus,
            newStatus,
            notes,
          },
        },
      });

      return updatedJob;
    });
  }

  async deleteJobWithCascade({ jobId, actorEmployeeId }) {
    const now = new Date();

    return defaultPrisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new NotFoundError('Job not found', 'JOB_NOT_FOUND');
      }

      await tx.task.updateMany({
        where: { jobId },
        data: { deletedAt: now },
      });

      await softDelete('job', job.id, tx);

      await tx.history.create({
        data: {
          motorId: job.motorId,
          jobId: job.id,
          actorEmployeeId,
          action: 'JOB_DELETED',
          description: `Job ${job.jobNumber} deleted for motor ${job.motorId}`,
          metadata: {
            jobNumber: job.jobNumber,
            motorId: job.motorId,
          },
        },
      });

      return job;
    });
  }
}

module.exports = new JobRepository();
