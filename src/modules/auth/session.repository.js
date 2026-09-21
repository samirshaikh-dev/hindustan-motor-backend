const prisma = require('../../config/prisma');

class SessionRepository {
  async createSession({ adminEmail, tokenHash, family, expiresAt, ipAddress = null, userAgent = null }) {
    return prisma.adminSession.create({
      data: {
        adminEmail,
        tokenHash,
        family,
        expiresAt,
        ipAddress,
        userAgent,
        isRevoked: false,
      },
    });
  }

  async findSessionByTokenHash(tokenHash) {
    return prisma.adminSession.findUnique({
      where: { tokenHash },
    });
  }

  async revokeSession(id, replacedByTokenId = null) {
    return prisma.adminSession.update({
      where: { id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        replacedByTokenId,
      },
    });
  }

  async revokeAllFamilySessions(family) {
    return prisma.adminSession.updateMany({
      where: { family, isRevoked: false },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllAdminSessions(adminEmail) {
    return prisma.adminSession.updateMany({
      where: { adminEmail, isRevoked: false },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }
}

module.exports = new SessionRepository();
