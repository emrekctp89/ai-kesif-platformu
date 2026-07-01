/**
 * Cache Manager
 * Multi-level caching with TTL and LRU eviction
 */

import { logger } from './logger';

/**
 * Memory cache with LRU eviction
 */
export class MemoryCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 3600000; // 1 hour
    this.cache = new Map();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
    };
  }

  /**
   * Get value from cache
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = this.defaultTTL) {
    // Remove old entry if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }

    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Store new entry
    this.cache.set(key, {
      value,
      expiresAt: ttl ? Date.now() + ttl : null,
      createdAt: Date.now(),
    });

    this.accessOrder.push(key);
    this.stats.sets++;

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.removeFromAccessOrder(key);
    return deleted;
  }

  /**
   * Check if key exists
   */
  has(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.accessOrder = [];
    logger.debug('Memory cache cleared', { size });
  }

  /**
   * Update access order for LRU
   */
  updateAccessOrder(key) {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder.shift();
    this.cache.delete(lruKey);
    this.stats.evictions++;

    logger.debug('LRU eviction', { key: lruKey });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: `${hitRate}%`,
      evictions: this.stats.evictions,
      sets: this.stats.sets,
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('Cache cleanup', { removed });
    }

    return removed;
  }
}

/**
 * Cache manager with multiple backends
 */
export class CacheManager {
  constructor(options = {}) {
    this.options = options;
    this.memoryCache = new MemoryCache(options.memory || {});
    this.redisClient = options.redis || null;
    this.cacheLayers = options.cacheLayers || ['memory', 'redis'];
  }

  /**
   * Get value from cache layers
   */
  async get(key) {
    // Try memory cache first
    if (this.cacheLayers.includes('memory')) {
      const value = this.memoryCache.get(key);
      if (value !== null) {
        return value;
      }
    }

    // Try Redis
    if (this.cacheLayers.includes('redis') && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        if (value !== null) {
          // Store in memory cache
          this.memoryCache.set(key, value);
          return value;
        }
      } catch (error) {
        logger.warn('Redis get error', { key, error: error.message });
      }
    }

    return null;
  }

  /**
   * Set value in cache layers
   */
  async set(key, value, ttl) {
    // Set in memory cache
    if (this.cacheLayers.includes('memory')) {
      this.memoryCache.set(key, value, ttl);
    }

    // Set in Redis
    if (this.cacheLayers.includes('redis') && this.redisClient) {
      try {
        await this.redisClient.set(key, value, ttl);
      } catch (error) {
        logger.warn('Redis set error', { key, error: error.message });
      }
    }

    return true;
  }

  /**
   * Delete key from all cache layers
   */
  async delete(key) {
    // Delete from memory
    if (this.cacheLayers.includes('memory')) {
      this.memoryCache.delete(key);
    }

    // Delete from Redis
    if (this.cacheLayers.includes('redis') && this.redisClient) {
      try {
        await this.redisClient.delete(key);
      } catch (error) {
        logger.warn('Redis delete error', { key, error: error.message });
      }
    }

    return true;
  }

  /**
   * Clear all caches
   */
  async clear(pattern = null) {
    if (this.cacheLayers.includes('memory')) {
      this.memoryCache.clear();
    }

    if (this.cacheLayers.includes('redis') && this.redisClient) {
      try {
        await this.redisClient.clear(pattern);
      } catch (error) {
        logger.warn('Redis clear error', { error: error.message });
      }
    }

    return true;
  }

  /**
   * Get with callback (load if not cached)
   */
  async getOrSet(key, fn, ttl) {
    // Check cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Load value
    const value = await fn();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Get multiple values
   */
  async mget(keys) {
    const result = {};

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Set multiple values
   */
  async mset(data, ttl) {
    for (const [key, value] of Object.entries(data)) {
      await this.set(key, value, ttl);
    }

    return true;
  }

  /**
   * Increment value
   */
  async increment(key, amount = 1) {
    const current = await this.get(key);
    const newValue = (current ? parseInt(current) : 0) + amount;

    await this.set(key, newValue);

    return newValue;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      redis: this.redisClient?.getStats?.() || null,
    };
  }

  /**
   * Cleanup expired entries
   */
  async cleanup() {
    const stats = {
      memory: 0,
      redis: 0,
    };

    if (this.cacheLayers.includes('memory')) {
      stats.memory = this.memoryCache.cleanup();
    }

    if (this.cacheLayers.includes('redis') && this.redisClient) {
      try {
        stats.redis = await this.redisClient.cleanup?.() || 0;
      } catch (error) {
        logger.warn('Redis cleanup error', { error: error.message });
      }
    }

    return stats;
  }
}

/**
 * Cache key builder
 */
export class CacheKeyBuilder {
  /**
   * Build cache key
   */
  static build(namespace, ...parts) {
    return `${namespace}:${parts.join(':')}`;
  }

  /**
   * Build pattern for wildcard matching
   */
  static pattern(namespace, ...parts) {
    const key = this.build(namespace, ...parts);
    return `${key}:*`;
  }
}

/**
 * Cache decorators
 */
export function withCache(key, ttl = 3600000) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const cacheKey = typeof key === 'function' ? key(...args) : key;

      // Try cache
      const cached = await this.cache?.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await this.cache?.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

export default {
  MemoryCache,
  CacheManager,
  CacheKeyBuilder,
  withCache,
};
