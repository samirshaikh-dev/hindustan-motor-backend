const historyService = require('./history.service');
const { sendSuccess } = require('../../core/response');
const asyncHandler = require('../../core/asyncHandler');

const getMotorHistory = asyncHandler(async (req, res) => {
  const { motorId } = req.params;
  const history = await historyService.getMotorHistory(motorId);
  return sendSuccess(res, 'Motor history retrieved successfully', history);
});

const getJobHistory = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const history = await historyService.getJobHistory(jobId);
  return sendSuccess(res, 'Job history retrieved successfully', history);
});

module.exports = {
  getMotorHistory,
  getJobHistory,
};
