/**
 * JWT Manager
 * Manages JWT token creation, verification, and refresh
 */

import { logger } from './logger';
import { ValidationError, AuthenticationError } from './errors';

/**
 * JWT manager
 */
export class JWTManager {
  constructor(options = {}) {
    this.secret = options.secret || process.env.JWT_SECRET;
    this.refreshSecret = options.refreshSecret || process.env.JWT_REFRESH_SECRET;
    this.expiresIn = options.expiresIn || '1h';
    this.refreshExpiresIn = options.refreshExpiresIn || '7d';
    this.algorithm = options.algorithm || 'HS256';

    if (!this.secret || !this.refreshSecret) {
      throw new ValidationError('JWT_SECRET and JWT_REFRESH_SECRET are required');
    }

    this.stats = {
      created: 0,
      verified: 0,
      failed: 0,
      refreshed: 0,
    };
  }

  /**
   * Create JWT token
   */
  createToken(payload = {}, options = {}) {
    try {
      const jwt = require('jsonwebtoken');

      const tokenPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
      };

      const token = jwt.sign(tokenPayload, this.secret, {
        expiresIn: options.expiresIn || this.expiresIn,
        algorithm: this.algorithm,
      });

      this.stats.created++;

      logger.debug('JWT token created', {
        userId: payload.userId,
        expiresIn: options.expiresIn || this.expiresIn,
      });

      return token;
    } catch (error) {
      this.stats.failed++;
      throw new AuthenticationError('Token creation failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Create refresh token
   */
  createRefreshToken(payload = {}, options = {}) {
    try {
      const jwt = require('jsonwebtoken');

      const tokenPayload = {
        ...payload,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
      };

      const token = jwt.sign(tokenPayload, this.refreshSecret, {
        expiresIn: options.expiresIn || this.refreshExpiresIn,
        algorithm: this.algorithm,
      });

      logger.debug('Refresh token created', {
        userId: payload.userId,
      });

      return token;
    } catch (error) {
      this.stats.failed++;
      throw new AuthenticationError('Refresh token creation failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const jwt = require('jsonwebtoken');

      const decoded = jwt.verify(token, this.secret, {
        algorithms: [this.algorithm],
      });

      this.stats.verified++;

      logger.debug('JWT token verified', {
        userId: decoded.userId,
      });

      return decoded;
    } catch (error) {
      this.stats.failed++;

      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Token expired', {
          code: 'TOKEN_EXPIRED',
        });
      }

      if (error.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid token', {
          code: 'INVALID_TOKEN',
        });
      }

      throw new AuthenticationError('Token verification failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      const jwt = require('jsonwebtoken');

      const decoded = jwt.verify(token, this.refreshSecret, {
        algorithms: [this.algorithm],
      });

      if (decoded.type !== 'refresh') {
        throw new AuthenticationError('Invalid refresh token type');
      }

      logger.debug('Refresh token verified', {
        userId: decoded.userId,
      });

      return decoded;
    } catch (error) {
      this.stats.failed++;

      if (error.name === 'TokenExpiredError') {
        throw new AuthenticationError('Refresh token expired', {
          code: 'REFRESH_TOKEN_EXPIRED',
        });
      }

      throw new AuthenticationError('Refresh token verification failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Decode token without verification
   */
  decodeToken(token) {
    try {
      const jwt = require('jsonwebtoken');
      return jwt.decode(token);
    } catch (error) {
      throw new AuthenticationError('Token decode failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);

      const newAccessToken = this.createToken({
        userId: decoded.userId,
        role: decoded.role,
        email: decoded.email,
      });

      this.stats.refreshed++;

      logger.info('Access token refreshed', {
        userId: decoded.userId,
      });

      return newAccessToken;
    } catch (error) {
      this.stats.failed++;
      throw error;
    }
  }

  /**
   * Create token pair
   */
  createTokenPair(payload = {}) {
    const accessToken = this.createToken(payload);
    const refreshToken = this.createRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.expiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) {
        return null;
      }

      const expirationMs = decoded.exp * 1000;
      const now = Date.now();
      const expiresIn = expirationMs - now;

      return {
        expiresAt: new Date(expirationMs),
        expiresIn,
        expired: expiresIn <= 0,
      };
    } catch (error) {
      throw new AuthenticationError('Failed to get token expiration', {
        originalError: error.message,
      });
    }
  }

  /**
   * Is token expired
   */
  isTokenExpired(token) {
    try {
      const expiration = this.getTokenExpiration(token);
      return expiration.expired;
    } catch {
      return true;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      created: this.stats.created,
      verified: this.stats.verified,
      refreshed: this.stats.refreshed,
      failed: this.stats.failed,
    };
  }
}

export default {
  JWTManager,
};
