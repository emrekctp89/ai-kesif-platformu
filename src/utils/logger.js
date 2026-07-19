/**
 * Centralized Logger Utility
 *
 * Preferred structured usage:
 * - logger.info('Message', { userId: '…' })
 * - logger.error('Error occurred', { error: err })
 * - logger.warn('Warning message', { details: 'info' }, 'Context')
 * - logger.debug('Debug info', { data: obj }) // only in dev / DEBUG=true
 *
 * Also supports console-style second args (common after console.* migrations):
 * - logger.error('Something failed:', err)
 * - logger.warn('hint', 'string detail')
 */

const isProduction = process.env.NODE_ENV === 'production';
const isDebug = process.env.DEBUG === 'true';

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

const SENSITIVE_KEY_PATTERN =
  /password|token|secret|api[_-]?key|authorization|cookie|creditcard|ssn|pin/i;

function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Convert Error (and Error-like) values into plain JSON-safe objects.
 */
export function serializeError(err) {
  if (err == null) return null;

  if (err instanceof Error) {
    const out = {
      name: err.name,
      message: err.message,
      stack: isProduction ? undefined : err.stack,
    };
    if (err.cause != null) {
      out.cause = serializeError(err.cause);
    }
    // Preserve common non-enumerable / custom fields
    for (const key of ['code', 'status', 'statusCode', 'digest', 'details']) {
      if (err[key] !== undefined) out[key] = err[key];
    }
    return out;
  }

  if (typeof err === 'object') {
    // Supabase / PostgREST style: { message, code, details, hint }
    if (
      typeof err.message === 'string' ||
      typeof err.code === 'string' ||
      typeof err.error === 'string'
    ) {
      return {
        message: err.message ?? err.error,
        code: err.code,
        details: err.details,
        hint: err.hint,
        status: err.status ?? err.statusCode,
      };
    }
  }

  return err;
}

/**
 * Normalize the free-form second argument into a plain data object.
 * Accepts Error, string, number, array, plain object, or null/undefined.
 */
export function normalizeLogData(data) {
  if (data === undefined || data === null) {
    return {};
  }

  if (data instanceof Error) {
    return { error: serializeError(data) };
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return { detail: data };
  }

  if (Array.isArray(data)) {
    return { items: data };
  }

  if (typeof data === 'object') {
    // Already structured — serialize nested Error fields
    const out = {};
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Error) {
        out[key] = serializeError(value);
      } else {
        out[key] = value;
      }
    }
    // If someone passed a bare error-like object without wrapping
    if (Object.keys(out).length === 0 && (data.message != null || data.code != null)) {
      return { error: serializeError(data) };
    }
    return out;
  }

  return { detail: String(data) };
}

function hasLogData(data) {
  return data != null && typeof data === 'object' && Object.keys(data).length > 0;
}

/**
 * Sanitize sensitive fields before logging.
 */
export function sanitizeSensitiveData(obj, seen = new WeakSet()) {
  if (obj == null || typeof obj !== 'object') return obj;

  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  if (obj instanceof Error) {
    return sanitizeSensitiveData(serializeError(obj), seen);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeSensitiveData(item, seen));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (value instanceof Error) {
      sanitized[key] = sanitizeSensitiveData(serializeError(value), seen);
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeSensitiveData(value, seen);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

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
      levelIndicator = String(level || 'LOG').toUpperCase();
  }

  const contextStr = isDev && context ? `${colors.gray}${context}${colors.reset}` : context;
  const contextPart = contextStr ? ` [${contextStr}]` : '';

  return `${prefix} ${levelIndicator}${contextPart}: ${message}`;
}

function resolveConsoleMethod(level) {
  if (level === 'success') return 'log';
  if (typeof console[level] === 'function') return level;
  return 'log';
}

/**
 * Log to console with structured formatting.
 */
function logToConsole(level, message, data, context = '') {
  const isDev = !isProduction;
  const normalized = normalizeLogData(data);
  const formatted = formatLogMessage(level, message, context, isDev);
  const method = resolveConsoleMethod(level);

  if (hasLogData(normalized)) {
    const sanitized = sanitizeSensitiveData(normalized);
    if (isDev) {
      console[method](formatted, sanitized);
    } else {
      console[method](
        JSON.stringify({
          level,
          message,
          context: context || undefined,
          timestamp: getTimestamp(),
          data: sanitized,
        })
      );
    }
  } else {
    console[method](formatted);
  }
}

/**
 * Main Logger Object
 */
export const logger = {
  info: (message, data, context = '') => {
    logToConsole('info', message, data, context);
  },

  error: (message, data, context = '') => {
    logToConsole('error', message, data, context);
  },

  warn: (message, data, context = '') => {
    logToConsole('warn', message, data, context);
  },

  /**
   * Debug level logging (only in development or when DEBUG=true)
   */
  debug: (message, data, context = '') => {
    if (isDebug || !isProduction) {
      logToConsole('debug', message, data, context);
    }
  },

  success: (message, data, context = '') => {
    logToConsole('success', message, data, context);
  },

  group: (groupName) => {
    if (!isProduction) {
      console.group(`${colors.bright}${colors.cyan}► ${groupName}${colors.reset}`);
    }
  },

  groupEnd: () => {
    if (!isProduction) {
      console.groupEnd();
    }
  },

  time: (label) => {
    if (!isProduction || isDebug) {
      console.time(`${colors.cyan}⏱ ${label}${colors.reset}`);
    }
  },

  timeEnd: (label) => {
    if (!isProduction || isDebug) {
      console.timeEnd(`${colors.cyan}⏱ ${label}${colors.reset}`);
    }
  },

  table: (data, context = '') => {
    if (!isProduction) {
      if (context) {
        logger.group(context);
      }
      const sanitized = sanitizeSensitiveData(normalizeLogData(data));
      console.table(hasLogData(sanitized) ? sanitized : data);
      if (context) {
        logger.groupEnd();
      }
    }
  },

  clear: () => {
    if (!isProduction) {
      console.clear();
    }
  },

  custom: (level, message, data, context = '') => {
    logToConsole(level, message, data, context);
  },
};

/**
 * Express/Server Error Handler Integration
 */
export function createErrorHandler() {
  return (err, req, res, next) => {
    logger.error('Server Error', {
      error: err,
      statusCode: err.statusCode || 500,
      path: req.path,
      method: req.method,
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
      userAgent: req.get?.('User-Agent')?.substring(0, 50),
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
