# Güvenlik Politikası ve Önlemleri (Security Policy)

AI Keşif Platformu, kullanıcı verilerinin güvenliğini ve sistemin bütünlüğünü sağlamak için endüstri standartlarında güvenlik önlemleri uygulamaktadır.

## 1. Veri Koruması (Data Protection)

Projenin veritabanı altyapısı olarak **Supabase (PostgreSQL)** kullanılmaktadır. Supabase tarafından sağlanan yerleşik güvenlik önlemleri şunlardır:

- **Şifreleme (Encryption):**
  - Tüm veriler dinlenme halinde (at rest) AES-256 algoritması ile şifrelenir.
  - Tüm API istekleri (in transit) TLS (Transport Layer Security) üzerinden güvenli bir şekilde aktarılır.
- **Yedekleme Stratejisi (Backups):**
  - Supabase Pro/Enterprise planlarında PITR (Point-In-Time Recovery) etkinleştirilebilir. Standart olarak günlük otomatik yedeklemeler mevcuttur.
- **Row Level Security (RLS):**
  - Kullanıcı verilerine erişim, PostgreSQL'in RLS (Satır Bazı Güvenlik) kuralları ile kısıtlanmıştır. Her kullanıcı sadece kendi profiline ve yetkili olduğu işlemlere erişebilir (Örn: Sadece profil sahibi profilini silebilir/düzenleyebilir).

## 2. API Güvenliği ve İstismar Koruması

### Hız Sınırlandırma (Rate Limiting)

Brute-force saldırıları ve spam içeriklere karşı `src/utils/antiAbuse.js` modülü üzerinden aktif olarak hız sınırlandırması uygulanır. Limitler:

- **Oturum Açma (Login):** Dakikada 5 deneme.
- **Kayıt Olma (Signup):** Saatte 3 kayıt.
- **Şifre Sıfırlama:** Saatte 3 istek.
- **İletişim ve Geri Bildirim Formları:** IP başına makul oranda (örn: dakikada 5 mesaj).
- **Araç/Link Raporlama:** IP başına rate limit ve honeypot doğrulaması (Botları engellemek için gizli form alanları ve zamanlama kontrolü).

### Form Doğrulama (Honeypot & Time-based)

Kullanıcıların doldurduğu formlarda (İletişim, Hata Bildirme vb.) botları engellemek amacıyla **Honeypot** tekniği (kullanıcının göremeyeceği gizli input alanları) ve formun doldurulma süresini kontrol eden doğrulama mekanizmaları bulunur.

## 3. Güvenlik Başlıkları (Security Headers)

`next.config.js` dosyası üzerinden tüm sayfa ve API yanıtlarına endüstri standardı güvenlik başlıkları (headers) eklenir:

- **Content-Security-Policy (CSP):** `default-src 'self'`, `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com`, `img-src 'self' blob: data: https://hhopgeupizlfkmvtsvkf.supabase.co https://avatars.githubusercontent.com https://lh3.googleusercontent.com`, `connect-src 'self' https://hhopgeupizlfkmvtsvkf.supabase.co`
  - _Amaç:_ XSS (Cross-Site Scripting) ve veri enjeksiyonu saldırılarını engellemek. Yalnızca belirtilen güvenli kaynaklardan (Vercel, Supabase) script ve medya yüklenmesine izin verilir.
- **Strict-Transport-Security (HSTS):** `max-age=63072000; includeSubDomains; preload`
  - _Amaç:_ Tüm iletişimin HTTPS üzerinden zorunlu kılınması.
- **X-Frame-Options:** `SAMEORIGIN`
  - _Amaç:_ Clickjacking saldırılarını engellemek için sitenin başka domainlerde iframe içinde açılmasını yasaklamak.
- **X-Content-Type-Options:** `nosniff`
  - _Amaç:_ Tarayıcının MIME türlerini tahmin ederek (sniffing) potansiyel olarak zararlı dosyaları çalıştırmasını engellemek.
- **Referrer-Policy:** `strict-origin-when-cross-origin`
  - _Amaç:_ Site dışına çıkan linklerde gereksiz bilgi (URL parametreleri) sızıntısını önlemek.
- **Permissions-Policy:** `camera=(), microphone=(), geolocation=()`
  - _Amaç:_ Sitenin kamera, mikrofon ve konum gibi hassas donanım yeteneklerini kullanmasını tamamen kapatmak.

## 4. Kimlik Doğrulama (Authentication)

- **JWT (JSON Web Tokens):** Supabase Auth aracılığıyla güvenli JWT tabanlı kimlik doğrulama.
- **OAuth Güvenliği:** Google ve Github ile güvenli üçüncü taraf oturum açma (OAuth2) desteği.
- **Güvenli Şifre Sıfırlama:** Süreli ve tek kullanımlık şifre sıfırlama token'ları e-posta yoluyla iletilir.

## 5. Güvenlik Açığı Bildirimi (Vulnerability Reporting)

Sistemimizde herhangi bir güvenlik açığı tespit ederseniz, lütfen genel kanallardan (Issue, Yorum vb.) paylaşmak yerine doğrudan proje yöneticisi e-posta adresiyle iletişime geçiniz. Bilinen zafiyetler için düzenli olarak `npm audit` çalıştırılarak bağımlılıklar kontrol edilmektedir.
