/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // YENİ: Görüntü optimizasyonu için yapılandırma ekliyoruz
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Bu, sizin Supabase projenizin alan adıdır.
        hostname: "hhopgeupizlfkmvtsvkf.supabase.co",
        port: "",
        // Supabase Storage'daki tüm genel yollara izin veriyoruz.
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
