/**
 * Database Connection Pool
 * Manages database connections with pooling and health checks
 */

import { logger } from './logger';
import { DatabaseError, ConfigurationError, TimeoutError } from './errors';

/**
 * Connection pool manager
 */
export class ConnectionPool {
  constructor(options = {}) {
    this.config = {
      min: options.min || 2,
      max: options.max || 10,
      idleTimeout: options.idleTimeout || 30000,
      connectionTimeout: options.connectionTimeout || 5000,
      validationQuery: options.validationQuery || 'SELECT 1',
      ...options,
    };

    this.pool = [];
    this.activeConnections = new Set();
    this.waitingQueue = [];
    this.isInitialized = false;
    this.isClosed = false;
    this.stats = {
      created: 0,
      destroyed: 0,
      errors: 0,
    };
  }

  /**
   * Initialize pool
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create minimum connections
      const promises = [];
      for (let i = 0; i < this.config.min; i++) {
        promises.push(this.createConnection());
      }

      await Promise.all(promises);
      this.isInitialized = true;

      logger.info('Connection pool initialized', {
        minConnections: this.config.min,
        maxConnections: this.config.max,
      });
    } catch (error) {
      logger.error('Failed to initialize connection pool', {
        error: error.message,
      });
      throw new DatabaseError('Failed to initialize connection pool', {
        originalError: error.message,
      });
    }
  }

  /**
   * Create new connection
   */
  async createConnection() {
    if (this.pool.length >= this.config.max) {
      throw new DatabaseError('Connection pool is full', {
        poolSize: this.pool.length,
        maxSize: this.config.max,
      });
    }

    try {
      const connection = await this.config.createConnection();
      connection._poolId = `conn_${this.stats.created++}`;
      connection._createdAt = Date.now();
      connection._lastUsed = Date.now();

      this.pool.push(connection);

      logger.debug('Connection created', {
        poolId: connection._poolId,
        poolSize: this.pool.length,
      });

      return connection;
    } catch (error) {
      this.stats.errors++;
      throw new DatabaseError('Failed to create connection', {
        originalError: error.message,
      });
    }
  }

