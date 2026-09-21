const prisma = require('../../config/prisma');
const { NotFoundError } = require('../../core/errors');
const { getPaginationParams, createPagination } = require('../../utils/pagination');

class EmployeeRepository {
  async create(data) {
    return prisma.employee.create({ data });
  }

  async findById(id) {
    return prisma.employee.findUnique({
      where: { id },
    });
  }

  async findByPhone(phone) {
    return prisma.employee.findUnique({
      where: { phone },
    });
  }

  async findAll(filter = {}) {
    const { page = 1, limit = 20, isActive, role, search } = filter;
    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (role) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'asc' },
    });

    let total = 0;
    try {
      total = await prisma.employee.count({ where });
    } catch {
      total = employees.length;
    }

    return {
      employees,
      pagination: createPagination(total, currentPage, currentLimit),
    };
  }

  async update(id, data) {
    return prisma.employee.update({
      where: { id },
      data,
    });
  }

  async findStatusDashboard() {
    // Returns employees with count of their active tasks and details
    return prisma.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        assignedTasks: {
          where: {
            status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
            deletedAt: null,
            job: {
              deletedAt: null,
            },
          },
          select: {
            id: true,
            title: true,
            status: true,
            startedAt: true,
            job: {
              select: {
                id: true,
                jobNumber: true,
                status: true,
                motor: {
                  select: {
                    id: true,
                    motorNumber: true,
                    customerName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findEmployeeTasks(employeeId, query = {}) {
    const { status, statusFilter, page = 1, limit = 20 } = typeof query === 'string' ? { statusFilter: query } : query;
    const effectiveStatus = status || statusFilter;
    const { skip, take, page: currentPage, limit: currentLimit } = getPaginationParams(page, limit);

    const where = { assignedEmployeeId: employeeId };
    if (effectiveStatus) {
      where.status = effectiveStatus;
    }

    const tasks = await prisma.task.findMany({
      where,
      skip,
      take,
      include: {
        job: {
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let total = 0;
    try {
      total = await prisma.task.count({ where });
    } catch {
      total = tasks.length;
    }

    return {
      tasks,
      pagination: createPagination(total, currentPage, currentLimit),
    };
  }

  async deleteEmployee({ employeeId, actorEmployeeId }) {
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
      });

      if (!employee) {
        throw new NotFoundError('Employee not found', 'EMPLOYEE_NOT_FOUND');
      }

      await tx.task.updateMany({
        where: { assignedEmployeeId: employeeId, status: 'ASSIGNED' },
        data: { assignedEmployeeId: null, status: 'PENDING' },
      });

      await tx.task.updateMany({
        where: { assignedEmployeeId: employeeId },
        data: { assignedEmployeeId: null },
      });

      await tx.employee.update({
        where: { id: employeeId },
        data: { isActive: false, deletedAt: now },
      });

      await tx.history.create({
        data: {
          actorEmployeeId,
          action: 'EMPLOYEE_DELETED',
          description: `Employee ${employee.name} deleted`,
          metadata: {
            employeeId: employee.id,
            name: employee.name,
            phone: employee.phone,
          },
        },
      });

      return employee;
    });
  }
}

module.exports = new EmployeeRepository();
