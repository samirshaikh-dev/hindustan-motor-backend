const { ForbiddenError } = require('../core/errors');

const requireAdmin = (req, res, next) => {
  if (!req.actor) {
    return next(new ForbiddenError('Authentication required before role check', 'ACTOR_REQUIRED'));
  }

  if (req.actor.role !== 'OWNER') {
    return next(new ForbiddenError('Only admin (OWNER) can perform this action', 'ADMIN_ONLY'));
  }

  next();
};

module.exports = {
  requireAdmin,
};
