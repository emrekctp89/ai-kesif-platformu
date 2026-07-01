/**
 * Middleware Setup
 * Configure and register middleware
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { logger } from '../utils/logger';

/**
 * Setup middleware
 */
export function setupMiddleware(app, options = {}) {
  // Security middleware
  if (options.security !== false) {
    app.use(helmet());
    logger.debug('Helmet security middleware enabled');
  }

  // CORS middleware
  if (options.cors !== false) {
    const corsOptions = options.corsOptions || {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
    app.use(cors(corsOptions));
    logger.debug('CORS middleware enabled');
  }

  // Compression middleware
  if (options.compression !== false) {
    app.use(compression());
    logger.debug('Compression middleware enabled');
  }

  // Body parser middleware
  if (options.bodyParser !== false) {
    const limit = options.bodyParserLimit || '10mb';
    app.use(express.json({ limit }));
    app.use(express.urlencoded({ limit, extended: true }));
    logger.debug('Body parser middleware enabled');
  }

  // Logging middleware
  if (options.logging !== false) {
    app.use((req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.debug('HTTP request', {
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration: `${duration}ms`,
        });
      });

      next();
    });
    logger.debug('Logging middleware enabled');
  }

  // Request ID middleware
  if (options.requestId !== false) {
    app.use((req, res, next) => {
      req.id = req.headers['x-request-id'] || `${Date.now()}-${Math.random()}`;
      res.setHeader('X-Request-ID', req.id);
      next();
    });
    logger.debug('Request ID middleware enabled');
  }

  // Custom middleware
  if (options.custom && Array.isArray(options.custom)) {
    options.custom.forEach((middleware) => {
      app.use(middleware);
    });
    logger.debug('Custom middleware enabled');
  }
}

/**
 * Setup authentication middleware
 */
export function setupAuthMiddleware(app, authMiddleware, options = {}) {
  if (!authMiddleware) {
    logger.warn('No authentication middleware provided');
    return;
  }

  app.use(authMiddleware);
  logger.debug('Authentication middleware enabled');
}

/**
 * Setup error handling middleware (should be last)
 */
export function setupErrorMiddleware(app, errorHandler) {
  if (!errorHandler) {
    logger.warn('No error handler provided');
    return;
  }

  app.use(errorHandler);
  logger.debug('Error handling middleware enabled');
}

/**
 * Setup 404 middleware
 */
export function setup404Middleware(app) {
  app.use((req, res) => {
    logger.warn('Route not found', {
      method: req.method,
      path: req.path,
    });

    res.status(404).json({
      error: {
        message: 'Route not found',
        code: 'NOT_FOUND',
        statusCode: 404,
        path: req.path,
        method: req.method,
      },
    });
  });
}

export default {
  setupMiddleware,
  setupAuthMiddleware,
  setupErrorMiddleware,
  setup404Middleware,
};
