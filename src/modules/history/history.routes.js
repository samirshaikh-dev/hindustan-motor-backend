const express = require('express');
const router = express.Router();
const historyController = require('./history.controller');

router.get('/motors/:motorId', historyController.getMotorHistory);
router.get('/jobs/:jobId', historyController.getJobHistory);

module.exports = router;
