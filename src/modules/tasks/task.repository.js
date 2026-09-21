const defaultPrisma = require('../../config/prisma');
const { NotFoundError } = require('../../core/errors');
const { softDelete } = require('../../core/softDelete');
const { getPaginationParams, createPagination } = require('../../utils/pagination');

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

  async findByJobId(jobId, { status, page = 1, limit = 20 } = {}) {
    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);
    const where = { jobId };
    if (status) {
      where.status = status;
    }

    const tasks = await defaultPrisma.task.findMany({
      where,
      skip,
      take,
      include: {
        assignedEmployee: {
          select: { id: true, name: true, phone: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let total = 0;
    try {
      total = await defaultPrisma.task.count({ where });
    } catch {
      total = tasks.length;
    }

    return {
      tasks,
      pagination: createPagination(total, currentPage, currentLimit),
    };
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

  async deleteTask({ taskId, actorEmployeeId }) {
    return defaultPrisma.$transaction(async (tx) => {
      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: { job: true },
      });

      if (!task) {
        throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
      }

      await softDelete('task', task.id, tx);

      await tx.history.create({
        data: {
          motorId: task.job.motorId,
          jobId: task.jobId,
          taskId: task.id,
          actorEmployeeId,
          action: 'TASK_DELETED',
          description: `Task "${task.title}" deleted from job ${task.jobId}`,
          metadata: {
            taskId: task.id,
            title: task.title,
            jobId: task.jobId,
          },
        },
      });

      return task;
    });
  }
}

module.exports = new TaskRepository();
