/**
 * Compression Utilities
 * Data compression and decompression with multiple algorithms
 */

import { logger } from './logger';

/**
 * Compression manager
 */
export class CompressionManager {
  constructor(options = {}) {
    this.algorithm = options.algorithm || 'gzip';
    this.compressionLevel = options.compressionLevel || 6;
    this.minSize = options.minSize || 1024; // Only compress if > 1KB
    this.stats = {
      compressed: 0,
      decompressed: 0,
      originalSize: 0,
      compressedSize: 0,
    };
  }

  /**
   * Compress data
   */
  async compress(data) {
    if (!data) {
      return null;
    }

    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);

      const buffer = Buffer.from(serialized, 'utf-8');

      // Only compress if size exceeds minimum
      if (buffer.length < this.minSize) {
        return {
          compressed: false,
          data: serialized,
        };
      }

      const zlib = await import('zlib');
      const compressed = await new Promise((resolve, reject) => {
        zlib.gzip(buffer, { level: this.compressionLevel }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      this.stats.compressed++;
      this.stats.originalSize += buffer.length;
      this.stats.compressedSize += compressed.length;

      logger.debug('Data compressed', {
        originalSize: buffer.length,
        compressedSize: compressed.length,
        ratio: ((compressed.length / buffer.length) * 100).toFixed(2) + '%',
      });

      return {
        compressed: true,
        data: compressed.toString('base64'),
        originalSize: buffer.length,
        compressedSize: compressed.length,
      };
    } catch (error) {
      logger.error('Compression error', { error: error.message });
      return {
        compressed: false,
        data: typeof data === 'string' ? data : JSON.stringify(data),
      };
    }
  }

  /**
   * Decompress data
   */
  async decompress(data) {
    if (!data) {
      return null;
    }

    try {
      // If not compressed, just parse and return
      if (typeof data === 'string' && !data.startsWith('H4sI')) {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      }

      const zlib = await import('zlib');
      const buffer = Buffer.from(data, 'base64');

      const decompressed = await new Promise((resolve, reject) => {
        zlib.gunzip(buffer, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      this.stats.decompressed++;

      const text = decompressed.toString('utf-8');

      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch (error) {
      logger.error('Decompression error', { error: error.message });
      return null;
    }
  }

  /**
   * Get compression statistics
   */
  getStats() {
    const compressionRatio =
      this.stats.compressedSize > 0
        ? ((this.stats.compressedSize / this.stats.originalSize) * 100).toFixed(2)
        : 0;

    const saved = this.stats.originalSize - this.stats.compressedSize;

    return {
      compressed: this.stats.compressed,
      decompressed: this.stats.decompressed,
      originalSize: this.formatBytes(this.stats.originalSize),
      compressedSize: this.formatBytes(this.stats.compressedSize),
      compressionRatio: compressionRatio + '%',
      spaceSaved: this.formatBytes(saved),
    };
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * Data deduplication utility
 */
export class Deduplicator {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxEntries = options.maxEntries || 10000;
  }

  /**
   * Deduplicate data
   */
  deduplicate(data) {
    const hash = this.hash(data);

    if (this.cache.has(hash)) {
      return this.cache.get(hash);
    }

    if (this.cache.size >= this.maxEntries) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(hash, data);
    return data;
  }

  /**
   * Hash function
   */
  hash(data) {
    const crypto = require('crypto');
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);

    return crypto.createHash('md5').update(serialized).digest('hex');
  }

  /**
   * Get deduplication stats
   */
  getStats() {
    return {
      cachedEntries: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }
}

/**
 * JSON compression
 */
export class JSONCompressor {
  /**
   * Compress JSON by removing unnecessary whitespace
   */
  static compress(data) {
    if (typeof data !== 'object') {
      return data;
    }

    return JSON.stringify(data);
  }

  /**
   * Compress large arrays by removing duplicates
   */
  static compressArray(array) {
    if (!Array.isArray(array)) {
      return array;
    }

    const unique = [
      ...new Set(array.map((item) => (typeof item === 'object' ? JSON.stringify(item) : item))),
    ];

    return unique.map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    });
  }

  /**
   * Compress object by removing null/undefined values
   */
  static compressObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const compressed = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        if (typeof value === 'object') {
          compressed[key] = this.compressObject(value);
        } else {
          compressed[key] = value;
        }
      }
    }

    return compressed;
  }
}

/**
 * Serialization utilities
 */
export class Serializer {
  /**
   * Serialize with compression
   */
  static async serializeWithCompression(data, compression = true) {
    const json = JSON.stringify(data);

    if (!compression) {
      return Buffer.from(json, 'utf-8').toString('base64');
    }

    const compressor = new CompressionManager();
    const result = await compressor.compress(json);

    return result.data;
  }

  /**
   * Deserialize with decompression
   */
  static async deserializeWithCompression(data, compressed = true) {
    if (!compressed) {
      const json = Buffer.from(data, 'base64').toString('utf-8');
      return JSON.parse(json);
    }

    const compressor = new CompressionManager();
    return await compressor.decompress(data);
  }

  /**
   * Estimate serialization size
   */
  static estimateSize(data) {
    const json = JSON.stringify(data);
    const bytes = Buffer.byteLength(json, 'utf-8');

    return {
      characters: json.length,
      bytes,
      kilobytes: (bytes / 1024).toFixed(2),
    };
  }
}

export default {
  CompressionManager,
  Deduplicator,
  JSONCompressor,
  Serializer,
};
