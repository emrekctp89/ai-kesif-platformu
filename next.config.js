/** @type {import('next').NextConfig} */
const disabledRoutes = [
  "/register",
  "/profile/:path*",
  "/blog/:path*",
  "/yarisma",
  "/uyelik",
  "/u/:path*",
  "/topluluk",
  "/studyo",
  "/signup",
  "/reset-password",
  "/random-tools",
  "/ogren",
  "/odul-avciligi/:path*",
  "/mesajlar/:path*",
  "/leaderboard",
  "/leaderbord",
  "/launchpad/:path*",
  "/koleksiyonlar/:path*",
  "/kesfet",
  "/karsilastir",
  "/forgot-password",
  "/eserler/:path*",
  "/arastirma",
  "/akis",
];

const nextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ["@supabase/supabase-js"],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hhopgeupizlfkmvtsvkf.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    return disabledRoutes.map((source) => ({
      source,
      destination: "/",
      permanent: false,
    }));
  },
};

module.exports = nextConfig;
