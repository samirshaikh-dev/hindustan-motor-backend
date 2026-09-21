const express = require('express');
const router = express.Router();
const employeeController = require('./employee.controller');
const validate = require('../../middlewares/validate');
const {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeIdParamSchema,
  listEmployeesQuerySchema,
  employeeTasksQuerySchema,
} = require('./employee.schema');

router.post('/', validate(createEmployeeSchema), employeeController.createEmployee);
router.get('/', validate(listEmployeesQuerySchema), employeeController.getAllEmployees);
router.get('/status', employeeController.getStatusDashboard);
router.get('/:id', validate(employeeIdParamSchema), employeeController.getEmployeeById);
router.patch('/:id', validate(updateEmployeeSchema), employeeController.updateEmployee);
router.get('/:id/tasks', validate(employeeTasksQuerySchema), employeeController.getEmployeeTasks);
router.delete('/:id', validate(employeeIdParamSchema), employeeController.deleteEmployee);

module.exports = router;
