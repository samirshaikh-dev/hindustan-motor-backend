const express = require('express');
const router = express.Router();
const jobController = require('./job.controller');
const historyController = require('../history/history.controller');
const validate = require('../../middlewares/validate');
const { jobHistoryQuerySchema } = require('../history/history.schema');
const {
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
  jobIdParamSchema,
  listJobsQuerySchema,
} = require('./job.schema');

router.post('/', validate(createJobSchema), jobController.createJob);
router.get('/', validate(listJobsQuerySchema), jobController.getAllJobs);
router.get('/:id', validate(jobIdParamSchema), jobController.getJobById);
router.patch('/:id', validate(updateJobSchema), jobController.updateJob);
router.patch('/:id/status', validate(updateJobStatusSchema), jobController.updateJobStatus);
router.delete('/:id', validate(jobIdParamSchema), jobController.deleteJob);

// Job history timeline
router.get('/:jobId/history', validate(jobHistoryQuerySchema), historyController.getJobHistory);

module.exports = router;
