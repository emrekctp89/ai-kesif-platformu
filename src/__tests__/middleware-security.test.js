/**
 * Middleware Security Headers Test
 *
 * Bu test, middleware'in döndürdüğü güvenlik başlıklarını doğrular.
 * Middleware'in tam entegrasyon testi yerine, başlık listesini
 * doğrulayan bir birim testi olarak tasarlanmıştır.
 */

const REQUIRED_SECURITY_HEADERS = [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'X-XSS-Protection',
  'Referrer-Policy',
  'Permissions-Policy',
];

const CORS_HEADERS = [
  'Access-Control-Allow-Credentials',
  'Access-Control-Allow-Origin',
  'Access-Control-Allow-Methods',
  'Access-Control-Allow-Headers',
];

// Bu test, middleware.js dosyasının kaynak kodunu statik olarak analiz eder.
// Gerçek Next.js middleware'i mock'lamak karmaşık olduğundan bu yaklaşım tercih edildi.
const fs = require('fs');
const path = require('path');

describe('Middleware Security Headers', () => {
  let middlewareSource;

  beforeAll(() => {
    const middlewarePath = path.join(process.cwd(), 'src', 'middleware.js');
    middlewareSource = fs.readFileSync(middlewarePath, 'utf-8');
  });

  test.each(REQUIRED_SECURITY_HEADERS)(
    'güvenlik başlığı "%s" middleware içinde set ediliyor',
    (header) => {
      expect(middlewareSource).toContain(header);
    }
  );

  test.each(CORS_HEADERS)('CORS başlığı "%s" middleware içinde set ediliyor', (header) => {
    expect(middlewareSource).toContain(header);
  });

  it('CORS origin wildcard (*) yerine ortam değişkeni kullanılıyor', () => {
    // Eski güvensiz: response.headers.set('Access-Control-Allow-Origin', '*');
    // Yeni güvenli: NEXT_PUBLIC_SITE_URL veya fallback
    expect(middlewareSource).toContain('NEXT_PUBLIC_SITE_URL');
  });

  it('production ortamında HSTS başlığı ekleniyor', () => {
    expect(middlewareSource).toContain('Strict-Transport-Security');
  });

  it('DENY ile iframe engellemesi yapılıyor', () => {
    expect(middlewareSource).toContain("'DENY'");
  });
});
