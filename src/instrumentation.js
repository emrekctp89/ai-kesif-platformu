/**
 * Next.js instrumentation — server/edge Sentry init.
 * Replaces legacy sentry.server.config.js / sentry.edge.config.js.
 * Location: src/instrumentation.js (src/ app layout).
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1,
      debug: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
