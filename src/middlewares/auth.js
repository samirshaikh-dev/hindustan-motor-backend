const authService = require('../modules/auth/auth.service');
const { UnauthorizedError } = require('../core/errors');

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Admin authorization token required', 'TOKEN_REQUIRED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = authService.verifyAccessToken(token);
    req.admin = {
      email: decoded.email,
      role: decoded.role,
    };

    // Attach admin as acting actor with OWNER role for seamless domain operations
    req.actor = {
      id: 'admin',
      name: 'Workshop Owner',
      role: 'OWNER',
      email: decoded.email,
      isActive: true,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticateAdmin,
};
