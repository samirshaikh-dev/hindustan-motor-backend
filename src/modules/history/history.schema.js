const { z } = require('zod');

const motorHistoryQuerySchema = z.object({
  params: z.object({
    motorId: z.string().min(1, 'Motor ID is required'),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

const jobHistoryQuerySchema = z.object({
  params: z.object({
    jobId: z.string().min(1, 'Job ID is required'),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),
});

module.exports = {
  motorHistoryQuerySchema,
  jobHistoryQuerySchema,
};
