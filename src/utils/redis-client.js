/**
 * Redis Client Wrapper
 * Simplified Redis client with connection pooling and error handling
 */

import { logger } from './logger';
import { DatabaseError } from './errors';

/**
 * Redis client wrapper
 */
export class RedisClient {
  constructor(options = {}) {
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 6379,
      db: options.db || 0,
      password: options.password || null,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      keyPrefix: options.keyPrefix || '',
      defaultTTL: options.defaultTTL || null,
      ...options,
    };

    this.client = null;
    this.isConnected = false;
    this.stats = {
      commands: 0,
      errors: 0,
      hits: 0,
      misses: 0,
    };
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (this.isConnected) {
      return;
    }

    try {
      // Import Redis dynamically
      const redis = await import('redis');
      const client = redis.createClient({
        socket: {
          host: this.options.host,
          port: this.options.port,
        },
        password: this.options.password,
        db: this.options.db,
      });

      client.on('error', (err) => {
        logger.error('Redis error', { error: err.message });
        this.stats.errors++;
      });

      await client.connect();
      this.client = client;
      this.isConnected = true;

      logger.info('Connected to Redis', {
        host: this.options.host,
        port: this.options.port,
      });
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error.message,
      });
      throw new DatabaseError('Redis connection failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Get value
   */
  async get(key) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const fullKey = this.getFullKey(key);
      const value = await this.client.get(fullKey);

      if (value) {
        this.stats.hits++;
        return this.deserialize(value);
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      logger.error('Redis get error', { key, error: error.message });
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Set value
   */
  async set(key, value, ttl = this.options.defaultTTL) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const fullKey = this.getFullKey(key);
      const serialized = this.serialize(value);

      const options = {};
      if (ttl) {
        options.EX = Math.ceil(ttl / 1000); // Convert to seconds
      }

      await this.client.set(fullKey, serialized, options);
      this.stats.commands++;

      return true;
    } catch (error) {
      logger.error('Redis set error', { key, error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete key
   */
  async delete(key) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.del(fullKey);
      this.stats.commands++;
      return result > 0;
    } catch (error) {
      logger.error('Redis delete error', { key, error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const fullKeys = keys.map(k => this.getFullKey(k));
      const result = await this.client.del(fullKeys);
      this.stats.commands++;
      return result;
    } catch (error) {
      logger.error('Redis deleteMany error', { error: error.message });
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.exists(fullKey);
      this.stats.commands++;
      return result > 0;
    } catch (error) {
      logger.error('Redis exists error', { key, error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Increment value
   */
  async increment(key, amount = 1) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.incrBy(fullKey, amount);
      this.stats.commands++;
      return result;
    } catch (error) {
      logger.error('Redis increment error', { key, error: error.message });
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Get multiple values
   */
  async mget(keys) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const fullKeys = keys.map(k => this.getFullKey(k));
      const values = await this.client.mGet(fullKeys);
      this.stats.commands++;

      const result = {};
      keys.forEach((key, index) => {
        if (values[index]) {
          result[key] = this.deserialize(values[index]);
        }
      });

      return result;
    } catch (error) {
      logger.error('Redis mget error', { error: error.message });
      this.stats.errors++;
      return {};
    }
  }

  /**
   * Set multiple values
   */
  async mset(data, ttl = this.options.defaultTTL) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      for (const [key, value] of Object.entries(data)) {
        await this.set(key, value, ttl);
      }
      return true;
    } catch (error) {
      logger.error('Redis mset error', { error: error.message });
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear(pattern = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      if (pattern) {
        const fullPattern = this.getFullKey(pattern);
        const keys = await this.client.keys(fullPattern);
        if (keys.length > 0) {
          await this.client.del(keys);
        }
        return keys.length;
      } else {
        await this.client.flushDb();
        return 0;
      }
    } catch (error) {
      logger.error('Redis clear error', { error: error.message });
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get full key with prefix
   */
  getFullKey(key) {
    return this.options.keyPrefix ? `${this.options.keyPrefix}:${key}` : key;
  }

  /**
   * Serialize value
   */
  serialize(value) {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  /**
   * Deserialize value
   */
  deserialize(value) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      connected: this.isConnected,
      commands: this.stats.commands,
      errors: this.stats.errors,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
        : 0,
    };
  }

  /**
   * Disconnect
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Disconnected from Redis');
    }
  }

  /**
   * Health check
   */
  async ping() {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping error', { error: error.message });
      return false;
    }
  }
}

/**
 * Redis connection pool
 */
export class RedisPool {
  constructor(options = {}) {
    this.options = options;
    this.clients = [];
    this.availableClients = [];
    this.maxClients = options.maxClients || 5;
  }

  /**
   * Get client from pool
   */
  async getClient() {
    if (this.availableClients.length > 0) {
      return this.availableClients.pop();
    }

    if (this.clients.length < this.maxClients) {
      const client = new RedisClient(this.options);
      await client.connect();
      this.clients.push(client);
      return client;
    }

    // Wait for available client
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if (this.availableClients.length > 0) {
          clearInterval(interval);
          resolve(this.availableClients.pop());
        }
      }, 100);
    });
  }

  /**
   * Release client back to pool
   */
  releaseClient(client) {
    this.availableClients.push(client);
  }

  /**
   * Close all connections
   */
  async close() {
    for (const client of this.clients) {
      await client.disconnect();
    }
    this.clients = [];
    this.availableClients = [];
  }
}

export default {
  RedisClient,
  RedisPool,
};
