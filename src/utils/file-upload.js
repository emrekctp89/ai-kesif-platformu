/**
 * File Upload Handler
 * Handles multipart form data and file uploads with validation
 */

import { logger } from './logger';
import { ValidationError, FileError } from './errors';

/**
 * File upload handler
 */
export class FileUploadHandler {
  constructor(options = {}) {
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB
    this.maxFiles = options.maxFiles || 10;
    this.uploadDir = options.uploadDir || './uploads';
    this.allowedMimeTypes = options.allowedMimeTypes || [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
    ];
    this.stats = {
      uploaded: 0,
      failed: 0,
      totalSize: 0,
    };
  }

  /**
   * Handle file upload
   */
  async handleUpload(files, options = {}) {
    if (!files) {
      throw new FileError('No files provided');
    }

    const fileArray = Array.isArray(files) ? files : [files];

    if (fileArray.length > this.maxFiles) {
      throw new ValidationError(`Maximum ${this.maxFiles} files allowed`);
    }

    const uploadedFiles = [];

    for (const file of fileArray) {
      try {
        const result = await this.uploadFile(file, options);
        uploadedFiles.push(result);
        this.stats.uploaded++;
        this.stats.totalSize += file.size;
      } catch (error) {
        this.stats.failed++;
        logger.error('File upload failed', {
          filename: file.name,
          error: error.message,
        });

        if (options.stopOnError) {
          throw error;
        }
      }
    }

    return uploadedFiles;
  }

  /**
   * Upload single file
   */
  async uploadFile(file, options = {}) {
    // Validate file
    this.validateFile(file);

    // Generate unique filename
    const filename = this.generateFilename(file.name);
    const filepath = `${this.uploadDir}/${filename}`;

    try {
      const fs = await import('fs').then((m) => m.promises);

      // Ensure upload directory exists
      await fs.mkdir(this.uploadDir, { recursive: true });

      // Save file
      await fs.writeFile(filepath, file.data);

      logger.info('File uploaded', {
        filename,
        size: file.size,
        mimetype: file.mimetype,
      });

      return {
        originalName: file.name,
        filename,
        filepath,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date(),
      };
    } catch (error) {
      throw new FileError('Failed to save file', {
        originalError: error.message,
      });
    }
  }

  /**
   * Validate file
   */
  validateFile(file) {
    if (!file) {
      throw new FileError('File is required');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new ValidationError(
        `File size exceeds maximum of ${this.formatBytes(this.maxFileSize)}`
      );
    }

    // Check MIME type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`
      );
    }

    return true;
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = originalName.split('.').pop();
    return `${timestamp}-${random}.${extension}`;
  }

  /**
   * Delete file
   */
  async deleteFile(filepath) {
    try {
      const fs = await import('fs').then((m) => m.promises);
      await fs.unlink(filepath);

      logger.info('File deleted', { filepath });
      return true;
    } catch (error) {
      logger.error('Failed to delete file', {
        filepath,
        error: error.message,
      });
      return false;
    }
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

  /**
   * Get statistics
   */
  getStats() {
    return {
      uploaded: this.stats.uploaded,
      failed: this.stats.failed,
      totalSize: this.formatBytes(this.stats.totalSize),
    };
  }
}

/**
 * File validator
 */
export class FileValidator {
  /**
   * Validate file extension
   */
  static validateExtension(filename, allowedExtensions) {
    const ext = filename.split('.').pop().toLowerCase();
    return allowedExtensions.includes(ext);
  }

  /**
   * Validate file size
   */
  static validateSize(fileSize, maxSize) {
    return fileSize <= maxSize;
  }

  /**
   * Validate MIME type
   */
  static validateMimeType(mimeType, allowedTypes) {
    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate image dimensions
   */
  static async validateImageDimensions(filepath, minWidth, minHeight, maxWidth, maxHeight) {
    try {
      const sharp = await import('sharp');
      const metadata = await sharp(filepath).metadata();

      const { width, height } = metadata;

      if (width < minWidth || height < minHeight) {
        throw new ValidationError(
          `Image dimensions (${width}x${height}) are smaller than minimum (${minWidth}x${minHeight})`
        );
      }

      if (width > maxWidth || height > maxHeight) {
        throw new ValidationError(
          `Image dimensions (${width}x${height}) exceed maximum (${maxWidth}x${maxHeight})`
        );
      }

      return true;
    } catch (error) {
      throw new FileError('Failed to validate image dimensions', {
        originalError: error.message,
      });
    }
  }
}

export default {
  FileUploadHandler,
  FileValidator,
};
