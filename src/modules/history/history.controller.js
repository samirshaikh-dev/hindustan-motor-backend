const historyService = require('./history.service');
const { sendSuccess } = require('../../core/response');
const asyncHandler = require('../../core/asyncHandler');

const getMotorHistory = asyncHandler(async (req, res) => {
  const { motorId } = req.params;
  const result = await historyService.getMotorHistory(motorId, req.query);
  return sendSuccess(res, 'Motor history retrieved successfully', result);
});

const getJobHistory = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const result = await historyService.getJobHistory(jobId, req.query);
  return sendSuccess(res, 'Job history retrieved successfully', result);
});

module.exports = {
  getMotorHistory,
  getJobHistory,
};
