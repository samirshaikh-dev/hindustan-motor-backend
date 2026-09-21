const express = require('express');
const router = express.Router();
const historyController = require('./history.controller');
const validate = require('../../middlewares/validate');
const { motorHistoryQuerySchema, jobHistoryQuerySchema } = require('./history.schema');

router.get('/motors/:motorId', validate(motorHistoryQuerySchema), historyController.getMotorHistory);
router.get('/jobs/:jobId', validate(jobHistoryQuerySchema), historyController.getJobHistory);

module.exports = router;
