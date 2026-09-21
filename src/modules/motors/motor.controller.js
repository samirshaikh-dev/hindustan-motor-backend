const motorService = require('./motor.service');
const { sendSuccess } = require('../../core/response');
const asyncHandler = require('../../core/asyncHandler');

const registerMotor = asyncHandler(async (req, res) => {
  const motor = await motorService.registerMotor(req.body, req.actor);
  return sendSuccess(res, 'Motor registered and job created successfully', motor, 201);
});

const getAllMotors = asyncHandler(async (req, res) => {
  const result = await motorService.getAllMotors(req.query);
  return sendSuccess(res, 'Motors retrieved successfully', result);
});

const getMotorById = asyncHandler(async (req, res) => {
  const motor = await motorService.getMotorById(req.params.id);
  return sendSuccess(res, 'Motor retrieved successfully', motor);
});

const updateMotor = asyncHandler(async (req, res) => {
  const motor = await motorService.updateMotor(req.params.id, req.body, req.actor);
  return sendSuccess(res, 'Motor updated successfully', motor);
});

module.exports = {
  registerMotor,
  getAllMotors,
  getMotorById,
  updateMotor,
};
