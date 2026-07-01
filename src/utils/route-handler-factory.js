/**
 * Route Handler Factory
 * Creates standardized route handlers with error handling and validation
 */

import { logger } from './logger';
import { ValidationError, AuthenticationError, NotFoundError } from './errors';

/**
 * Route handler factory
 */
export class RouteHandlerFactory {
  constructor(options = {}) {
    this.errorHandler = options.errorHandler || this.defaultErrorHandler;
    this.validationMiddleware = options.validationMiddleware || [];
    this.stats = {
      handled: 0,
      failed: 0,
      errors: {},
    };
  }

  /**
   * Create handler
   */
  createHandler(callback, options = {}) {
    const self = this;

    return async (req, res, next) => {
      try {
        // Validation
        if (options.validate) {
          const validation = options.validate(req);
          if (!validation.valid) {
            throw new ValidationError(validation.error);
          }
        }

        // Authorization
        if (options.requireAuth && !req.user) {
          throw new AuthenticationError('Authentication required');
        }

        if (options.requireRole) {
          const roles = Array.isArray(options.requireRole) 
            ? options.requireRole 
            : [options.requireRole];
          
          if (!req.user || !roles.includes(req.user.role)) {
            throw new AuthenticationError('Insufficient permissions');
          }
        }

        // Call handler
        const result = await callback(req, res, next);

        self.stats.handled++;

        // Send response
        if (result && !res.headersSent) {
          res.json(result);
        }
      } catch (error) {
        self.stats.failed++;

        const errorType = error.constructor.name;
        self.stats.errors[errorType] = (self.stats.errors[errorType] || 0) + 1;

        logger.error('Route handler error', {
          error: error.message,
          type: errorType,
          path: req.path,
          method: req.method,
        });

        self.errorHandler(error, req, res, next);
      }
    };
  }

  /**
   * Default error handler
   */
  defaultErrorHandler(error, req, res, next) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';

    res.status(statusCode).json({
      error: {
        message,
        code: error.code || 'ERROR',
        statusCode,
      },
    });
  }

  /**
   * Create GET handler
   */
  createGetHandler(callback, options = {}) {
    return this.createHandler(async (req, res, next) => {
      return await callback(req, res, next);
    }, options);
  }

  /**
   * Create POST handler
   */
  createPostHandler(callback, options = {}) {
    return this.createHandler(async (req, res, next) => {
      return await callback(req, res, next);
    }, options);
  }

  /**
   * Create PUT handler
   */
  createPutHandler(callback, options = {}) {
    return this.createHandler(async (req, res, next) => {
      return await callback(req, res, next);
    }, options);
  }

  /**
   * Create DELETE handler
   */
  createDeleteHandler(callback, options = {}) {
    return this.createHandler(async (req, res, next) => {
      return await callback(req, res, next);
    }, options);
  }

  /**
   * Create PATCH handler
   */
  createPatchHandler(callback, options = {}) {
    return this.createHandler(async (req, res, next) => {
      return await callback(req, res, next);
    }, options);
  }

  /**
   * Create middleware
   */
  createMiddleware(callback, options = {}) {
    const self = this;

    return async (req, res, next) => {
      try {
        await callback(req, res, next);
      } catch (error) {
        logger.error('Middleware error', {
          error: error.message,
          path: req.path,
        });

        self.errorHandler(error, req, res, next);
      }
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      handled: this.stats.handled,
      failed: this.stats.failed,
      errors: this.stats.errors,
    };
  }
}

export default {
  RouteHandlerFactory,
};
