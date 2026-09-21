const { z } = require('zod');

const TASK_STATUSES = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

const createTaskSchema = z.object({
  params: z.object({
    jobId: z.string().min(1, 'Job ID is required'),
  }),
  body: z.object({
    title: z.string().trim().min(2, 'Task title is required'),
    description: z.string().trim().optional(),
    assignedEmployeeId: z.string().optional().nullable(),
  }),
});

const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Task ID is required'),
  }),
  body: z.object({
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().optional().nullable(),
    assignedEmployeeId: z.string().nullable().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
});

const updateTaskStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Task ID is required'),
  }),
  body: z.object({
    status: z.enum(TASK_STATUSES, {
      errorMap: () => ({ message: `Status must be one of: ${TASK_STATUSES.join(', ')}` }),
    }),
  }),
});

const taskIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Task ID is required'),
  }),
});

const jobIdTasksParamSchema = z.object({
  params: z.object({
    jobId: z.string().min(1, 'Job ID is required'),
  }),
});

module.exports = {
  TASK_STATUSES,
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  taskIdParamSchema,
  jobIdTasksParamSchema,
};
