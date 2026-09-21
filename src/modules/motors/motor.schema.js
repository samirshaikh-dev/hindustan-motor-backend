const { z } = require('zod');

const createMotorSchema = z.object({
  body: z.object({
    customerName: z.string().trim().min(2, 'Customer name is required'),
    customerPhone: z.string().trim().min(10, 'Customer phone must be at least 10 digits').max(15),
    brand: z.string().trim().optional(),
    motorType: z.string().trim().optional(),
    power: z.coerce.number().positive('Power must be positive').optional(),
    powerUnit: z.enum(['HP', 'KW']).optional().default('HP'),
    rpm: z.coerce.number().int().positive('RPM must be a positive integer').optional(),
    phase: z.string().trim().optional(),
    serialNumber: z.string().trim().optional(),
    complaint: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    receivedAt: z.string().datetime().optional(),
    expectedDeliveryAt: z.string().datetime().optional(),
  }),
});

const updateMotorSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Motor ID is required'),
  }),
  body: z.object({
    customerName: z.string().trim().min(2).optional(),
    customerPhone: z.string().trim().min(10).max(15).optional(),
    brand: z.string().trim().optional(),
    motorType: z.string().trim().optional(),
    power: z.coerce.number().positive().optional(),
    powerUnit: z.enum(['HP', 'KW']).optional(),
    rpm: z.coerce.number().int().positive().optional(),
    phase: z.string().trim().optional(),
    serialNumber: z.string().trim().optional(),
    complaint: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    expectedDeliveryAt: z.string().datetime().nullable().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
});

const motorIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Motor ID is required'),
  }),
});

const listMotorsQuerySchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    status: z.enum(['RECEIVED', 'IN_PROGRESS', 'TESTING', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

module.exports = {
  createMotorSchema,
  updateMotorSchema,
  motorIdParamSchema,
  listMotorsQuerySchema,
};
