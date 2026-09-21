const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/env');
const prisma = require('./config/prisma');
const logger = require('./config/logger');

// Core Middlewares
const actorMiddleware = require('./middlewares/actor');
const apiLimiter = require('./middlewares/rateLimiter');
const errorHandler = require('./core/middlewares/errorHandler');
const notFoundHandler = require('./core/middlewares/notFoundHandler');
const { sendSuccess } = require('./core/response');

// Module Routers
const employeeRoutes = require('./modules/employees/employee.routes');
const motorRoutes = require('./modules/motors/motor.routes');
const jobRoutes = require('./modules/jobs/job.routes');
const taskRoutes = require('./modules/tasks/task.routes');
const historyRoutes = require('./modules/history/history.routes');

const createApp = () => {
  const app = express();

  // Security & standard middlewares
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // General rate limiting
  app.use(apiLimiter);

  // Request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`);
    });
    next();
  });

  // Health check endpoint (bypasses actor middleware)
  app.get('/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    const healthData = {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    const statusCode = dbStatus === 'connected' ? 200 : 503;
    return sendSuccess(res, 'Health check status', healthData, statusCode);
  });

  // Root welcome endpoint
  app.get('/', (req, res) => {
    return sendSuccess(res, 'Hindustan Electricals Winding Works API is running', {
      docs: '/api/v1',
      health: '/health',
    });
  });

  // API v1 Overview & Endpoint Index
  app.get('/api/v1', (req, res) => {
    return sendSuccess(res, 'Hindustan Electricals Winding Works API v1', {
      version: '1.0.0',
      endpoints: {
        employees: '/api/v1/employees',
        employeeStatus: '/api/v1/employees/status',
        motors: '/api/v1/motors',
        jobs: '/api/v1/jobs',
        tasks: '/api/v1/tasks',
        history: '/api/v1/history',
        health: '/health',
      },
      authentication: {
        type: 'Header',
        header: config.ACTOR_HEADER,
        description: 'Provide an active employee ID in the X-Employee-Id header for all protected API requests',
      },
    });
  });

  // Protect all /api/v1 routes with actor middleware
  app.use('/api/v1', actorMiddleware);

  // API Routes
  app.use('/api/v1/employees', employeeRoutes);
  app.use('/api/v1/motors', motorRoutes);
  app.use('/api/v1/jobs', jobRoutes);
  app.use('/api/v1/jobs/:jobId/tasks', taskRoutes);
  app.use('/api/v1/tasks', taskRoutes);
  app.use('/api/v1/history', historyRoutes);

  // Fallback 404 handler
  app.use(notFoundHandler);

  // Central error handler
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
