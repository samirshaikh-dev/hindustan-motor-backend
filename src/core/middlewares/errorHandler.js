const { ZodError } = require('zod');
const logger = require('../../config/logger');

const errorHandler = (err, req, res, _next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Internal server error';
  let data = err.data || null;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    data = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    const fields = err.meta?.target ? (Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target) : 'field';
    message = `Duplicate entry for ${fields}.`;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    code = 'RESOURCE_NOT_FOUND';
    message = 'Resource not found or already deleted.';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.originalUrl} - 500 Error: ${err.message}`, {
      stack: err.stack,
      body: req.body,
    });
  } else {
    logger.warn(`[${req.method}] ${req.originalUrl} - ${statusCode} [${code}]: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
    data,
  });
};

module.exports = errorHandler;
