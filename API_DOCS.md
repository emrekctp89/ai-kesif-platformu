# 📡 API Dokümantasyonu (API Docs)

Bu doküman, sistemdeki arka uç (backend) fonksiyonlarını ve istemciyle olan iletişim noktalarını açıklar. Proje, standart `/api` endpoint'leri yerine ağırlıklı olarak **Next.js Server Actions** kullanmaktadır.

## 1. Standart API Yolları (`/api`)

Standart API yolları yalnızca üçüncü parti hizmetlerle entegrasyon veya harici olarak tetiklenmesi gereken webhook'lar ve cron görevleri için kullanılmıştır.

### `GET /api/cron/link-audit`

- **Amaç:** Onaylı araç linklerini tarar; `link_check_status`, `link_checked_at`, HTTP/hata alanlarını günceller. Kırık/inceleme gerekenlerde admin uyarısı + e-posta gönderir.
- **Tetikleyici:** Vercel Cron — **haftalık** (`0 4 * * 1`, Pazartesi 04:00 UTC).
- **Öncelik:** (1) hiç kontrol edilmemiş, (2) `invalid`/`review`, (3) 7 günden eski kontroller.
- **Parametreler (opsiyonel):** `batchSize`, `maxTools`, `timeoutMs`, `concurrency`, `staleDays`, `maxRuntimeMs`, `priority=all|pending`.
- **Güvenlik:** `Authorization: Bearer <CRON_SECRET>` veya `?secret=` (route `allowQuerySecret` açık).

### `GET /api/cron/link-audit-pending`

- **Amaç:** Yalnızca **yeni** (`link_checked_at` boş) ve problemli (`invalid`/`review`) araçları tarar.
- **Tetikleyici:** Vercel Cron — **günlük** (`0 3 * * *`, 03:00 UTC) — detay sayfasında “Kontrol bekliyor” birikimini önler.
- **Güvenlik:** Aynı `CRON_SECRET`.

### `POST /api/stripe-webhook`

- **Amaç:** Stripe ödeme sisteminden gelen asenkron web kancası (webhook) bildirimlerini yakalar.
- **Payload:** Stripe tarafından gönderilen Event objesi.
- **İşlev:** Kullanıcı abonelik durumlarını, ödeme başarılarını ve iptalleri veritabanına yansıtır.

### `GET /api/tool-icon`

- **Amaç:** Bir URL üzerinden verilen aracın favicon'unu veya belirleyici bir ikonunu bulup optimize ederek sunar.
- **Parametreler:** `?url=https://ornek.com`

---

## 2. Server Actions (Sunucu Eylemleri)

Sunucu eylemleri `src/app/actions/` dizininde kategorize edilmiş fonksiyonlar bütünüdür. Bu dosyaların tamamı `use server` direktifi ile çalışır. React formlarına (`action={...}`) doğrudan verilebilir veya istemci bileşenlerinde asenkron fonksiyon olarak çağrılabilirler.

### `auth.js`

- Kullanıcı kaydı, girişi, şifre sıfırlama, oturum kapatma gibi Supabase Auth entegrasyon fonksiyonlarını barındırır.

### `tools.js`

- Sistemdeki yapay zeka araçlarını çekmek (Listeleme, Detay, Arama).
- Beğenme (favorite) veya Beğenmekten vazgeçme işlemleri.
- Puanlama ve araç önerme (suggest tool) form gönderimleri.

### `admin.js`

- Yönetici paneli için istatistik çekme, kullanıcıları yönetme.
- Gönderilen araç önerilerini (submissions) onaylama/reddetme.

### `reports.js`

- Kullanıcılar tarafından bildirilen "Kırık Link" (Broken Link) veya hatalı içerik bildirimlerini veritabanına yazar.

### `notifications.js`

- Sistem içi bildirimlerin çekilmesi, okundu olarak işaretlenmesi ve silinmesi operasyonlarını gerçekleştirir.

---

## 3. Yanıt Formatı (Response Format)

Tüm Server Actions ve API Route'lar tutarlı bir JSON yanıt yapısı kullanmalıdır. `src/utils/api-response.js` içerisindeki yardımcı fonksiyonlarla oluşturulan yanıt şablonu şöyledir:

**Başarılı Yanıt (Success):**

```json
{
  "success": true,
  "data": { ...istenen_veri },
  "message": "İşlem başarıyla gerçekleşti"
}
```

**Hatalı Yanıt (Error):**

```json
{
  "success": false,
  "error": "Benzersiz bir hata kodu (ör: UNAUTHORIZED)",
  "message": "Kullanıcıya gösterilebilir açıklayıcı mesaj"
}
```
