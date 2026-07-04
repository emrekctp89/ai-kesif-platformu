/**
 * Error Middleware
 * Global error handling middleware
 */

import { logger } from '../utils/logger';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from '../utils/errors';

/**
 * Error handler middleware
 */
export function errorHandler(error, req, res, next) {
  const requestId = req.id || 'unknown';
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const code = error.code || 'ERROR';

  // Log error
  if (statusCode >= 500) {
    logger.error('Server error', {
      requestId,
      message,
      code,
      statusCode,
      path: req.path,
      method: req.method,
      stack: error.stack,
    });
  } else {
    logger.warn('Client error', {
      requestId,
      message,
      code,
      statusCode,
      path: req.path,
      method: req.method,
    });
  }

  // Send response
  res.status(statusCode).json({
    error: {
      message,
      code,
      statusCode,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
}

/**
 * Async error wrapper
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Error converter middleware
 */
export function errorConverter(error, req, res, next) {
  let convertedError = error;

  // Convert custom errors
  if (error instanceof ValidationError) {
    convertedError = error;
  } else if (error instanceof AuthenticationError) {
    convertedError = error;
  } else if (error instanceof AuthorizationError) {
    convertedError = error;
  } else if (error instanceof NotFoundError) {
    convertedError = error;
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    convertedError = new AuthenticationError('Invalid token');
  } else if (error.name === 'TokenExpiredError') {
    convertedError = new AuthenticationError('Token expired');
  }
  // Handle validation errors (express-validator, joi, etc)
  else if (error.name === 'ValidationError') {
    convertedError = new ValidationError(error.message);
  }
  // Handle database errors
  else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
    convertedError = new Error('Database error');
    convertedError.statusCode = 500;
  }
  // Handle other errors
  else {
    convertedError = error;
    if (!convertedError.statusCode) {
      convertedError.statusCode = 500;
    }
    if (!convertedError.code) {
      convertedError.code = 'ERROR';
    }
  }

  next(convertedError);
}

/**
 * Create error response
 */
export function createErrorResponse(error, requestId = 'unknown') {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const code = error.code || 'ERROR';

  return {
    error: {
      message,
      code,
      statusCode,
      requestId,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  };
}

const defaultExport = {
  errorHandler,
  asyncHandler,
  errorConverter,
  createErrorResponse,
};

export default defaultExport;
