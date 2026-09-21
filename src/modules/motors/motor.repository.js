const defaultPrisma = require('../../config/prisma');

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
        images: true,
        jobs: {
          include: {
            tasks: {
              include: {
                assignedEmployee: {
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
    const skip = (page - 1) * limit;
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
        },
      };
    }

    const [motors, total] = await Promise.all([
      defaultPrisma.motor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: {
            take: 1,
            select: { id: true, secureUrl: true },
          },
          jobs: {
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
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id, data) {
    return defaultPrisma.motor.update({
      where: { id },
      data,
    });
  }
}

module.exports = new MotorRepository();
