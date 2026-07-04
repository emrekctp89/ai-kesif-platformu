/**
 * Error Middleware
 * Express/Next.js middleware for error handling
 */

import { AppError, ErrorHandler, ValidationError, RateLimitError } from './errors';
import { logger } from './logger';

/**
 * Global error handler middleware
 * Must be registered last in middleware chain
 */
export function errorHandlerMiddleware(err, req, res, next) {
  const error = ErrorHandler.handle(err, {
    method: req.method,
    path: req.path,
    url: req.url,
    requestId: req.headers['x-request-id'],
  });

  // Set response headers
  res.setHeader('Content-Type', 'application/json');
  if (error.code === 'RATE_LIMIT_ERROR' && error.details.retryAfter) {
    res.setHeader('Retry-After', error.details.retryAfter);
  }

  // Send response
  res.status(error.statusCode).json(error.toResponse());
}

/**
 * Catch async errors in Express routes
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation error middleware
 */
export function validationErrorHandler(err, req, res, next) {
  // Handle Joi validation errors
  if (err.isJoi || err.details) {
    const details = err.details?.reduce((acc, detail) => {
      acc[detail.path.join('.')] = detail.message;
      return acc;
    }, {});

    const validationError = new ValidationError('Validation failed', details);
    return errorHandlerMiddleware(validationError, req, res, next);
  }

  next(err);
}

/**
 * Not found handler
 */
export function notFoundHandler(req, res, next) {
  const error = new (require('./errors').NotFoundError)('Resource', {
    path: req.path,
    method: req.method,
  });

  res.status(404).json(error.toResponse());
}

/**
 * Error boundary for React components (client-side)
 */
export class ErrorBoundary {
  constructor() {
    this.hasError = false;
    this.error = null;
  }

  /**
   * Handle component error
   */
  componentDidCatch(error, errorInfo) {
    this.hasError = true;
    this.error = error;

    logger.error('React Error Boundary caught error', {
      message: error.message,
      componentStack: errorInfo.componentStack,
      stack: error.stack,
    });
  }

  /**
   * Reset error state
   */
  reset() {
    this.hasError = false;
    this.error = null;
  }
}

/**
 * Error handling utilities
 */
export const errorHandling = {
  /**
   * Wrap function with error handling
   */
  wrap(fn, fallback = null) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        logger.error('Wrapped function error', {
          functionName: fn.name,
          error: error.message,
        });
        return fallback;
      }
    };
  },

  /**
   * Create safe version of async function
   */
  safe(fn) {
    return async (...args) => {
      try {
        return { data: await fn(...args), error: null };
      } catch (error) {
        return { data: null, error };
      }
    };
  },

  /**
   * Handle promise with timeout
   */
  async withTimeout(promise, timeout, operation = 'Operation') {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => {
          const { TimeoutError } = require('./errors');
          reject(new TimeoutError(operation, timeout));
        }, timeout)
      ),
    ]);
  },

  /**
   * Retry with exponential backoff
   */
  async retry(fn, options = {}) {
    const { maxAttempts = 3, delay = 1000, backoff = 2, onRetry = null } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxAttempts) {
          const waitTime = delay * Math.pow(backoff, attempt - 1);

          if (onRetry) {
            onRetry({ attempt, waitTime, error });
          }

          logger.warn(`Retrying after ${waitTime}ms (attempt ${attempt}/${maxAttempts})`, {
            error: error.message,
          });

          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError;
  },

  /**
   * Circuit breaker pattern
   */
  createCircuitBreaker(fn, options = {}) {
    const { failureThreshold = 5, resetTimeout = 60000 } = options;

    let failureCount = 0;
    let lastFailureTime = null;
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

    return async (...args) => {
      const now = Date.now();

      // Check if we should reset
      if (state === 'OPEN' && now - lastFailureTime > resetTimeout) {
        state = 'HALF_OPEN';
        failureCount = 0;
      }

      if (state === 'OPEN') {
        const { RateLimitError } = require('./errors');
        throw new RateLimitError(Math.ceil((resetTimeout - (now - lastFailureTime)) / 1000), {
          reason: 'Circuit breaker is OPEN',
        });
      }

      try {
        const result = await fn(...args);

        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failureCount = 0;
        }

        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        if (failureCount >= failureThreshold) {
          state = 'OPEN';
          logger.error('Circuit breaker opened', {
            failureCount,
            threshold: failureThreshold,
          });
        }

        throw error;
      }
    };
  },
};

const defaultExport = {
  errorHandlerMiddleware,
  asyncHandler,
  validationErrorHandler,
  notFoundHandler,
  ErrorBoundary,
  errorHandling,
};

export default defaultExport;
