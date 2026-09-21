const express = require('express');
const router = express.Router();
const motorController = require('./motor.controller');
const mediaController = require('../media/media.controller');
const historyController = require('../history/history.controller');
const upload = require('../media/upload.middleware');
const validate = require('../../middlewares/validate');
const {
  createMotorSchema,
  updateMotorSchema,
  motorIdParamSchema,
  listMotorsQuerySchema,
} = require('./motor.schema');

router.post('/', validate(createMotorSchema), motorController.registerMotor);
router.get('/', validate(listMotorsQuerySchema), motorController.getAllMotors);
router.get('/:id', validate(motorIdParamSchema), motorController.getMotorById);
router.patch('/:id', validate(updateMotorSchema), motorController.updateMotor);

// Motor image upload
router.post('/:id/images', validate(motorIdParamSchema), upload.single('image'), mediaController.uploadMotorImage);

// Motor history timeline
router.get('/:motorId/history', historyController.getMotorHistory);

module.exports = router;
