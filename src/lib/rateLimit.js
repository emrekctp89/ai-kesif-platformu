/**
 * Rate Limiter Utility — Basit bellek-tabanlı (in-memory) hız sınırlayıcı.
 *
 * Vercel Serverless ortamında her instance kendi belleğini tutar.
 * Büyük ölçekte Redis tabanlı (Upstash) bir çözüme geçilmelidir.
 *
 * Kullanım:
 *   import { rateLimit } from '@/lib/rateLimit';
 *   const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 500 });
 *   const { success } = await limiter.check(10, identifier);
 */

const tokenBuckets = new Map();

/**
 * @param {Object} options
 * @param {number} options.interval - Pencere süresi (ms). Varsayılan: 60.000 (1 dakika)
 * @param {number} options.uniqueTokenPerInterval - Pencere başına izlenen benzersiz token sayısı
 */
export function rateLimit({ interval = 60_000, uniqueTokenPerInterval = 500 } = {}) {
  return {
    /**
     * @param {number} limit   — pencere başına izin verilen maksimum istek sayısı
     * @param {string} token   — benzersiz kimlik (IP, userId, apiKey hash vb.)
     * @returns {Promise<{success: boolean, limit: number, remaining: number, reset: number}>}
     */
    async check(limit, token) {
      const now = Date.now();
      const windowKey = `${token}`;

      // Eski kayıtları temizle
      if (tokenBuckets.size > uniqueTokenPerInterval) {
        const oldest = now - interval;
        for (const [key, value] of tokenBuckets) {
          if (value.timestamp < oldest) {
            tokenBuckets.delete(key);
          }
        }
      }

      const bucket = tokenBuckets.get(windowKey);
      const reset = now + interval;

      if (!bucket || bucket.timestamp < now - interval) {
        // Yeni pencere başlat
        tokenBuckets.set(windowKey, { count: 1, timestamp: now });
        return { success: true, limit, remaining: limit - 1, reset };
      }

      if (bucket.count >= limit) {
        return { success: false, limit, remaining: 0, reset: bucket.timestamp + interval };
      }

      bucket.count += 1;
      return { success: true, limit, remaining: limit - bucket.count, reset };
    },
  };
}

/**
 * Bir NextRequest'ten IP adresini çıkarır.
 * Vercel'de "x-forwarded-for" veya "x-real-ip" başlığı kullanılır.
 */
export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}
