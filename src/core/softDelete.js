const prisma = require('../config/prisma');

async function softDelete(modelName, id, tx = null) {
  const db = tx || prisma;
  if (!db[modelName] || typeof db[modelName].update !== 'function') {
    throw new Error(`Soft delete not available for model: ${modelName}`);
  }

  return db[modelName].update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

module.exports = { softDelete };