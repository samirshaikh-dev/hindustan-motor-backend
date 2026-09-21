const taskService = require('./task.service');
const { sendSuccess } = require('../../core/response');
const asyncHandler = require('../../core/asyncHandler');

const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.params.jobId, req.body, req.actor);
  return sendSuccess(res, 'Task created successfully', task, 201);
});

const getTasksByJobId = asyncHandler(async (req, res) => {
  const result = await taskService.getTasksByJobId(req.params.jobId, req.query);
  return sendSuccess(res, 'Tasks retrieved successfully', result);
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(req.params.id);
  return sendSuccess(res, 'Task retrieved successfully', task);
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await taskService.updateTask(req.params.id, req.body, req.actor);
  return sendSuccess(res, 'Task updated successfully', task);
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const task = await taskService.updateTaskStatus(req.params.id, status, req.actor);
  return sendSuccess(res, `Task status updated to ${status} successfully`, task);
});

const deleteTask = asyncHandler(async (req, res) => {
  const task = await taskService.deleteTask(req.params.id, req.actor);
  return sendSuccess(res, 'Task deleted successfully', task);
});

module.exports = {
  createTask,
  getTasksByJobId,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
