const jobService = require('./job.service');
const { sendSuccess } = require('../../core/response');
const asyncHandler = require('../../core/asyncHandler');

const createJob = asyncHandler(async (req, res) => {
  const job = await jobService.createJob(req.body, req.actor);
  return sendSuccess(res, 'Job created successfully', job, 201);
});

const getAllJobs = asyncHandler(async (req, res) => {
  const result = await jobService.getAllJobs(req.query);
  return sendSuccess(res, 'Jobs retrieved successfully', result);
});

const getJobById = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.params.id);
  return sendSuccess(res, 'Job retrieved successfully', job);
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await jobService.updateJob(req.params.id, req.body, req.actor);
  return sendSuccess(res, 'Job updated successfully', job);
});

const updateJobStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const job = await jobService.updateJobStatus(req.params.id, status, notes, req.actor);
  return sendSuccess(res, `Job status updated to ${status} successfully`, job);
});

module.exports = {
  createJob,
  getAllJobs,
  getJobById,
  updateJob,
  updateJobStatus,
};
