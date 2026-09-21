const prisma = require('../../config/prisma');

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
    const where = {};
    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }
    if (filter.role) {
      where.role = filter.role;
    }
    return prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
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

  async findEmployeeTasks(employeeId, statusFilter = null) {
    const where = { assignedEmployeeId: employeeId };
    if (statusFilter) {
      where.status = statusFilter;
    }
    return prisma.task.findMany({
      where,
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
  }
}

module.exports = new EmployeeRepository();
