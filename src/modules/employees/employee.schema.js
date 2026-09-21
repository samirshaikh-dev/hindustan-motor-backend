const { z } = require('zod');

const createEmployeeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be at most 15 digits'),
    role: z.enum(['OWNER', 'EMPLOYEE']).optional().default('EMPLOYEE'),
  }),
});

const updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Employee ID is required'),
  }),
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string().trim().min(10, 'Phone must be at least 10 digits').max(15, 'Phone must be at most 15 digits').optional(),
    role: z.enum(['OWNER', 'EMPLOYEE']).optional(),
    isActive: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
});

const employeeIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Employee ID is required'),
  }),
});

const listEmployeesQuerySchema = z.object({
  query: z.object({
    isActive: z
      .string()
      .optional()
      .transform((val) => (val === undefined ? undefined : val === 'true')),
    role: z.enum(['OWNER', 'EMPLOYEE']).optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

const employeeTasksQuerySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Employee ID is required'),
  }),
  query: z.object({
    status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeIdParamSchema,
  listEmployeesQuerySchema,
  employeeTasksQuerySchema,
};
