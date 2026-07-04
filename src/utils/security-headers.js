/**
 * Security Headers & CORS Middleware
 * Centralized security configuration for Next.js
 */

/**
 * Security headers configuration
 */
export const securityHeaders = {
  // Clickjacking protection
  'X-Frame-Options': 'DENY',

  // MIME type sniffing protection
  'X-Content-Type-Options': 'nosniff',

  // XSS protection (legacy, but good for older browsers)
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (formerly Feature-Policy)
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ].join(', '),

  // Content Security Policy (CSP)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-analytics.com https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "media-src 'self' https:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),

  // HSTS (HTTP Strict Transport Security)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // HTTP Public Key Pinning (optional, requires careful management)
  // 'Public-Key-Pins': '...',
};

/**
 * CORS configuration
 */
export const corsConfig = {
  // Allowed origins
  origin: process.env.NEXT_PUBLIC_ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aikeşif.com',
  ],

  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Allowed headers
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],

  // Credentials
  credentials: true,

  // Exposed headers
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],

  // Max age
  maxAge: 86400, // 24 hours
};

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin) {
  const allowedOrigins = corsConfig.origin;

  // Allow undefined origin (same-site requests)
  if (!origin) {
    return true;
  }

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard patterns
  return allowedOrigins.some((allowed) => {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\./g, '\\.').replace(/\*/g, '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    }
    return false;
  });
}

/**
 * Get CORS headers for response
 */
export function getCorsHeaders(origin) {
  const headers = {};

  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin || corsConfig.origin[0];
    headers['Access-Control-Allow-Methods'] = corsConfig.methods.join(', ');
    headers['Access-Control-Allow-Headers'] = corsConfig.allowedHeaders.join(', ');
    headers['Access-Control-Expose-Headers'] = corsConfig.exposedHeaders.join(', ');
    headers['Access-Control-Max-Age'] = corsConfig.maxAge.toString();

    if (corsConfig.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }

  return headers;
}

/**
 * Get all security headers
 */
export function getAllSecurityHeaders() {
  return securityHeaders;
}

/**
 * Middleware function for Express/Next.js
 */
export function securityHeadersMiddleware(req, res, next) {
  // Set security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Set CORS headers
  const origin = req.headers.origin;
  const corsHeaders = getCorsHeaders(origin);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}

/**
 * Security headers for Next.js next.config.js
 */
export function getNextConfigHeaders() {
  return [
    {
      source: '/(.*)',
      headers: Object.entries(securityHeaders).map(([key, value]) => ({
        key,
        value,
      })),
    },
  ];
}

/**
 * HTTPS redirect middleware
 */
export function httpsRedirectMiddleware(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    if (proto !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  next();
}

export default {
  securityHeaders,
  corsConfig,
  isOriginAllowed,
  getCorsHeaders,
  getAllSecurityHeaders,
  securityHeadersMiddleware,
  httpsRedirectMiddleware,
  getNextConfigHeaders,
};
