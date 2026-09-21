const defaultPrisma = require('../../config/prisma');

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
            images: true,
          },
        },
        tasks: {
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
    const skip = (page - 1) * limit;
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
        take: limit,
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
            select: { tasks: true },
          },
        },
      }),
      defaultPrisma.job.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
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
}

module.exports = new JobRepository();
