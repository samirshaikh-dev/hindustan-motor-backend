const config = require('../config/env');
const prisma = require('../config/prisma');
const { UnauthorizedError } = require('../core/errors');

const actorMiddleware = async (req, res, next) => {
  // Allow health check and root endpoints to bypass actor verification
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  const headerName = (config.ACTOR_HEADER || 'X-Employee-Id').toLowerCase();
  const actorId = req.headers[headerName];

  if (!actorId || typeof actorId !== 'string' || !actorId.trim()) {
    return next(new UnauthorizedError(`Missing actor header: ${config.ACTOR_HEADER}`, 'ACTOR_HEADER_MISSING'));
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: actorId.trim() },
    });

    if (!employee) {
      return next(new UnauthorizedError('Actor employee not found', 'ACTOR_NOT_FOUND'));
    }

    if (!employee.isActive) {
      return next(new UnauthorizedError('Actor employee is inactive', 'ACTOR_INACTIVE'));
    }

    req.actor = employee;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = actorMiddleware;
