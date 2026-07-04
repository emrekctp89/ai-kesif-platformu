/**
 * Session Manager
 * Manages user sessions and authentication state
 */

import { logger } from './logger';
import { ValidationError, AuthenticationError } from './errors';

/**
 * Session manager
 */
export class SessionManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.sessionTimeout = options.sessionTimeout || 30 * 60 * 1000; // 30 minutes
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute
    this.maxSessions = options.maxSessions || 10; // Max sessions per user
    this.stats = {
      created: 0,
      destroyed: 0,
      expired: 0,
      active: 0,
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Create session
   */
  createSession(userId, data = {}) {
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      userId,
      data,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + this.sessionTimeout),
      active: true,
      device: data.device || null,
      ipAddress: data.ipAddress || null,
    };

    // Check max sessions per user
    const userSessions = this.getUserSessions(userId);
    if (userSessions.length >= this.maxSessions) {
      const oldest = userSessions.sort((a, b) => a.createdAt - b.createdAt)[0];
      this.destroySession(oldest.id);
    }

    this.sessions.set(sessionId, session);
    this.stats.created++;
    this.stats.active = this.sessions.size;

    logger.info('Session created', {
      sessionId,
      userId,
      expiresIn: this.sessionTimeout,
    });

    return session;
  }

  /**
   * Get session
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      this.destroySession(sessionId);
      this.stats.expired++;
      return null;
    }

    // Update last activity
    session.lastActivityAt = new Date();

    return session;
  }

  /**
   * Validate session
   */
  validateSession(sessionId, userId) {
    const session = this.getSession(sessionId);

    if (!session) {
      throw new AuthenticationError('Session not found or expired', {
        code: 'SESSION_NOT_FOUND',
      });
    }

    if (session.userId !== userId) {
      throw new AuthenticationError('Session user mismatch', {
        code: 'SESSION_USER_MISMATCH',
      });
    }

    if (!session.active) {
      throw new AuthenticationError('Session is not active', {
        code: 'SESSION_INACTIVE',
      });
    }

    return session;
  }

  /**
   * Destroy session
   */
  destroySession(sessionId) {
    if (!this.sessions.has(sessionId)) {
      return false;
    }

    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    this.stats.destroyed++;
    this.stats.active = this.sessions.size;

    logger.info('Session destroyed', {
      sessionId,
      userId: session.userId,
    });

    return true;
  }

  /**
   * Destroy all user sessions
   */
  destroyAllUserSessions(userId) {
    const userSessions = this.getUserSessions(userId);
    const count = userSessions.length;

    userSessions.forEach((session) => {
      this.destroySession(session.id);
    });

    logger.info('All user sessions destroyed', {
      userId,
      count,
    });

    return count;
  }

  /**
   * Get user sessions
   */
  getUserSessions(userId) {
    return Array.from(this.sessions.values()).filter(
      (session) => session.userId === userId && session.active
    );
  }

  /**
   * Update session data
   */
  updateSessionData(sessionId, data) {
    const session = this.getSession(sessionId);

    if (!session) {
      throw new AuthenticationError('Session not found');
    }

    session.data = { ...session.data, ...data };

    logger.debug('Session data updated', { sessionId });

    return session;
  }

  /**
   * Extend session
   */
  extendSession(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      throw new AuthenticationError('Session not found');
    }

    session.expiresAt = new Date(Date.now() + this.sessionTimeout);

    logger.debug('Session extended', {
      sessionId,
      newExpiresAt: session.expiresAt,
    });

    return session;
  }

  /**
   * Invalidate session
   */
  invalidateSession(sessionId) {
    const session = this.getSession(sessionId);

    if (!session) {
      return false;
    }

    session.active = false;

    logger.info('Session invalidated', { sessionId });

    return true;
  }

  /**
   * Get all sessions
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanupInterval() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
  }

  /**
   * Cleanup expired sessions
   */
  cleanup() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
        this.stats.expired++;
      }
    }

    this.stats.active = this.sessions.size;

    if (cleanedCount > 0) {
      logger.debug('Sessions cleaned up', { cleanedCount });
    }
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      created: this.stats.created,
      destroyed: this.stats.destroyed,
      expired: this.stats.expired,
      active: this.stats.active,
      totalSessions: this.sessions.size,
    };
  }

  /**
   * Destroy manager
   */
  destroy() {
    this.stopCleanupInterval();
    this.sessions.clear();
    logger.info('Session manager destroyed');
  }
}

/**
 * Global session manager instance
 */
export const globalSessionManager = new SessionManager();

export default {
  SessionManager,
  globalSessionManager,
};
