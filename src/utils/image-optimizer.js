/**
 * Image Optimizer
 * Image resizing, compression, and optimization
 */

import { logger } from './logger';
import { FileError } from './errors';

/**
 * Image optimizer
 */
export class ImageOptimizer {
  constructor(options = {}) {
    this.quality = options.quality || 80;
    this.formats = options.formats || ['webp', 'jpeg'];
    this.stats = {
      optimized: 0,
      resized: 0,
      converted: 0,
      originalSize: 0,
      optimizedSize: 0,
    };
  }

  /**
   * Optimize image
   */
  async optimize(inputPath, outputPath, options = {}) {
    try {
      const sharp = await import('sharp');
      let transformer = sharp(inputPath);

      // Resize if dimensions provided
      if (options.width || options.height) {
        transformer = transformer.resize(options.width, options.height, {
          fit: options.fit || 'cover',
          position: options.position || 'center',
        });
        this.stats.resized++;
      }

      // Set quality
      const quality = options.quality || this.quality;

      // Convert to format
      const format = options.format || 'webp';
      if (format === 'webp') {
        transformer = transformer.webp({ quality });
      } else if (format === 'jpeg') {
        transformer = transformer.jpeg({ quality });
      } else if (format === 'png') {
        transformer = transformer.png();
      }

      // Save optimized image
      await transformer.toFile(outputPath);

      this.stats.optimized++;
      this.stats.converted++;

      logger.info('Image optimized', {
        inputPath,
        outputPath,
        format,
        quality,
      });

      return {
        inputPath,
        outputPath,
        format,
        quality,
        optimizedAt: new Date(),
      };
    } catch (error) {
      throw new FileError('Image optimization failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Generate thumbnails
   */
  async generateThumbnails(inputPath, outputDir, sizes = []) {
    try {
      const sharp = await import('sharp');
      const path = await import('path');
      const fs = await import('fs').then(m => m.promises);

      // Create output directory
      await fs.mkdir(outputDir, { recursive: true });

      const defaultSizes = sizes.length > 0 ? sizes : [
        { name: 'thumb-sm', width: 100, height: 100 },
        { name: 'thumb-md', width: 250, height: 250 },
        { name: 'thumb-lg', width: 500, height: 500 },
      ];

      const thumbnails = [];

      for (const size of defaultSizes) {
        const filename = `${size.name}.webp`;
        const outputPath = path.join(outputDir, filename);

        await sharp(inputPath)
          .resize(size.width, size.height, { fit: 'cover' })
          .webp({ quality: this.quality })
          .toFile(outputPath);

        thumbnails.push({
          name: size.name,
          path: outputPath,
          width: size.width,
          height: size.height,
        });
      }

      logger.info('Thumbnails generated', {
        inputPath,
        count: thumbnails.length,
      });

      return thumbnails;
    } catch (error) {
      throw new FileError('Thumbnail generation failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(imagePath) {
    try {
      const sharp = await import('sharp');
      const metadata = await sharp(imagePath).metadata();

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        colorspace: metadata.space,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
      };
    } catch (error) {
      throw new FileError('Failed to get image metadata', {
        originalError: error.message,
      });
    }
  }

  /**
   * Crop image
   */
  async crop(inputPath, outputPath, options = {}) {
    try {
      const sharp = await import('sharp');

      const {
        left = 0,
        top = 0,
        width,
        height,
      } = options;

      if (!width || !height) {
        throw new FileError('Width and height are required for crop');
      }

      await sharp(inputPath)
        .extract({ left, top, width, height })
        .toFile(outputPath);

      logger.info('Image cropped', {
        inputPath,
        outputPath,
        left,
        top,
        width,
        height,
      });

      return {
        inputPath,
        outputPath,
        left,
        top,
        width,
        height,
      };
    } catch (error) {
      throw new FileError('Image crop failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Apply filter
   */
  async applyFilter(inputPath, outputPath, filterType = 'grayscale') {
    try {
      const sharp = await import('sharp');
      let transformer = sharp(inputPath);

      switch (filterType) {
        case 'grayscale':
          transformer = transformer.grayscale();
          break;
        case 'blur':
          transformer = transformer.blur(5);
          break;
        case 'sharpen':
          transformer = transformer.sharpen();
          break;
        case 'negate':
          transformer = transformer.negate();
          break;
        default:
          throw new FileError(`Unknown filter: ${filterType}`);
      }

      await transformer.toFile(outputPath);

      logger.info('Filter applied', {
        inputPath,
        outputPath,
        filterType,
      });

      return {
        inputPath,
        outputPath,
        filterType,
      };
    } catch (error) {
      throw new FileError('Filter application failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Resize image
   */
  async resize(inputPath, outputPath, width, height, options = {}) {
    try {
      const sharp = await import('sharp');

      await sharp(inputPath)
        .resize(width, height, {
          fit: options.fit || 'cover',
          position: options.position || 'center',
        })
        .toFile(outputPath);

      this.stats.resized++;

      logger.info('Image resized', {
        inputPath,
        outputPath,
        width,
        height,
      });

      return {
        inputPath,
        outputPath,
        width,
        height,
      };
    } catch (error) {
      throw new FileError('Image resize failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Convert image format
   */
  async convert(inputPath, outputPath, format = 'webp', quality = null) {
    try {
      const sharp = await import('sharp');
      const imageQuality = quality || this.quality;
      let transformer = sharp(inputPath);

      if (format === 'webp') {
        transformer = transformer.webp({ quality: imageQuality });
      } else if (format === 'jpeg') {
        transformer = transformer.jpeg({ quality: imageQuality });
      } else if (format === 'png') {
        transformer = transformer.png();
      } else {
        throw new FileError(`Unsupported format: ${format}`);
      }

      await transformer.toFile(outputPath);

      this.stats.converted++;

      logger.info('Image converted', {
        inputPath,
        outputPath,
        format,
      });

      return {
        inputPath,
        outputPath,
        format,
      };
    } catch (error) {
      throw new FileError('Image conversion failed', {
        originalError: error.message,
      });
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      optimized: this.stats.optimized,
      resized: this.stats.resized,
      converted: this.stats.converted,
      originalSize: this.formatBytes(this.stats.originalSize),
      optimizedSize: this.formatBytes(this.stats.optimizedSize),
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

export default {
  ImageOptimizer,
};
