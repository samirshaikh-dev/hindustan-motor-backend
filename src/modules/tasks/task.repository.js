const defaultPrisma = require('../../config/prisma');

class TaskRepository {
  async create(data) {
    return defaultPrisma.task.create({
      data,
      include: {
        assignedEmployee: {
          select: { id: true, name: true, phone: true, role: true },
        },
        job: {
          include: {
            motor: true,
          },
        },
      },
    });
  }

  async findById(id) {
    return defaultPrisma.task.findUnique({
      where: { id },
      include: {
        assignedEmployee: {
          select: { id: true, name: true, phone: true, role: true },
        },
        job: {
          include: {
            motor: true,
          },
        },
        histories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByJobId(jobId) {
    return defaultPrisma.task.findMany({
      where: { jobId },
      include: {
        assignedEmployee: {
          select: { id: true, name: true, phone: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id, data) {
    return defaultPrisma.task.update({
      where: { id },
      data,
      include: {
        assignedEmployee: {
          select: { id: true, name: true, phone: true, role: true },
        },
        job: {
          include: {
            motor: true,
          },
        },
      },
    });
  }
}

module.exports = new TaskRepository();
