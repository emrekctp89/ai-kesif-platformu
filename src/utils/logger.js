/**
 * Centralized Logger Utility
 * 
 * Usage:
 * - logger.info('Message', { context: 'data' })
 * - logger.error('Error occurred', { error: err })
 * - logger.warn('Warning message', { details: 'info' })
 * - logger.debug('Debug info', { data: obj }) // Only in dev mode
 */

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const isDebug = process.env.DEBUG === 'true';

// ANSI Color codes for console styling
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Format timestamp as ISO string
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Sanitize sensitive data before logging
 */
function sanitizeSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'api_key',
    'apiKey',
    'authorization',
    'cookie',
    'creditCard',
    'ssn',
    'pin',
  ];

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

  const sanitizeValue = (val) => {
    if (typeof val === 'object' && val !== null) {
      return sanitizeSensitiveData(val);
    }
    return val;
  };

  if (Array.isArray(sanitized)) {
    sanitized.forEach((item, index) => {
      sanitized[index] = sanitizeValue(item);
    });
  } else {
    Object.keys(sanitized).forEach((key) => {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(sanitized[key]);
      }
    });
  }

  return sanitized;
}

/**
 * Format log message with styling
 */
function formatLogMessage(level, message, context, isDev) {
  const timestamp = getTimestamp();
  const prefix = isDev ? `${colors.dim}[${timestamp}]${colors.reset}` : '';

  let levelIndicator = '';
  switch (level) {
    case 'info':
      levelIndicator = isDev ? `${colors.blue}ℹ INFO${colors.reset}` : 'INFO';
      break;
    case 'error':
      levelIndicator = isDev ? `${colors.red}${colors.bright}✕ ERROR${colors.reset}` : 'ERROR';
      break;
    case 'warn':
      levelIndicator = isDev ? `${colors.yellow}⚠ WARN${colors.reset}` : 'WARN';
      break;
    case 'debug':
      levelIndicator = isDev ? `${colors.cyan}🐛 DEBUG${colors.reset}` : 'DEBUG';
      break;
    case 'success':
      levelIndicator = isDev ? `${colors.green}✓ SUCCESS${colors.reset}` : 'SUCCESS';
      break;
    default:
      levelIndicator = 'LOG';
  }

  const contextStr = isDev && context ? `${colors.gray}${context}${colors.reset}` : context;
  const contextPart = contextStr ? ` [${contextStr}]` : '';

  return `${prefix} ${levelIndicator}${contextPart}: ${message}`;
}

/**
 * Log to console with structured formatting
 */
function logToConsole(level, message, data = {}, context = '') {
  const isDev = !isProduction;
  const formatted = formatLogMessage(level, message, context, isDev);

  if (data && Object.keys(data).length > 0) {
    const sanitized = sanitizeSensitiveData(data);
    if (isDev) {
      console[level === 'success' ? 'log' : level](formatted, sanitized);
    } else {
      console[level === 'success' ? 'log' : level](
        JSON.stringify({
          level,
          message,
          context,
          timestamp: getTimestamp(),
          data: sanitized,
        })
      );
    }
  } else {
    console[level === 'success' ? 'log' : level](formatted);
  }
}

/**
 * Main Logger Object
 */
export const logger = {
  /**
   * Info level logging
   */
  info: (message, data = {}, context = '') => {
    logToConsole('info', message, data, context);
  },

  /**
   * Error level logging
   */
  error: (message, data = {}, context = '') => {
    logToConsole('error', message, data, context);
  },

  /**
   * Warning level logging
   */
  warn: (message, data = {}, context = '') => {
    logToConsole('warn', message, data, context);
  },

  /**
   * Debug level logging (only in development)
   */
  debug: (message, data = {}, context = '') => {
    if (isDebug || !isProduction) {
      logToConsole('debug', message, data, context);
    }
  },

  /**
   * Success level logging
   */
  success: (message, data = {}, context = '') => {
    logToConsole('success', message, data, context);
  },

  /**
   * Group related logs together
   */
  group: (groupName) => {
    if (!isProduction) {
      console.group(`${colors.bright}${colors.cyan}► ${groupName}${colors.reset}`);
    }
  },

  /**
   * End a log group
   */
  groupEnd: () => {
    if (!isProduction) {
      console.groupEnd();
    }
  },

  /**
   * Performance timing
   */
  time: (label) => {
    if (!isProduction || isDebug) {
      console.time(`${colors.cyan}⏱ ${label}${colors.reset}`);
    }
  },

  /**
   * End performance timing
   */
  timeEnd: (label) => {
    if (!isProduction || isDebug) {
      console.timeEnd(`${colors.cyan}⏱ ${label}${colors.reset}`);
    }
  },

  /**
   * Table logging for arrays/objects
   */
  table: (data, context = '') => {
    if (!isProduction) {
      if (context) {
        logger.group(context);
      }
      const sanitized = sanitizeSensitiveData(data);
      console.table(sanitized);
      if (context) {
        logger.groupEnd();
      }
    }
  },

  /**
   * Clear console
   */
  clear: () => {
    if (!isProduction) {
      console.clear();
    }
  },

  /**
   * Log with custom level
   */
  custom: (level, message, data = {}, context = '') => {
    logToConsole(level, message, data, context);
  },
};

/**
 * Express/Server Error Handler Integration
 */
export function createErrorHandler() {
  return (err, req, res, next) => {
    logger.error('Server Error', {
      message: err.message,
      statusCode: err.statusCode || 500,
      path: req.path,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });

    res.status(err.statusCode || 500).json({
      error: true,
      message: isProduction ? 'Internal Server Error' : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  };
}

/**
 * API Request/Response Logging Middleware
 */
export function createRequestLogger() {
  return (message, req, res, responseTime) => {
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent')?.substring(0, 50),
    };

    if (res.statusCode >= 400) {
      logger.error(message, logData);
    } else if (res.statusCode >= 300) {
      logger.warn(message, logData);
    } else {
      logger.info(message, logData);
    }
  };
}

export default logger;
