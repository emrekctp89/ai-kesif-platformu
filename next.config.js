/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.js');

const withSerwist = require('@serwist/next').default({
  swSrc: 'src/app/sw.js',
  swDest: 'public/sw.js',
  // Turbopack (`next dev --turbopack`) is not supported by @serwist/next yet.
  disable: process.env.NODE_ENV === 'development',
});

// Redirect obsolete aliases that do not have a corresponding product page.
// Active product routes enforce authentication and plan access in their pages.
const disabledRoutes = ['/register', '/leaderbord'];

/**
 * Build redirect entries for default locale (no prefix) and English (/en).
 * localePrefix is "as-needed", so TR uses bare paths and EN uses /en/*.
 */
function buildDisabledRedirects(routes) {
  return routes.flatMap((source) => {
    const hasPathWildcard = source.includes('/:path*');
    const base = hasPathWildcard ? source.replace('/:path*', '') : source;

    const entries = [
      {
        source,
        destination: '/',
        permanent: false,
      },
      {
        source: `/en${source}`,
        destination: '/en',
        permanent: false,
      },
    ];

    // Also cover the bare EN base path when only "/foo/:path*" is listed
    // e.g. /en/blog should redirect even without a slug.
    if (hasPathWildcard) {
      entries.push({
        source: `/en${base}`,
        destination: '/en',
        permanent: false,
      });
    }

    return entries;
  });
}

const nextConfig = {
  // Smaller self-contained image for Docker; Vercel builds leave this unset.
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['@supabase/supabase-js'],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hhopgeupizlfkmvtsvkf.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return buildDisabledRedirects(disabledRoutes);
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://www.googletagmanager.com https://www.google-analytics.com https://cdn.consentmanager.net; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://hhopgeupizlfkmvtsvkf.supabase.co https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://storage.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com https://stats.g.doubleclick.net https://*.consentmanager.net; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'self' https://*.consentmanager.net; connect-src 'self' https://hhopgeupizlfkmvtsvkf.supabase.co wss://hhopgeupizlfkmvtsvkf.supabase.co https://storage.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://*.consentmanager.net;",
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(
  withSentryConfig(
    withSerwist(withNextIntl(nextConfig)),
    {
      silent: true,
      org: 'ai-kesif-platformu',
      project: 'ai-kesif-platformu',
    },
    {
      widenClientFileUpload: true,
      transpileClientSDK: true,
      tunnelRoute: '/monitoring',
      hideSourceMaps: true,
      disableLogger: true,
    }
  )
);
