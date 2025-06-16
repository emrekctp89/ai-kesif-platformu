/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Bu satır, bazı sunucu ortamlarında dosya boyutu limitinin
    // daha güvenilir çalışmasını sağlar.
    serverActions: {
      bodySizeLimit: '4mb', // Limiti 4MB olarak ayarlıyoruz
    },
  },
};

export default nextConfig;
