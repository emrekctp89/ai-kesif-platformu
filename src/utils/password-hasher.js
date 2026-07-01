/**
 * Password Hasher
 * Secure password hashing and verification
 */

import { logger } from './logger';
import { ValidationError, AuthenticationError } from './errors';

/**
 * Password hasher
 */
export class PasswordHasher {
  constructor(options = {}) {
    this.saltRounds = options.saltRounds || 10;
    this.stats = {
      hashed: 0,
      verified: 0,
      failed: 0,
    };
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    try {
      if (!password || typeof password !== 'string') {
        throw new ValidationError('Password must be a non-empty string');
      }

      if (password.length < 6) {
        throw new ValidationError('Password must be at least 6 characters long');
      }

      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash(password, this.saltRounds);

      this.stats.hashed++;

      logger.debug('Password hashed');

      return hash;
    } catch (error) {
      this.stats.failed++;

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new AuthenticationError('Password hashing failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    try {
      if (!password || !hash) {
        throw new ValidationError('Password and hash are required');
      }

      const bcrypt = require('bcrypt');
      const isValid = await bcrypt.compare(password, hash);

      this.stats.verified++;

      if (!isValid) {
        logger.warn('Password verification failed - invalid password');
      }

      return isValid;
    } catch (error) {
      this.stats.failed++;

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new AuthenticationError('Password verification failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Generate random password
   */
  generatePassword(length = 12) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return password;
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const strength = Object.values(checks).filter(Boolean).length;

    return {
      valid: strength >= 3,
      strength: strength > 4 ? 'strong' : strength > 2 ? 'medium' : 'weak',
      checks,
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      hashed: this.stats.hashed,
      verified: this.stats.verified,
      failed: this.stats.failed,
    };
  }
}

export default {
  PasswordHasher,
};
