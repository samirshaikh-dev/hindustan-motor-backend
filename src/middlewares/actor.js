const config = require('../config/env');
const prisma = require('../config/prisma');
const authService = require('../modules/auth/auth.service');
const { UnauthorizedError } = require('../core/errors');

const actorMiddleware = async (req, res, next) => {
  // Allow health check, root endpoints, and auth login to bypass actor verification
  if (req.path === '/health' || req.path === '/' || req.path === '/login' || req.baseUrl.endsWith('/auth') && req.path === '/login') {
    return next();
  }

  // Check for Bearer JWT token (Admin session)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = authService.verifyAccessToken(token);
      req.admin = {
        email: decoded.email,
        role: decoded.role,
      };
      req.actor = {
        id: 'admin',
        name: 'Workshop Owner',
        role: 'OWNER',
        email: decoded.email,
        isActive: true,
      };
      return next();
    } catch (error) {
      return next(error);
    }
  }

  const headerName = (config.ACTOR_HEADER || 'X-Employee-Id').toLowerCase();
  const actorId = req.headers[headerName];

  if (!actorId || typeof actorId !== 'string' || !actorId.trim()) {
    // Allow public staff list (GET /api/v1/employees) to bypass actor verification
    // Resolves the chicken-and-egg bootstrap issue when mobile app needs to load active staff for profile selection
    if (req.method === 'GET' && (req.path === '/employees' || req.path === '/employees/')) {
      return next();
    }

    return next(new UnauthorizedError(`Missing actor identity (Header: ${config.ACTOR_HEADER} or Bearer token)`, 'ACTOR_HEADER_MISSING'));
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
