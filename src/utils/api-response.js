/**
 * API Response Standard Utilities
 * Standardized response format for all API endpoints
 */

import { logger } from './logger';

/**
 * Standard success response format
 */
export function successResponse(data, message = 'İşlem başarılı', statusCode = 200) {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Standard error response format
 */
export function errorResponse(message = 'Bir hata oluştu', statusCode = 500, details = null) {
  return {
    success: false,
    statusCode,
    message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Paginated response format
 */
export function paginatedResponse(
  data,
  page,
  pageSize,
  total,
  message = 'Veriler başarıyla alındı'
) {
  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    success: true,
    statusCode: 200,
    message,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Standardized HTTP status codes and messages
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Error message templates
 */
export const ERROR_MESSAGES = {
  INVALID_INPUT: 'Girdi verileri geçerli değil',
  UNAUTHORIZED: 'Yetkilendirme gerekli',
  FORBIDDEN: 'Bu işlemi yapma izniniz yok',
  NOT_FOUND: 'İstenilen kaynak bulunamadı',
  DUPLICATE_ENTRY: 'Bu kayıt zaten mevcut',
  DATABASE_ERROR: 'Veritabanı hatası oluştu',
  EXTERNAL_API_ERROR: 'Harici API hatası oluştu',
  VALIDATION_ERROR: 'Veri doğrulama başarısız oldu',
  RATE_LIMIT: 'Çok fazla istek gönderdiniz. Lütfen biraz sonra tekrar deneyin',
  SERVER_ERROR: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin',
};

/**
 * Validation error response
 */
export function validationErrorResponse(errors = []) {
  return errorResponse(ERROR_MESSAGES.VALIDATION_ERROR, HTTP_STATUS.UNPROCESSABLE_ENTITY, {
    errors: errors.map((error) => ({
      field: error.field,
      message: error.message,
    })),
  });
}

/**
 * Not found response
 */
export function notFoundResponse(resource = 'Kaynak') {
  return errorResponse(`${resource} bulunamadı`, HTTP_STATUS.NOT_FOUND);
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(message = ERROR_MESSAGES.UNAUTHORIZED) {
  return errorResponse(message, HTTP_STATUS.UNAUTHORIZED);
}

/**
 * Forbidden response
 */
export function forbiddenResponse(message = ERROR_MESSAGES.FORBIDDEN) {
  return errorResponse(message, HTTP_STATUS.FORBIDDEN);
}

/**
 * Conflict response (duplicate entry)
 */
export function conflictResponse(message = ERROR_MESSAGES.DUPLICATE_ENTRY) {
  return errorResponse(message, HTTP_STATUS.CONFLICT);
}

/**
 * Rate limit response
 */
export function rateLimitResponse(retryAfter = 60) {
  return {
    ...errorResponse(ERROR_MESSAGES.RATE_LIMIT, HTTP_STATUS.TOO_MANY_REQUESTS),
    retryAfter,
  };
}

/**
 * Server error response
 */
export function serverErrorResponse(error = null, details = null) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (error) {
    logger.error('API Server Error', {
      message: error.message,
      stack: isDevelopment ? error.stack : undefined,
      ...details,
    });
  }

  return errorResponse(
    ERROR_MESSAGES.SERVER_ERROR,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isDevelopment && error ? { error: error.message } : null
  );
}

/**
 * API response wrapper for Server Actions
 * Usage: return apiResponse(data, true, 'Success message')
 */
export function apiResponse(
  data = null,
  success = true,
  message = '',
  statusCode = success ? 200 : 400
) {
  if (success) {
    return successResponse(data, message, statusCode);
  }
  return errorResponse(message, statusCode, data);
}

/**
 * Async wrapper for API endpoints
 * Usage: await handleRequest(async () => { ... })
 */
export async function handleRequest(requestFn, context = '') {
  try {
    const result = await requestFn();
    if (result && result.success !== undefined) {
      return result;
    }
    return successResponse(result);
  } catch (error) {
    logger.error('Request Handler Error', {
      context,
      message: error.message,
      stack: error.stack,
    });

    // Handle specific error types
    if (error.code === '23505') {
      // PostgreSQL duplicate key error
      return conflictResponse('Bu kayıt zaten mevcut');
    }
    if (error.code === '23503') {
      // PostgreSQL foreign key error
      return errorResponse('İlişkili kayıt bulunamadı', HTTP_STATUS.BAD_REQUEST);
    }
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return errorResponse(ERROR_MESSAGES.EXTERNAL_API_ERROR, HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    return serverErrorResponse(error, { context });
  }
}

/**
 * Response type definitions for TypeScript
 */
export const ResponseTypes = {
  // Success response type
  Success: {
    success: true,
    statusCode: 200,
    message: 'string',
    data: 'any',
    timestamp: 'string',
  },

  // Error response type
  Error: {
    success: false,
    statusCode: 400,
    message: 'string',
    details: 'object | null',
    timestamp: 'string',
  },

  // Paginated response type
  Paginated: {
    success: true,
    statusCode: 200,
    message: 'string',
    data: 'any[]',
    pagination: {
      page: 'number',
      pageSize: 'number',
      total: 'number',
      totalPages: 'number',
      hasNextPage: 'boolean',
      hasPrevPage: 'boolean',
      nextPage: 'number | null',
      prevPage: 'number | null',
    },
    timestamp: 'string',
  },
};

const defaultExport = {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  rateLimitResponse,
  serverErrorResponse,
  apiResponse,
  handleRequest,
  HTTP_STATUS,
  ERROR_MESSAGES,
};

export default defaultExport;
