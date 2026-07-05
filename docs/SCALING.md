# AI Keşif Platformu - Scaling & Infrastructure Kılavuzu

Bu doküman, yüksek trafik altında AI Keşif Platformu'nun ölçeklenebilirliğini (scalability) ve altyapı performansını yönetmek için uygulanması gereken stratejileri açıklamaktadır.

## 1. Edge Computing (Sunucusuz Sınır Bilişim)

Uygulamanın küresel çapta hızlı yanıt verebilmesi için Next.js App Router üzerinden Vercel Edge Network kullanılmaktadır. Node.js runtime'ı yerine Edge runtime kullanmak, sunucu soğuk başlama (cold start) sürelerini neredeyse sıfıra indirir.

- **Kritik Sayfalar:** Yüksek hit alan anasayfa (`/`), Keşfet sayfası (`/kesfet`) gibi alanlar `export const runtime = 'edge';` kullanılarak Edge sunucularında render edilir.
- **Kritik API'ler:** Dış kaynaklardan favicon veya resim çeken yoğun trafikli API'ler (Örn: `/api/tool-icon`) Edge ağında barındırılarak kullanıcının coğrafi konumuna en yakın sunucudan yanıt döndürür.

## 2. Supabase Veritabanı Ölçeklendirmesi

### Connection Pooling (Bağlantı Havuzu)

Veritabanına anlık binlerce istek geldiğinde Postgres bağlantı limitlerinin (genellikle ~100) aşılmaması için **Supavisor** (Connection Pooling) kullanılmalıdır.

_Kullanım Şekli:_

- Vercel'deki `NEXT_PUBLIC_SUPABASE_URL` sabit kalır, ancak veritabanı ile direkt bağlantı kuran arka plan işlemleri veya ORM/Prisma kullanımları (varsa) için Supabase kontrol panelindeki **Pooler (Supavisor)** sekmesinden alınan Transaction Modu URL'si (Port 6543) kullanılmalıdır.
- Mevcut uygulamamız Supabase REST API (PostgREST) ve `supabase-js` kullandığı için PostgREST bu connection pooling'i zaten dahili olarak optimize eder.

### Read Replicas (Okuma Kopyaları)

Trafik daha da artarsa, dünyanın farklı bölgelerinde Supabase Okuma Kopyaları (Read Replicas) oluşturulabilir (Supabase Pro/Enterprise plan gerektirir).

_Kullanım Şekli:_

- Read Replica devreye alındığında, okuma ağırlıklı (GET) işlemler için Supabase istemcisi şu şekilde yapılandırılabilir:
  ```javascript
  const supabaseReadOnly = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_READ_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  ```
- Okuma istekleri replica üzerinden, yazma (POST, PUT, DELETE) işlemleri ana (Primary) URL üzerinden yapılarak yük dağıtılır.

## 3. DevOps Otomasyonu

- **Dependabot:** Projedeki NPM paketleri `.github/dependabot.yml` yapılandırmasıyla haftalık olarak taranır. Güvenlik açıkları (Security Vulnerabilities) anında raporlanır ve otomatik Pull Request açılır.
- **CI/CD:** GitHub Actions üzerinden linting, birim testleri (Jest) ve E2E testleri (Playwright) her koda katkı (push/PR) durumunda otomatik tetiklenir. Bu sayede canlı ortama bozuk kod gönderimi engellenir.

## 4. Önbellekleme (Caching)

- **Stale-While-Revalidate (SWR):** Sık değişmeyen içerikler Vercel Data Cache kullanılarak saatlik (`revalidate: 3600`) veya günlük önbelleğe alınmaktadır. Veritabanı sorguları minimumda tutulur.
- Edge ağında CDN tarafında önbellek (Cache-Control başlıkları ile) statik dosyalar (PWA, ikonlar, fontlar vb.) için 1 yıla kadar (`max-age=31536000`) uzatılmıştır.
