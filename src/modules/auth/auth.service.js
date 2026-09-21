const crypto = require('crypto');
const config = require('../../config/env');
const jwt = require('../../utils/jwt');
const sessionRepo = require('./session.repository');
const logger = require('../../config/logger');
const { UnauthorizedError } = require('../../core/errors');

class AuthService {
  /**
   * Constant-time string comparison to prevent timing attacks
   */
  secureCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }

  async login(email, password, { ipAddress = null, userAgent = null } = {}) {
    const isEmailValid = this.secureCompare(
      email.trim().toLowerCase(),
      config.ADMIN_EMAIL.trim().toLowerCase()
    );

    const isPasswordValid = this.secureCompare(password, config.ADMIN_PASSWORD);

    if (!isEmailValid || !isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const family = crypto.randomUUID();

    // 1. Generate short-lived access token
    const accessToken = jwt.sign(
      {
        jti: crypto.randomUUID(),
        sub: 'admin',
        email: config.ADMIN_EMAIL,
        role: 'OWNER',
        type: 'ACCESS',
      },
      config.JWT_ACCESS_SECRET || config.JWT_SECRET,
      { expiresIn: config.ACCESS_TOKEN_EXPIRES_IN }
    );

    // 2. Generate long-lived refresh token
    const refreshToken = jwt.sign(
      {
        jti: crypto.randomUUID(),
        sub: 'admin',
        email: config.ADMIN_EMAIL,
        role: 'OWNER',
        family,
        type: 'REFRESH',
      },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.REFRESH_TOKEN_EXPIRES_IN }
    );

    // 3. Store hashed refresh token in database
    const tokenHash = jwt.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + jwt.parseDuration(config.REFRESH_TOKEN_EXPIRES_IN) * 1000);

    await sessionRepo.createSession({
      adminEmail: config.ADMIN_EMAIL,
      tokenHash,
      family,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return {
      token: accessToken,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
      admin: {
        email: config.ADMIN_EMAIL,
        role: 'OWNER',
      },
    };
  }

  async rotateRefreshToken(oldRefreshToken, { ipAddress = null, userAgent = null } = {}) {
    if (!oldRefreshToken || typeof oldRefreshToken !== 'string') {
      throw new UnauthorizedError('Refresh token required', 'REFRESH_TOKEN_REQUIRED');
    }

    // 1. Verify token signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(oldRefreshToken, config.JWT_REFRESH_SECRET);
      if (decoded.type !== 'REFRESH') {
        throw new UnauthorizedError('Invalid token type', 'INVALID_TOKEN');
      }
    } catch (err) {
      throw new UnauthorizedError(err.message || 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // 2. Check token hash in database
    const oldTokenHash = jwt.hashToken(oldRefreshToken);
    const session = await sessionRepo.findSessionByTokenHash(oldTokenHash);

    if (!session) {
      throw new UnauthorizedError('Refresh session not found', 'INVALID_REFRESH_TOKEN');
    }

    // 3. Reuse detection: If a revoked token is used, compromise is suspected!
    if (session.isRevoked) {
      logger.warn(`🚨 REFRESH TOKEN REUSE DETECTED! Invaliding entire session family: ${session.family}`);
      await sessionRepo.revokeAllFamilySessions(session.family);
      throw new UnauthorizedError('Refresh token reuse detected. Session invalidated.', 'TOKEN_REUSE_DETECTED');
    }

    // 4. Check if session has expired
    if (new Date() > session.expiresAt) {
      await sessionRepo.revokeSession(session.id);
      throw new UnauthorizedError('Refresh token has expired', 'REFRESH_TOKEN_EXPIRED');
    }

    // 5. Generate new access token
    const newAccessToken = jwt.sign(
      {
        jti: crypto.randomUUID(),
        sub: 'admin',
        email: config.ADMIN_EMAIL,
        role: 'OWNER',
        type: 'ACCESS',
      },
      config.JWT_ACCESS_SECRET || config.JWT_SECRET,
      { expiresIn: config.ACCESS_TOKEN_EXPIRES_IN }
    );

    // 6. Generate new rotated refresh token in the same family
    const newRefreshToken = jwt.sign(
      {
        jti: crypto.randomUUID(),
        sub: 'admin',
        email: config.ADMIN_EMAIL,
        role: 'OWNER',
        family: session.family,
        type: 'REFRESH',
      },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.REFRESH_TOKEN_EXPIRES_IN }
    );

    const newTokenHash = jwt.hashToken(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + jwt.parseDuration(config.REFRESH_TOKEN_EXPIRES_IN) * 1000);

    // 7. Store new session and mark old as revoked
    const newSession = await sessionRepo.createSession({
      adminEmail: config.ADMIN_EMAIL,
      tokenHash: newTokenHash,
      family: session.family,
      expiresAt: newExpiresAt,
      ipAddress,
      userAgent,
    });

    await sessionRepo.revokeSession(session.id, newSession.id);

    return {
      token: newAccessToken,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
    };
  }

  async logout(refreshToken) {
    if (refreshToken && typeof refreshToken === 'string') {
      const tokenHash = jwt.hashToken(refreshToken);
      const session = await sessionRepo.findSessionByTokenHash(tokenHash);
      if (session && !session.isRevoked) {
        await sessionRepo.revokeSession(session.id);
      }
    }
    return { success: true };
  }

  verifyAccessToken(token) {
    try {
      // Check using access secret or fallback
      let decoded;
      try {
        decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
      } catch {
        decoded = jwt.verify(token, config.JWT_SECRET);
      }

      if (decoded.role !== 'OWNER') {
        throw new UnauthorizedError('Invalid token permissions', 'INVALID_TOKEN');
      }
      return decoded;
    } catch (error) {
      throw new UnauthorizedError(error.message || 'Invalid or expired access token', 'INVALID_TOKEN');
    }
  }
}

module.exports = new AuthService();
