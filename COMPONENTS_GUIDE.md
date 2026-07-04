# 🧩 Bileşen Kütüphanesi Kılavuzu (Component Library)

AI Keşif Platformu, UI katmanı için Tailwind CSS ve Radix UI tabanlı **Shadcn UI** kullanmaktadır. Bu doküman, ortak bileşenlerin mimarisini ve en iyi pratikleri özetler.

## 1. Dizin Yapısı

- **`src/components/ui/`**: Yalnızca Shadcn CLI tarafından yüklenen ve genel olarak projenin her yerinde kullanılan küçük/atomik yapı taşlarını (Button, Card, Input, Toast vb.) barındırır. Bu bileşenlerde manuel değişiklik yaparken dikkatli olunmalıdır, zira güncelleme sırasında ezilebilirler.
- **`src/components/`**: Projeye özgü olan (Feature-specific) ve iş mantığı içerebilen daha karmaşık bileşenleri (ToolCard, Header, AdminMenu vb.) barındırır.

## 2. Server vs Client Components Stratejisi

Next.js 15 (App Router) ile birlikte varsayılan her şey **Server Component (RSC)** olarak yorumlanır.

### Client Component Kullanmanız Gereken Durumlar (`"use client"`):

- `onClick`, `onChange`, `onSubmit` gibi event handler'lar eklendiğinde.
- `useState`, `useReducer`, `useEffect`, `useRef` hook'ları kullanıldığında.
- Tarayıcıya özgü API'lere (window, document, localStorage) ihtiyaç duyulduğunda.
- Context kullanımlarında (theme provider, auth provider).

### Hata Yapmamanız Gereken Kritik Kural:

- **Asla Server Component'ten bir HTML elementine (ör: `<button>`) olay dinleyicisi (ör: `onClick`) aktarmayın.** Bu durum Next.js sunucusunun anında çökmesine ve 500 hatası vermesine neden olur.
- Eğer bir Server Component içinde tıklanabilir bir buton oluşturmanız gerekiyorsa ve etkileşim (ör: önceki sayfaya dönmek) sadece istemcide çalışıyorsa, bu butonu ayrı bir `use client` dosyasına (ör: `BackButton.js`) taşıyın.

## 3. Önemli Özel Bileşenler

### `TrackedExternalLink` (`src/components/TrackedExternalLink.js`)

Dışarıya verilen bağlantıların (harici siteler) analitik takibini (Vercel/Google Analytics vb.) kolaylaştıran bir **Client Component**'tir.

- Dış link vereceğiniz zaman doğrudan `<a>` yerine bu bileşeni kullanın ve `eventName` sağlayın.

### `EmptyState` (`src/components/EmptyState.js`)

Sonuç bulunamayan listeler, 404 tarzı modüller veya arama sonucu çıkmayan sayfalarda kullanılır. İkon, başlık, açıklama ve opsiyonel eylem butonu alır.

### `ToolIcon` (`src/components/ToolIcon.js`)

Araçların kendi sitelerindeki favicon'larını veya resimlerini optimize ederek render eden sunucu tarafı bir bileşendir.

## 4. UI Teması ve Sınıflar (Tailwind)

Uygulamanın `globals.css` dosyasında Shadcn UI tema token'ları (CSS variables) tanımlanmıştır:

- Arka plan için: `bg-background`
- Ana metinler için: `text-foreground`
- Vurgu/Primary renkler için: `bg-primary`, `text-primary-foreground`

Tailwind sınıflarını birleştirirken ve çakışmaları önlemek için daima `cn()` (clsx + tailwind-merge) yardımcı fonksiyonunu kullanın:

```javascript
import { cn } from '@/lib/utils';

// ...
<div className={cn('base-sinif', sartaBagliClass && 'aktif-sinif', disaridanGelenClassName)} />;
```
