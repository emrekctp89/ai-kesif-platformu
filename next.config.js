/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const disabledRoutes = [
  '/register',
  '/profile/:path*',
  '/blog/:path*',
  '/yarisma',
  '/uyelik',
  '/u/:path*',
  '/topluluk',
  '/studyo',
  '/signup',
  '/reset-password',
  '/random-tools',
  '/ogren',
  '/odul-avciligi/:path*',
  '/mesajlar/:path*',
  '/leaderboard',
  '/leaderbord',
  '/launchpad/:path*',
  '/koleksiyonlar/:path*',
  '/kesfet',
  '/karsilastir',
  '/forgot-password',
  '/eserler/:path*',
  '/arastirma',
  '/akis',
];

const nextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['@supabase/supabase-js'],
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
    ],
  },
  async redirects() {
    return disabledRoutes.map((source) => ({
      source,
      destination: '/',
      permanent: false,
    }));
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
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(
  withSentryConfig(
    nextConfig,
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
