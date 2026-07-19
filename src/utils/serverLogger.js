import logger from '@/utils/logger';

const SENSITIVE_KEY_PATTERN =
  /email|token|secret|password|authorization|cookie|customer|user|prompt|message/i;

function sanitizeDetails(details = {}) {
  return Object.fromEntries(
    Object.entries(details || {}).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : value,
    ])
  );
}

/**
 * Structured server error helper used by server actions / routes.
 * Prefer this over raw console.error so production logs stay JSON-shaped.
 */
export function logServerError(context, error, details) {
  logger.error(
    error instanceof Error ? error.message : String(error ?? 'Unknown error'),
    {
      error,
      digest: error?.digest,
      details: sanitizeDetails(details),
    },
    context || 'app-error'
  );
}
