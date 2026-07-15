# AI Keşif Platformu - Geliştirici Rehberi (Developer Guide)

Bu rehber, projeye yeni katılan geliştiricilerin veya AI kodlama asistanlarının kod tabanını hızlıca anlaması için hazırlanmıştır.

## 1. Mimari Genel Bakış

Proje **Next.js (App Router)** üzerine inşa edilmiştir. React Server Components (RSC) varsayılan olarak kullanılır.

### Teknoloji Yığını

- **Framework:** Next.js 14+ (App Router)
- **Veritabanı ve Auth:** Supabase
- **Stil:** Tailwind CSS + shadcn/ui
- **Çoklu Dil (i18n):** `next-intl` (Middleware destekli)
- **Ödeme Altyapısı:** Stripe

## 2. Klasör Yapısı

```text
ai-kesif-platformu/
├── src/
│   ├── app/
│   │   ├── [locale]/        # Tüm sayfalar dil prefixi ile çalışır (örn: /tr/admin, /en/admin)
│   │   ├── actions/         # Server Actions (Veritabanı işlemleri)
│   │   └── api/             # API rotaları (Webhooklar vb.)
│   ├── components/          # Yeniden kullanılabilir React bileşenleri
│   ├── lib/                 # Harici API ayarları (Stripe vb.) ve utility fonksiyonları
│   └── utils/               # Supabase SSR client ve formating fonksiyonları
├── supabase/
│   ├── migrations/          # Veritabanı şema değişiklikleri
│   └── seed.sql             # Başlangıç verileri
├── messages/                # Çeviri dosyaları (tr.json, en.json)
└── e2e/                     # Playwright Uçtan Uca (E2E) Testleri
```

## 3. Temel Standartlar

### Server Components vs Client Components

- Tüm bileşenler varsayılan olarak **Server Component**'tir. Hook kullanılması (useState, useEffect vb.) gerekiyorsa veya event listener (onClick) eklenecekse dosyanın en üstüne `'use client';` eklenmelidir.
- Veri çekme (Data Fetching) işlemleri mümkün olduğunca Server Component'lerde doğrudan (async/await ile) yapılmalıdır.

### Supabase Kullanımı

Supabase bağlantısı SSR (Server-Side Rendering) kurallarına uygun yapılmalıdır.

- Server Component'lerde: `import { createClient } from '@/utils/supabase/server'`
- Client Component'lerde: `import { createClient } from '@/utils/supabase/client'`
- Server Action'larda: `import { createClient } from '@/utils/supabase/actions'`

### Server Actions

- Güvenlik kritik işlemler (`src/app/actions/`) her zaman `user.id` kontrolü veya rol bazlı (admin) yetki doğrulama içermelidir.
- Action'lardan başarılı veya hata mesajı döndürülürken standart format kullanılmalıdır: `{ error: '...' }` veya `{ success: '...' }`.

## 4. Geliştirme Akışı (Development Flow)

1. Local Geliştirme: `npm run dev`
2. Testleri Çalıştırma: `npm test` (Unit testler Jest ile çalışır)
3. E2E Testleri Çalıştırma: `npx playwright test`
4. Yeni Veritabanı Tablosu Eklerken: Önce `supabase/migrations/` altında migration dosyası oluşturulmalı, ardından `supabase db push` veya lokalde uygulanmalıdır.

## 5. Çeviri Sistemi (i18n)

Yeni bir metin eklendiğinde doğrudan sayfaya gömülmemelidir.

- Metinler `messages/tr.json` ve `messages/en.json` dosyalarına eklenir.
- Bileşen içinde `const t = useTranslations('Namespace');` ile çağrılır.
- Server bileşenlerinde `const t = await getTranslations('Namespace');` kullanılır.
