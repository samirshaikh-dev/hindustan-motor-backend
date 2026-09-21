const employeeService = require('./employee.service');
const { sendSuccess } = require('../../core/response');
const asyncHandler = require('../../core/asyncHandler');

const createEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  return sendSuccess(res, 'Employee created successfully', employee, 201);
});

const getAllEmployees = asyncHandler(async (req, res) => {
  const employees = await employeeService.getAllEmployees(req.query);
  return sendSuccess(res, 'Employees retrieved successfully', employees);
});

const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.id);
  return sendSuccess(res, 'Employee retrieved successfully', employee);
});

const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(req.params.id, req.body);
  return sendSuccess(res, 'Employee updated successfully', employee);
});

const getStatusDashboard = asyncHandler(async (req, res) => {
  const dashboard = await employeeService.getStatusDashboard();
  return sendSuccess(res, 'Employee status dashboard retrieved successfully', dashboard);
});

const getEmployeeTasks = asyncHandler(async (req, res) => {
  const tasks = await employeeService.getEmployeeTasks(req.params.id, req.query);
  return sendSuccess(res, 'Employee tasks retrieved successfully', tasks);
});

const deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await employeeService.deleteEmployee(req.params.id, req.actor);
  return sendSuccess(res, 'Employee deleted successfully', employee);
});

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  getStatusDashboard,
  getEmployeeTasks,
  deleteEmployee,
};
