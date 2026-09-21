const prisma = require('../../config/prisma');
const logger = require('../../config/logger');

/**
 * Ensures that the default Admin / Workshop Owner employee record exists in PostgreSQL.
 * This guarantees foreign key integrity when History logs are created by admin actions.
 */
const ensureAdminEmployee = async () => {
  try {
    const adminEmployee = await prisma.employee.upsert({
      where: { id: 'admin' },
      update: {
        role: 'OWNER',
        isActive: true,
        deletedAt: null,
      },
      create: {
        id: 'admin',
        name: 'Workshop Owner',
        phone: '+919825272547',
        role: 'OWNER',
        isActive: true,
      },
    });

    return adminEmployee;
  } catch (error) {
    // If phone conflict occurs with another record, fallback with unique phone
    if (error.code === 'P2002') {
      const fallbackAdmin = await prisma.employee.upsert({
        where: { id: 'admin' },
        update: {
          role: 'OWNER',
          isActive: true,
          deletedAt: null,
        },
        create: {
          id: 'admin',
          name: 'Workshop Owner',
          phone: `admin_${Date.now()}`.slice(0, 15),
          role: 'OWNER',
          isActive: true,
        },
      });
      return fallbackAdmin;
    }

    logger.error('Failed to ensure admin employee:', error);
    throw error;
  }
};

module.exports = {
  ensureAdminEmployee,
};
