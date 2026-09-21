const defaultPrisma = require('../../config/prisma');
const { getPaginationParams, createPagination } = require('../../utils/pagination');

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

  async getMotorHistory(motorId, { page = 1, limit = 20 } = {}) {
    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);
    const where = { motorId };

    const history = await defaultPrisma.history.findMany({
      where,
      skip,
      take,
      include: {
        actorEmployee: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let total = 0;
    try {
      total = await defaultPrisma.history.count({ where });
    } catch {
      total = history.length;
    }

    return {
      history,
      pagination: createPagination(total, currentPage, currentLimit),
    };
  }

  async getJobHistory(jobId, { page = 1, limit = 20 } = {}) {
    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);
    const where = { jobId };

    const history = await defaultPrisma.history.findMany({
      where,
      skip,
      take,
      include: {
        actorEmployee: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let total = 0;
    try {
      total = await defaultPrisma.history.count({ where });
    } catch {
      total = history.length;
    }

    return {
      history,
      pagination: createPagination(total, currentPage, currentLimit),
    };
  }
}

module.exports = new HistoryService();
