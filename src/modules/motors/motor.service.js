const motorRepo = require('./motor.repository');
const historyService = require('../history/history.service');
const { generateUniqueNumber } = require('../../utils/numberGenerator');
const { NotFoundError } = require('../../core/errors');

class MotorService {
  async registerMotor(data, actorEmployee) {
    const motorNumber = generateUniqueNumber('MTR');
    const jobNumber = generateUniqueNumber('JOB');

    const motorData = {
      ...data,
      motorNumber,
      receivedAt: data.receivedAt ? new Date(data.receivedAt) : undefined,
      expectedDeliveryAt: data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt) : undefined,
    };

    return motorRepo.createMotorWithJob({
      motorData,
      jobNumber,
      actorEmployeeId: actorEmployee.id,
    });
  }

  async getMotorById(id) {
    const motor = await motorRepo.findById(id);
    if (!motor) {
      throw new NotFoundError('Motor not found', 'MOTOR_NOT_FOUND');
    }
    return motor;
  }

  async getAllMotors(query) {
    return motorRepo.findAll(query);
  }

  async updateMotor(id, data, actorEmployee) {
    await this.getMotorById(id);

    const updateData = {
      ...data,
      expectedDeliveryAt: data.expectedDeliveryAt !== undefined ? (data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt) : null) : undefined,
    };

    const updated = await motorRepo.update(id, updateData);

    await historyService.recordHistory({
      motorId: id,
      actorEmployeeId: actorEmployee.id,
      action: 'MOTOR_UPDATED',
      description: `Motor ${updated.motorNumber} details updated`,
      metadata: data,
    });

    return updated;
  }
}

module.exports = new MotorService();
