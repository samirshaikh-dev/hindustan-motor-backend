const express = require('express');
const router = express.Router({ mergeParams: true });
const taskController = require('./task.controller');
const validate = require('../../middlewares/validate');
const {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskIdParamSchema,
  jobIdTasksParamSchema,
} = require('./task.schema');

// Routes nested under /jobs/:jobId/tasks
router.post('/', validate(createTaskSchema), taskController.createTask);
router.get('/', validate(jobIdTasksParamSchema), taskController.getTasksByJobId);

// Direct task routes
router.get('/:id', validate(taskIdParamSchema), taskController.getTaskById);
router.patch('/:id', validate(updateTaskSchema), taskController.updateTask);
router.patch('/:id/status', validate(updateTaskStatusSchema), taskController.updateTaskStatus);

module.exports = router;
