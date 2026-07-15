# AI Keşif Platformu - Ölçeklendirme Kılavuzu (Scaling Guidelines)

Bu belge, uygulamanın trafik arttıkça nasıl yönetileceğine ve darboğazların (bottlenecks) nasıl çözüleceğine dair stratejileri içermektedir.

## 1. Veritabanı Ölçeklendirme (Supabase / PostgreSQL)

### Connection Pooling

Büyük trafik dalgalanmalarında PostgreSQL bağlantı sınırlarına (connection limit) takılmamak için **Supabase Connection Pooling (PgBouncer)** kullanılmaktadır.

- Servislerin `DATABASE_URL` yerine `pooler` bağlantı string'ini (port 6543) kullanması zorunludur.
- Vercel Serverless ve Edge function'lardan gelen binlerce anlık bağlantı, bu havuzda eritilir.

### Read Replicas (Okuma Kopyaları)

Eğer okuma (SELECT) trafiği veritabanı performansını düşürmeye başlarsa:

1. Supabase Pro/Team planına geçilerek "Read Replicas" aktif edilmelidir.
2. Ana sayfadaki `tools` ve `categories` listelemeleri gibi okuma ağırlıklı sorgular replica url'sine yönlendirilmelidir.
3. Yazma (INSERT, UPDATE) işlemleri her zaman Primary DB'de kalmalıdır.

## 2. Frontend ve Caching (Vercel & Next.js)

### Edge Runtime

Kimlik doğrulama işlemleri (middleware) ve kritik statik sayfalar **Vercel Edge Network** üzerinde çalışır. Bu, dünyanın herhangi bir yerindeki kullanıcının milisaniyeler içinde yanıt almasını sağlar.

### Next.js ISR (Incremental Static Regeneration)

Araç detay sayfaları (`/tool/[slug]`) gibi çok sık değişmeyen ancak SEO için önemli olan sayfalar ISR ile sunulmaktadır.

- Bu sayfalar her istekte veritabanına gitmek yerine Vercel önbelleğinden (Cache) döndürülür.
- `revalidate` süreleri stratejik olarak belirlenmiştir (örn. 3600 saniye).

### CDN Optimizasyonu

Kullanıcıların yüklediği resimler (Supabase Storage) ve uygulamanın kendi statik varlıkları Vercel Edge Cache üzerinde barındırılmaktadır. İleride resim manipülasyon maliyetlerini düşürmek için Vercel Image Optimization sınırları takip edilmeli, gerekirse Cloudflare R2 veya ImageKit gibi bağımsız CDN'lere geçilmelidir.

## 3. Rate Limiting ve API Güvenliği

- `/api/v1/tools` gibi public API uçları için IP bazlı Rate Limiting uygulanmaktadır.
- Özellikle Supabase Edge Functions ve AI uç noktaları (Örn. AI Konsiyerj) dışarıdan gelebilecek bot saldırılarına karşı Upstash Redis ile hız sınırına (rate limit) tabi tutulmalıdır.

## 4. İleriye Dönük İyileştirmeler

Aylık 1M+ sayfa görüntülenmesine ulaşıldığında:

- Arama işlemi Supabase (pg_search) yerine ElasticSearch veya Typesense gibi daha hızlı ve ölçeklenebilir arama motorlarına devredilmelidir.
- Analitik verileri ana veritabanı yerine ClickHouse gibi zaman serisi odaklı bir veritabanına aktarılmalıdır.
