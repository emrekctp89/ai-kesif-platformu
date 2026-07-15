# AI Keşif Platformu - Bileşen Kütüphanesi (Component Library)

Projeye ait UI bileşenleri, Tailwind CSS ve Radix UI tabanlı **shadcn/ui** bileşen seti kullanılarak oluşturulmuştur. Özel bir Storybook kurulumu yerine, tüm ana bileşenlerin kullanım kılavuzu bu belgede özetlenmiştir.

## 1. Tasarım Sistemi ve Renkler (Design System)

Tasarım sistemi `src/app/globals.css` içinde CSS Değişkenleri (Variables) ile yönetilmektedir.

- **Primary Renkler:** Marka rengidir. (Butonlar, öne çıkan linkler)
  - Kullanım: `bg-primary text-primary-foreground`
- **Secondary / Muted Renkler:** Arka plan vurguları veya ikincil butonlar.
  - Kullanım: `bg-secondary` veya `bg-muted`
- **Destructive Renkler:** Hata veya silme işlemleri (örn. Yorum silme).
  - Kullanım: `bg-destructive text-destructive-foreground`

Tailwind sınıfları kullanılarak doğrudan uygulanır.

## 2. Temel UI Bileşenleri (shadcn/ui)

Bu bileşenler `src/components/ui/` altında bulunur ve gerektiğinde projenin ihtiyaçlarına göre değiştirilebilir.

- **`Button`**: En çok kullanılan etkileşim elemanı.
  - _Varyantlar:_ `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
  - _Boyutlar:_ `default`, `sm`, `lg`, `icon`
- **`Card`**: İçerik gruplamak için kullanılır (Örn. Admin Panel kartları).
  - _Alt bileşenler:_ `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- **`Badge`**: Etiket, durum veya kategori göstermek için (Örn: "Açık", "Pro").
- **`Input` / `Textarea`**: Form elemanları.

## 3. Platform Özel (Domain-Specific) Bileşenler

Bu bileşenler `src/components/` dizininde bulunur.

- **`ToolCard.js`**: Yapay zeka araçlarını listelemek için kullanılan ana kart tasarımı. İçinde aracın logosu, ismi, kategorisi, fiyatlandırma modeli ve beğeni sayısı bulunur.
- **`FeaturedTools.js` / `TrendingTools.js`**: Ana sayfadaki farklı grid yapılarını yöneten container bileşenler.
- **`SearchInput.js`**: Gelişmiş arama ve otomatik tamamlama özelliklerine sahip arama çubuğu.
- **`Header.js` / `MobileNav.js`**: Responsive navigasyon çubuğu (masaüstü ve mobil varyantları).
- **`LanguageSwitcher.js`**: Çoklu dil (i18n) geçiş butonu.

## 4. Kullanım Örneği

Yeni bir özellik ekleneceğinde mevcut kütüphane elemanlarını tercih edin:

```jsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewFeatureCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Yeni Özellik</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">Açıklama metni burada.</p>
        <Button variant="default" onClick={() => console.log('Tıklandı')}>
          Kaydet
        </Button>
      </CardContent>
    </Card>
  );
}
```