  /**
   * Get connection from pool
   */
  async acquire(timeout = this.config.connectionTimeout) {
    if (this.isClosed) {
      throw new DatabaseError('Connection pool is closed');
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      // Try to get available connection
      const connection = this.getAvailableConnection();
      if (connection) {
        connection._lastUsed = Date.now();
        this.activeConnections.add(connection);
        return resolve(connection);
      }

      // Create new connection if under limit
      if (this.pool.length < this.config.max) {
        this.createConnection()
          .then((conn) => {
            conn._lastUsed = Date.now();
            this.activeConnections.add(conn);
            resolve(conn);
          })
          .catch(reject);
        return;
      }

      // Queue request
      const timer = setTimeout(() => {
        const index = this.waitingQueue.indexOf(request);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new TimeoutError('Connection acquisition', timeout));
      }, timeout);

      const request = { resolve, reject, timer };
      this.waitingQueue.push(request);
    });
  }

  /**
   * Get available connection from pool
   */
  getAvailableConnection() {
    // Find idle connection
    for (const conn of this.pool) {
      if (!this.activeConnections.has(conn)) {
        return conn;
      }
    }
    return null;
  }

  /**
   * Release connection back to pool
   */
  async release(connection) {
    if (!connection) {
      return;
    }

    this.activeConnections.delete(connection);

    // Check connection health
    try {
      await this.validateConnection(connection);
      connection._lastUsed = Date.now();

      // Process waiting requests
      if (this.waitingQueue.length > 0) {
        const request = this.waitingQueue.shift();
        clearTimeout(request.timer);
        request.resolve(connection);
        this.activeConnections.add(connection);
      }
    } catch (error) {
      logger.warn('Connection validation failed during release', {
        poolId: connection._poolId,
        error: error.message,
      });

      // Remove and destroy bad connection
      this.removeConnection(connection);
    }
  }

  /**
   * Validate connection health
   */
  async validateConnection(connection) {
    try {
      await connection.query(this.config.validationQuery);
    } catch (error) {
      throw new DatabaseError('Connection validation failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Remove connection from pool
   */
  async removeConnection(connection) {
    const index = this.pool.indexOf(connection);
    if (index !== -1) {
      this.pool.splice(index, 1);
    }

    try {
      await connection.close();
      this.stats.destroyed++;

      logger.debug('Connection removed from pool', {
        poolId: connection._poolId,
        poolSize: this.pool.length,
      });
    } catch (error) {
      logger.error('Error closing connection', {
        poolId: connection._poolId,
        error: error.message,
      });
    }
  }

  /**
   * Drain idle connections
   */
  async drainIdleConnections() {
    const now = Date.now();
    const toRemove = [];

    for (const connection of this.pool) {
      if (!this.activeConnections.has(connection)) {
        if (now - connection._lastUsed > this.config.idleTimeout) {
          toRemove.push(connection);
        }
      }
    }

    for (const connection of toRemove) {
      await this.removeConnection(connection);
    }

    return toRemove.length;
  }

  /**
   * Close pool
   */
  async close() {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;

    // Wait for active connections
    const maxWait = 5000;
    const startTime = Date.now();

    while (this.activeConnections.size > 0 && Date.now() - startTime < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Close all connections
    const promises = this.pool.map((conn) => this.removeConnection(conn));
    await Promise.all(promises);

    logger.info('Connection pool closed', {
      totalConnections: this.pool.length,
      stats: this.stats,
    });
  }

  /**
   * Get pool stats
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      activeConnections: this.activeConnections.size,
      idleConnections: this.pool.length - this.activeConnections.size,
      waitingRequests: this.waitingQueue.length,
      ...this.stats,
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const stats = this.getStats();

    return {
      healthy: stats.poolSize >= this.config.min && !this.isClosed,
      poolSize: stats.poolSize,
      activeConnections: stats.activeConnections,
      idleConnections: stats.idleConnections,
      waitingRequests: stats.waitingRequests,
      errors: stats.errors,
    };
  }
}

/**
 * Database client with connection pooling
 */
export class DatabaseClient {
  constructor(options = {}) {
    this.options = options;
    this.pool = null;
  }

  /**
   * Initialize database client
   */
  async initialize() {
    if (this.pool) {
      return;
    }

    this.pool = new ConnectionPool(this.options);
    await this.pool.initialize();
  }

  /**
   * Execute query with connection from pool
   */
  async query(sql, params = []) {
    if (!this.pool) {
      await this.initialize();
    }

    const connection = await this.pool.acquire();

    try {
      return await connection.query(sql, params);
    } finally {
      await this.pool.release(connection);
    }
  }

  /**
   * Execute multiple queries as batch
   */
  async batch(queries) {
    const connection = await this.pool.acquire();

    try {
      return await Promise.all(queries.map(({ sql, params }) => connection.query(sql, params)));
    } finally {
      await this.pool.release(connection);
    }
  }

  /**
   * Get connection for transaction
   */
  async getConnection() {
    if (!this.pool) {
      await this.initialize();
    }

    return await this.pool.acquire();
  }

  /**
   * Release connection
   */
  async releaseConnection(connection) {
    if (this.pool) {
      await this.pool.release(connection);
    }
  }

  /**
   * Close database client
   */
  async close() {
    if (this.pool) {
      await this.pool.close();
    }
  }

  /**
   * Get pool stats
   */
  getStats() {
    return this.pool?.getStats() || null;
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.pool) {
      return { healthy: false, reason: 'Pool not initialized' };
    }

    return await this.pool.healthCheck();
  }
}

export default {
  ConnectionPool,
  DatabaseClient,
};
