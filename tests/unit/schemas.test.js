const { createEmployeeSchema, updateEmployeeSchema } = require('../../src/modules/employees/employee.schema');
const { createMotorSchema } = require('../../src/modules/motors/motor.schema');
const { updateJobStatusSchema } = require('../../src/modules/jobs/job.schema');
const { createTaskSchema } = require('../../src/modules/tasks/task.schema');

describe('Zod Validation Schemas', () => {
  describe('Employee Schemas', () => {
    it('should validate valid employee payload', () => {
      const valid = { body: { name: 'Imran Khan', phone: '9876543210', role: 'EMPLOYEE' } };
      const parsed = createEmployeeSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should fail when name is too short', () => {
      const invalid = { body: { name: 'A', phone: '9876543210' } };
      const parsed = createEmployeeSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('should fail when phone number is too short', () => {
      const invalid = { body: { name: 'Imran Khan', phone: '12345' } };
      const parsed = createEmployeeSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('should require at least one field on update', () => {
      const invalid = { params: { id: 'emp_123' }, body: {} };
      const parsed = updateEmployeeSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('Motor Schemas', () => {
    it('should validate valid motor registration payload', () => {
      const valid = {
        body: {
          customerName: 'Patel Industries',
          customerPhone: '9825000000',
          brand: 'Kirloskar',
          power: 15,
          powerUnit: 'HP',
          rpm: 1440,
        },
      };
      const parsed = createMotorSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should fail when power is negative', () => {
      const invalid = {
        body: {
          customerName: 'Patel Industries',
          customerPhone: '9825000000',
          power: -5,
        },
      };
      const parsed = createMotorSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('Job Schemas', () => {
    it('should validate correct status transition enum', () => {
      const valid = { params: { id: 'job_1' }, body: { status: 'IN_PROGRESS' } };
      const parsed = updateJobStatusSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should reject invalid status string', () => {
      const invalid = { params: { id: 'job_1' }, body: { status: 'RANDOM_STATUS' } };
      const parsed = updateJobStatusSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('Task Schemas', () => {
    it('should validate valid task creation payload', () => {
      const valid = {
        params: { jobId: 'job_1' },
        body: { title: 'Rotor Rewinding', description: 'Rewind copper wire' },
      };
      const parsed = createTaskSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('should fail when title is missing', () => {
      const invalid = { params: { jobId: 'job_1' }, body: {} };
      const parsed = createTaskSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });
});
