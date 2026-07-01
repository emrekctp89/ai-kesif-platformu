/**
 * Health Check Route
 * Application health and status endpoints
 */

import { asyncHandler } from '../middleware/error-middleware';
import { checkDatabaseHealth } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Health check controller
 */
export const healthCheck = asyncHandler(async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
    };

    res.status(200).json({
      success: true,
      data: health,
      message: 'Health check passed',
    });

    logger.debug('Health check passed');
  } catch (error) {
    logger.error('Health check failed', {
      error: error.message,
    });

    res.status(503).json({
      error: {
        message: 'Health check failed',
        code: 'HEALTH_CHECK_FAILED',
        statusCode: 503,
      },
    });
  }
});

/**
 * API info endpoint
 */
export const apiInfo = asyncHandler(async (req, res) => {
  const info = {
    name: process.env.APP_NAME || 'AI Kesif Platformu',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  };

  res.status(200).json({
    success: true,
    data: info,
    message: 'API info retrieved',
  });

  logger.debug('API info requested');
});

export default {
  healthCheck,
  apiInfo,
};
