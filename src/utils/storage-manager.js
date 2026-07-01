/**
 * Storage Manager
 * Handles local and cloud storage (S3, etc.)
 */

import { logger } from './logger';
import { FileError } from './errors';

/**
 * Storage manager
 */
export class StorageManager {
  constructor(options = {}) {
    this.storageType = options.storageType || 'local'; // 'local' or 's3'
    this.config = options.config || {};
    this.stats = {
      uploaded: 0,
      downloaded: 0,
      deleted: 0,
      errors: 0,
    };

    if (this.storageType === 's3') {
      this.initializeS3();
    }
  }

  /**
   * Initialize S3 client
   */
  initializeS3() {
    try {
      const AWS = require('aws-sdk');
      this.s3 = new AWS.S3({
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        region: this.config.region || 'us-east-1',
      });
      this.bucket = this.config.bucket;
      logger.info('S3 client initialized', { bucket: this.bucket });
    } catch (error) {
      logger.error('Failed to initialize S3', { error: error.message });
      throw new FileError('S3 initialization failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Upload file
   */
  async upload(filepath, key, metadata = {}) {
    try {
      if (this.storageType === 'local') {
        return await this.uploadLocal(filepath, key);
      } else if (this.storageType === 's3') {
        return await this.uploadS3(filepath, key, metadata);
      }
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Upload to local storage
   */
  async uploadLocal(filepath, key) {
    try {
      const fs = await import('fs').then(m => m.promises);
      const path = await import('path');

      const data = await fs.readFile(filepath);
      const destDir = path.dirname(key);

      // Create directories if needed
      await fs.mkdir(destDir, { recursive: true });
      await fs.writeFile(key, data);

      this.stats.uploaded++;

      logger.info('File uploaded to local storage', { key });

      return {
        type: 'local',
        key,
        url: `file://${key}`,
        uploadedAt: new Date(),
      };
    } catch (error) {
      throw new FileError('Local upload failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Upload to S3
   */
  async uploadS3(filepath, key, metadata = {}) {
    try {
      const fs = await import('fs').then(m => m.promises);

      const data = await fs.readFile(filepath);

      const params = {
        Bucket: this.bucket,
        Key: key,
        Body: data,
        Metadata: metadata,
      };

      return new Promise((resolve, reject) => {
        this.s3.upload(params, (err, data) => {
          if (err) {
            this.stats.errors++;
            reject(new FileError('S3 upload failed', {
              originalError: err.message,
            }));
          } else {
            this.stats.uploaded++;
            logger.info('File uploaded to S3', { key, location: data.Location });
            resolve({
              type: 's3',
              key,
              url: data.Location,
              etag: data.ETag,
              uploadedAt: new Date(),
            });
          }
        });
      });
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Download file
   */
  async download(key) {
    try {
      if (this.storageType === 'local') {
        return await this.downloadLocal(key);
      } else if (this.storageType === 's3') {
        return await this.downloadS3(key);
      }
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Download from local storage
   */
  async downloadLocal(key) {
    try {
      const fs = await import('fs').then(m => m.promises);
      const data = await fs.readFile(key);

      this.stats.downloaded++;

      logger.info('File downloaded from local storage', { key });

      return {
        type: 'local',
        key,
        data,
        downloadedAt: new Date(),
      };
    } catch (error) {
      throw new FileError('Local download failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Download from S3
   */
  async downloadS3(key) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
      };

      return new Promise((resolve, reject) => {
        this.s3.getObject(params, (err, data) => {
          if (err) {
            this.stats.errors++;
            reject(new FileError('S3 download failed', {
              originalError: err.message,
            }));
          } else {
            this.stats.downloaded++;
            logger.info('File downloaded from S3', { key });
            resolve({
              type: 's3',
              key,
              data: data.Body,
              downloadedAt: new Date(),
            });
          }
        });
      });
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Delete file
   */
  async delete(key) {
    try {
      if (this.storageType === 'local') {
        return await this.deleteLocal(key);
      } else if (this.storageType === 's3') {
        return await this.deleteS3(key);
      }
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Delete from local storage
   */
  async deleteLocal(key) {
    try {
      const fs = await import('fs').then(m => m.promises);
      await fs.unlink(key);

      this.stats.deleted++;

      logger.info('File deleted from local storage', { key });

      return { type: 'local', key, deletedAt: new Date() };
    } catch (error) {
      throw new FileError('Local delete failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Delete from S3
   */
  async deleteS3(key) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
      };

      return new Promise((resolve, reject) => {
        this.s3.deleteObject(params, (err) => {
          if (err) {
            this.stats.errors++;
            reject(new FileError('S3 delete failed', {
              originalError: err.message,
            }));
          } else {
            this.stats.deleted++;
            logger.info('File deleted from S3', { key });
            resolve({ type: 's3', key, deletedAt: new Date() });
          }
        });
      });
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * List files
   */
  async list(prefix = '') {
    try {
      if (this.storageType === 'local') {
        return await this.listLocal(prefix);
      } else if (this.storageType === 's3') {
        return await this.listS3(prefix);
      }
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * List local files
   */
  async listLocal(prefix = '') {
    try {
      const fs = await import('fs').then(m => m.promises);
      const files = await fs.readdir(prefix);
      return { type: 'local', files, prefix };
    } catch (error) {
      throw new FileError('Local list failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * List S3 files
   */
  async listS3(prefix = '') {
    try {
      const params = {
        Bucket: this.bucket,
        Prefix: prefix,
      };

      return new Promise((resolve, reject) => {
        this.s3.listObjectsV2(params, (err, data) => {
          if (err) {
            reject(new FileError('S3 list failed', {
              originalError: err.message,
            }));
          } else {
            resolve({
              type: 's3',
              files: data.Contents || [],
              prefix,
            });
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get file stats
   */
  getStats() {
    return {
      storageType: this.storageType,
      uploaded: this.stats.uploaded,
      downloaded: this.stats.downloaded,
      deleted: this.stats.deleted,
      errors: this.stats.errors,
    };
  }
}

export default {
  StorageManager,
};
