# Veritabanı Şeması (Database Schema)

Bu belge, AI Keşif Platformu'nun veritabanı yapısını, tabloları, sütunları, ilişkileri ve Row Level Security (RLS) politikalarını açıklar. Veritabanı PostgreSQL (Supabase) kullanılarak oluşturulmuştur.

## 📋 Tablo Özeti

Aşağıda platformda bulunan ana tabloların bir listesi yer almaktadır:

1. **tools**: AI araçlarının temel verilerini barındırır.
2. **tool_link_reports**: Kullanıcılar tarafından bildirilen kırık/hatalı bağlantı raporlarını tutar.
3. **admin_alerts**: Sistem tarafından oluşturulan admin uyarılarını barındırır.
4. **notifications**: Kullanıcı bildirimlerini yönetir.
5. **profiles**: Kullanıcı profil detaylarını saklar. (Supabase `auth.users` ile ilişkilidir)
6. **badges**: Platformdaki ün ve ödül sistemi için tanımlanan rozetleri içerir.

---

## 🏗️ Tablo Detayları

### 1. `tools`
Yapay zeka araçlarının listelendiği ana tablodur.

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `id` | bigint | Birincil Anahtar (Primary Key) |
| `name` | text | Aracın adı |
| `is_approved` | boolean | Aracın onaylanıp onaylanmadığı |
| `link_check_status` | text | Linkin durumu (örn. 'valid', 'invalid', 'review') |
| `link_check_error` | text | Link kontrolü sırasında alınan hata mesajı |
| `link_check_http_status` | integer | Linkin döndürdüğü HTTP durum kodu |
| `link_checked_at` | timestamptz | Son link kontrol tarihi |
| `link_deactivated_at` | timestamptz | Linkin inaktif duruma çekildiği tarih |
| `link_deactivation_reason` | text | Linkin inaktif edilme sebebi |
*(Not: Bu tabloda isim, açıklama, kategori, tier vb. başka standart sütunlar da bulunmaktadır ancak migration dosyalarından link_audit sütunları teyit edilmiştir.)*

### 2. `tool_link_reports`
Kullanıcıların araçların linkleriyle ilgili bildirimlerini saklar.

| Sütun | Tip | Açıklama | Kısıtlamalar |
|-------|-----|----------|--------------|
| `id` | bigint | Birincil Anahtar | `generated always as identity` |
| `tool_id` | bigint | Hangi araca ait olduğu | `references tools(id) on delete cascade` |
| `reporter_user_id` | uuid | Raporlayan kullanıcı | `references auth.users(id) on delete set null` |
| `reporter_email` | text | Raporlayanın e-posta adresi | |
| `reported_url` | text | Bildirilen hatalı URL | `not null` |
| `reason` | text | Hata sebebi | `not null` |
| `details` | text | Ek detaylar | |
| `status` | text | Rapor durumu | `default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed'))` |
| `admin_note` | text | Admin notu | |
| `created_at` | timestamptz | Oluşturulma tarihi | `not null default now()` |
| `updated_at` | timestamptz | Güncellenme tarihi | `not null default now()` |
| `resolved_at` | timestamptz | Çözülme tarihi | |

**İndeksler:**
- `tool_link_reports_status_created_at_idx` on `(status, created_at desc)`
- `tool_link_reports_tool_id_idx` on `(tool_id)`

**RLS Politikaları:**
- "Anyone can report approved tool links": `anon` ve `authenticated` kullanıcılar sadece onaylı araçlar için kayıt ekleyebilir (Insert-only).

### 3. `admin_alerts`
Admin paneli için oluşturulan sistem uyarıları (örn. kırık link raporları sonucunda oluşan uyarılar).

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `id` | bigint | Birincil Anahtar |
| `alert_type` | text | Uyarının türü |
| `description` | text | Uyarı detayı |
| `status` | text | Uyarının durumu (Varsayılan: 'Açık') |
| `link` | text | İlgili bağlantı/sayfa |
| `metadata` | jsonb | Ek veri (Varsayılan: `{}`) |
| `created_at` | timestamptz | Oluşturulma tarihi |
| `resolved_at` | timestamptz | Çözülme tarihi |

**İndeksler:**
- `admin_alerts_status_created_at_idx` on `(status, created_at desc)`

### 4. `notifications`
Kullanıcıların bildirimlerini (uygulama içi bildirimler) saklar.

| Sütun | Tip | Açıklama | Kısıtlamalar |
|-------|-----|----------|--------------|
| `id` | bigint | Birincil Anahtar | `generated always as identity` |
| `user_id` | uuid | İlgili kullanıcı | `references auth.users(id) on delete cascade` |
| `event_type` | text | Bildirim tipi | |
| `message` | text | Bildirim mesajı | |
| `link` | text | İlgili yönlendirme bağlantısı | |
| `is_read` | boolean | Okundu mu? | `not null default false` |
| `created_at` | timestamptz | Oluşturulma tarihi | `not null default now()` |

**İndeksler:**
- `notifications_user_unread_created_at_idx` on `(user_id, is_read, created_at desc)`

**RLS Politikaları:**
- Sadece `authenticated` (oturum açmış) kullanıcılar kendi bildirimlerini görebilir.
- Sadece `authenticated` kullanıcılar kendi bildirimlerinin durumunu (okundu olarak) güncelleyebilir.

### 5. `badges`
Platform ün sistemi rozetleri.

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `name` | text | Rozet adı (Unique Constraint - PK veya Unique index var) |
| `description` | text | Rozetin veriliş amacı |
| `icon_name` | text | İlgili Lucide vb. ikon adı |
| `tier` | text | Seviye ('bronze', 'silver', 'gold') |

---

## 🔒 Güvenlik Politikaları Özeti (RLS)
- Supabase Row Level Security aktif olarak kullanılmaktadır.
- Hassas veriler (örn. profil ve bildirimler) `auth.uid() = user_id` prensibine göre sadece ilgili kullanıcılara açıktır.
- Admin incelemelerine giren tablolar (örn. tool_link_reports) için sadece insert izinleri verilmiş, okuma veya düzenleme izinleri `service_role` (admin) düzeyine bırakılmıştır.
