const crypto = require('crypto');
const config = require('../../config/env');
const jwt = require('../../utils/jwt');
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

  async login(email, password) {
    const isEmailValid = this.secureCompare(
      email.trim().toLowerCase(),
      config.ADMIN_EMAIL.trim().toLowerCase()
    );

    const isPasswordValid = this.secureCompare(password, config.ADMIN_PASSWORD);

    if (!isEmailValid || !isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const payload = {
      email: config.ADMIN_EMAIL,
      role: 'OWNER',
      type: 'ADMIN',
    };

    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    return {
      token,
      tokenType: 'Bearer',
      expiresIn: config.JWT_EXPIRES_IN,
      admin: {
        email: config.ADMIN_EMAIL,
        role: 'OWNER',
      },
    };
  }

  verifyAdminToken(token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (decoded.role !== 'OWNER' || decoded.type !== 'ADMIN') {
        throw new UnauthorizedError('Invalid token permissions', 'INVALID_TOKEN');
      }
      return decoded;
    } catch (error) {
      throw new UnauthorizedError(error.message || 'Invalid or expired token', 'INVALID_TOKEN');
    }
  }
}

module.exports = new AuthService();
