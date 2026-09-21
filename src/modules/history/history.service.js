const defaultPrisma = require('../../config/prisma');

class HistoryService {
  async recordHistory(
    { motorId = null, jobId = null, taskId = null, actorEmployeeId, action, description = null, metadata = null },
    tx = null
  ) {
    const db = tx || defaultPrisma;
    return db.history.create({
      data: {
        motorId,
        jobId,
        taskId,
        actorEmployeeId,
        action,
        description,
        metadata: metadata ? metadata : undefined,
      },
    });
  }

  async getMotorHistory(motorId) {
    return defaultPrisma.history.findMany({
      where: { motorId },
      include: {
        actorEmployee: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getJobHistory(jobId) {
    return defaultPrisma.history.findMany({
      where: { jobId },
      include: {
        actorEmployee: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

module.exports = new HistoryService();
