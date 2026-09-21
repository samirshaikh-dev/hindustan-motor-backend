const { z } = require('zod');

const JOB_STATUSES = ['RECEIVED', 'IN_PROGRESS', 'TESTING', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

const createJobSchema = z.object({
  body: z.object({
    motorId: z.string().min(1, 'Motor ID is required'),
    notes: z.string().trim().optional(),
  }),
});

const updateJobSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Job ID is required'),
  }),
  body: z.object({
    notes: z.string().trim().optional(),
  }),
});

const updateJobStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Job ID is required'),
  }),
  body: z.object({
    status: z.enum(JOB_STATUSES, {
      errorMap: () => ({ message: `Status must be one of: ${JOB_STATUSES.join(', ')}` }),
    }),
    notes: z.string().trim().optional(),
  }),
});

const jobIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Job ID is required'),
  }),
});

const listJobsQuerySchema = z.object({
  query: z.object({
    status: z.enum(JOB_STATUSES).optional(),
    motorId: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

module.exports = {
  JOB_STATUSES,
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
  jobIdParamSchema,
  listJobsQuerySchema,
};
