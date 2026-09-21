const createApp = require('./app');
const config = require('./config/env');
const logger = require('./config/logger');
const prisma = require('./config/prisma');
const { ensureAdminEmployee } = require('./modules/employees/employee.seed');

const app = createApp();

const startServer = async () => {
  try {
    await ensureAdminEmployee();
    logger.info('👤 Admin employee ensured in database');
  } catch (error) {
    logger.warn('⚠️ Could not bootstrap admin employee on startup:', error.message);
  }

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 Server running in ${config.NODE_ENV} mode on port ${config.PORT}`);
    logger.info(`📋 Health check available at http://localhost:${config.PORT}/health`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await prisma.$disconnect();
      logger.info('Prisma client disconnected.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();
