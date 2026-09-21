const defaultPrisma = require('../../config/prisma');
const { NotFoundError } = require('../../core/errors');
const { softDelete } = require('../../core/softDelete');
const { getPaginationParams, createPagination } = require('../../utils/pagination');

class MotorRepository {
  async createMotorWithJob({ motorData, jobNumber, actorEmployeeId }, tx = null) {
    const db = tx || defaultPrisma;

    return db.$transaction(async (prismaClient) => {
      // 1. Create motor
      const motor = await prismaClient.motor.create({
        data: motorData,
      });

      // 2. Create default initial job
      const job = await prismaClient.job.create({
        data: {
          jobNumber,
          motorId: motor.id,
          status: 'RECEIVED',
          notes: motorData.complaint ? `Initial complaint: ${motorData.complaint}` : undefined,
        },
      });

      // 3. Record history for motor registration
      await prismaClient.history.create({
        data: {
          motorId: motor.id,
          jobId: job.id,
          actorEmployeeId,
          action: 'MOTOR_REGISTERED',
          description: `Motor ${motor.motorNumber} registered for customer ${motor.customerName}`,
          metadata: {
            motorNumber: motor.motorNumber,
            jobNumber: job.jobNumber,
            customerName: motor.customerName,
          },
        },
      });

      // 4. Record history for job creation
      await prismaClient.history.create({
        data: {
          motorId: motor.id,
          jobId: job.id,
          actorEmployeeId,
          action: 'JOB_CREATED',
          description: `Job ${job.jobNumber} created with status RECEIVED`,
          metadata: {
            jobNumber: job.jobNumber,
            status: 'RECEIVED',
          },
        },
      });

      return {
        ...motor,
        job,
      };
    });
  }

  async findById(id) {
    return defaultPrisma.motor.findUnique({
      where: { id },
      include: {
        images: {
          where: { deletedAt: null },
        },
        jobs: {
          where: { deletedAt: null },
          include: {
            tasks: {
              where: { deletedAt: null },
              include: {
                assignedEmployee: {
                  where: { deletedAt: null },
                  select: { id: true, name: true, phone: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findAll({ search, status, page = 1, limit = 20 }) {
    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);
    const where = {};

    if (search) {
      where.OR = [
        { motorNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

if (status) {
      where.jobs = {
        some: {
          status,
          deletedAt: null,
        },
      };
    }

    const [motors, total] = await Promise.all([
      defaultPrisma.motor.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          images: {
            where: { deletedAt: null },
            take: 1,
            select: { id: true, secureUrl: true },
          },
          jobs: {
            where: { deletedAt: null },
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, jobNumber: true, status: true },
          },
        },
      }),
      defaultPrisma.motor.count({ where }),
    ]);

    return {
      motors,
      pagination: createPagination(total, currentPage, currentLimit),
    };
  }

  async update(id, data) {
    return defaultPrisma.motor.update({
      where: { id },
      data,
    });
  }

  async deleteMotorWithCascade({ motorId, actorEmployeeId }) {
    const now = new Date();

    return defaultPrisma.$transaction(async (tx) => {
      const motor = await tx.motor.findUnique({
        where: { id: motorId },
      });

      if (!motor) {
        throw new NotFoundError('Motor not found', 'MOTOR_NOT_FOUND');
      }

      const jobs = await tx.job.findMany({
        where: { motorId },
        select: { id: true, jobNumber: true },
      });
      const jobIds = jobs.map((job) => job.id);

      if (jobIds.length > 0) {
        await tx.task.updateMany({
          where: { jobId: { in: jobIds } },
          data: { deletedAt: now },
        });
        await tx.job.updateMany({
          where: { motorId },
          data: { deletedAt: now },
        });
      }

      await softDelete('motor', motor.id, tx);

      await tx.history.create({
        data: {
          motorId: motor.id,
          actorEmployeeId,
          action: 'MOTOR_DELETED',
          description: `Motor ${motor.motorNumber} deleted for customer ${motor.customerName}`,
          metadata: {
            motorNumber: motor.motorNumber,
            jobNumbers: jobs.map((job) => job.jobNumber),
          },
        },
      });

      return motor;
    });
  }
}

module.exports = new MotorRepository();
