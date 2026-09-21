const employeeRepo = require('./employee.repository');
const { NotFoundError, ConflictError } = require('../../core/errors');

class EmployeeService {
  async createEmployee(data) {
    const existing = await employeeRepo.findByPhone(data.phone);
    if (existing) {
      throw new ConflictError('An employee with this phone number already exists', 'PHONE_ALREADY_EXISTS');
    }
    return employeeRepo.create(data);
  }

  async getEmployeeById(id) {
    const employee = await employeeRepo.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found', 'EMPLOYEE_NOT_FOUND');
    }
    return employee;
  }

  async getAllEmployees(filter) {
    return employeeRepo.findAll(filter);
  }

  async updateEmployee(id, data) {
    await this.getEmployeeById(id);

    if (data.phone) {
      const existing = await employeeRepo.findByPhone(data.phone);
      if (existing && existing.id !== id) {
        throw new ConflictError('An employee with this phone number already exists', 'PHONE_ALREADY_EXISTS');
      }
    }

    return employeeRepo.update(id, data);
  }

  async getStatusDashboard() {
    const employees = await employeeRepo.findStatusDashboard();
    return employees.map((emp) => ({
      id: emp.id,
      name: emp.name,
      phone: emp.phone,
      role: emp.role,
      isActive: emp.isActive,
      activeTaskCount: emp.assignedTasks.length,
      activeTasks: emp.assignedTasks,
    }));
  }

  async getEmployeeTasks(employeeId, statusFilter) {
    await this.getEmployeeById(employeeId);
    return employeeRepo.findEmployeeTasks(employeeId, statusFilter);
  }
}

module.exports = new EmployeeService();
