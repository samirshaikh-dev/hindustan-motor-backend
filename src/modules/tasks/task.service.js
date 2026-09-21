const taskRepo = require('./task.repository');
const prisma = require('../../config/prisma');
const historyService = require('../history/history.service');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../core/errors');

const VALID_TASK_TRANSITIONS = {
  PENDING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['PENDING', 'ASSIGNED'],
};

class TaskService {
  async createTask(jobId, data, actorEmployee) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { motor: true },
    });

    if (!job) {
      throw new NotFoundError('Job not found', 'JOB_NOT_FOUND');
    }

    let status = 'PENDING';
    let assignedEmployeeId = null;

    if (data.assignedEmployeeId) {
      if (actorEmployee.role !== 'OWNER') {
        throw new ForbiddenError('Only admin (OWNER) can assign tasks to employees', 'ADMIN_ONLY');
      }

      const assignedEmployee = await prisma.employee.findUnique({
        where: { id: data.assignedEmployeeId },
      });

      if (!assignedEmployee || !assignedEmployee.isActive) {
        throw new BadRequestError('Assigned employee is invalid or inactive', 'INVALID_EMPLOYEE');
      }

      assignedEmployeeId = assignedEmployee.id;
      status = 'ASSIGNED';
    }

    const task = await taskRepo.create({
      jobId,
      title: data.title,
      description: data.description,
      assignedEmployeeId,
      status,
    });

    await historyService.recordHistory({
      motorId: job.motorId,
      jobId: job.id,
      taskId: task.id,
      actorEmployeeId: actorEmployee.id,
      action: 'TASK_CREATED',
      description: `Task "${task.title}" created${assignedEmployeeId ? ` and assigned to employee` : ''}`,
      metadata: {
        taskId: task.id,
        title: task.title,
        status: task.status,
        assignedEmployeeId,
      },
    });

    return task;
  }

  async getTaskById(id) {
    const task = await taskRepo.findById(id);
    if (!task) {
      throw new NotFoundError('Task not found', 'TASK_NOT_FOUND');
    }
    return task;
  }

  async getTasksByJobId(jobId) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    });
    if (!job) {
      throw new NotFoundError('Job not found', 'JOB_NOT_FOUND');
    }
    return taskRepo.findByJobId(jobId);
  }

  async updateTask(id, data, actorEmployee) {
    const task = await this.getTaskById(id);
    const updatePayload = {};

    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;

    // Assignment change check
    if (data.assignedEmployeeId !== undefined && data.assignedEmployeeId !== task.assignedEmployeeId) {
      if (actorEmployee.role !== 'OWNER') {
        throw new ForbiddenError('Only admin (OWNER) can assign or reassign tasks', 'ADMIN_ONLY');
      }

      if (data.assignedEmployeeId) {
        const assignedEmployee = await prisma.employee.findUnique({
          where: { id: data.assignedEmployeeId },
        });

        if (!assignedEmployee || !assignedEmployee.isActive) {
          throw new BadRequestError('Assigned employee is invalid or inactive', 'INVALID_EMPLOYEE');
        }

        updatePayload.assignedEmployeeId = assignedEmployee.id;
        if (task.status === 'PENDING') {
          updatePayload.status = 'ASSIGNED';
        }

        await historyService.recordHistory({
          motorId: task.job.motorId,
          jobId: task.jobId,
          taskId: task.id,
          actorEmployeeId: actorEmployee.id,
          action: 'TASK_ASSIGNED',
          description: `Task "${task.title}" assigned to ${assignedEmployee.name}`,
          metadata: {
            assignedEmployeeId: assignedEmployee.id,
            employeeName: assignedEmployee.name,
          },
        });
      } else {
        // Unassigning task
        updatePayload.assignedEmployeeId = null;
        if (task.status === 'ASSIGNED') {
          updatePayload.status = 'PENDING';
        }
      }
    }

    return taskRepo.update(id, updatePayload);
  }

  async updateTaskStatus(id, newStatus, actorEmployee) {
    const task = await this.getTaskById(id);

    if (task.status === newStatus) {
      return task;
    }

    const allowed = VALID_TASK_TRANSITIONS[task.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from ${task.status} to ${newStatus}. Allowed next states: ${allowed.join(', ') || 'None (Terminal state)'}`,
        'INVALID_STATUS_TRANSITION'
      );
    }

    const updateData = { status: newStatus };
    let action = 'TASK_STATUS_CHANGED';
    let description = `Task "${task.title}" status changed from ${task.status} to ${newStatus}`;

    if (newStatus === 'IN_PROGRESS' && !task.startedAt) {
      updateData.startedAt = new Date();
      action = 'TASK_STARTED';
      description = `Task "${task.title}" started`;
    } else if (newStatus === 'COMPLETED') {
      updateData.completedAt = new Date();
      action = 'TASK_COMPLETED';
      description = `Task "${task.title}" completed`;
    }

    const updatedTask = await taskRepo.update(id, updateData);

    await historyService.recordHistory({
      motorId: task.job.motorId,
      jobId: task.jobId,
      taskId: task.id,
      actorEmployeeId: actorEmployee.id,
      action,
      description,
      metadata: {
        oldStatus: task.status,
        newStatus,
      },
    });

    return updatedTask;
  }
}

module.exports = new TaskService();
