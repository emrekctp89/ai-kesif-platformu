/**
 * Client-side Sentry init (Next.js instrumentation-client convention).
 * Replaces legacy sentry.client.config.js for Turbopack compatibility.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    integrations: [Sentry.replayIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: false,
  });
}

// Required by @sentry/nextjs for App Router navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
