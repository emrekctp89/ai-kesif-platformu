/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['@supabase/supabase-js'],
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // We ignore TS errors because Supabase Edge Functions (Deno) live in the same repo
    // and Next.js tries to type-check them using Node TS, causing build failures.
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
    ],
  },
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: 'ai-kesif-platformu',
  project: 'ai-kesif-platformu',
});
