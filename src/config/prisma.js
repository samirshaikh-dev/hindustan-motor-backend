const { PrismaClient } = require('@prisma/client');

// Models that support soft delete (have a `deletedAt` column)
const SOFT_DELETED_MODELS = new Set(['Employee', 'Motor', 'MotorImage', 'Job', 'Task', 'History', 'AdminSession']);

const basePrisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? [
          { emit: 'stdout', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
        ]
      : ['error'],
});

const mergeDeletedFilter = (where) => {
  const base = where ? { ...where } : {};
  if (Object.prototype.hasOwnProperty.call(base, 'AND')) {
    return { AND: [...(Array.isArray(base.AND) ? base.AND : [base.AND]), { deletedAt: null }] };
  }
  return { AND: [base, { deletedAt: null }] };
};

// Extended clients do not expose `$on`, so query logging for development is
// handled via the inherited `log` configuration above.
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      findUnique({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      findUniqueOrThrow({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      findFirst({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      findFirstOrThrow({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      findMany({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      count({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      aggregate({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      groupBy({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      update({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      updateMany({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      delete({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      deleteMany({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
      upsert({ args, query }) {
        if (!SOFT_DELETED_MODELS.has(args.model)) return query(args);
        return query({ ...args, where: mergeDeletedFilter(args.where) });
      },
    },
  },
});

module.exports = prisma;
module.exports.mergeDeletedFilter = mergeDeletedFilter;