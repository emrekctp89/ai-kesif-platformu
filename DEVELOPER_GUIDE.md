# 🚀 AI Keşif Platformu - Geliştirici Kılavuzu (Developer Guide)

Bu kılavuz, projeye yeni katılan veya mevcut kodu anlamak isteyen geliştiriciler için temel kuralları, proje yapısını ve en iyi pratikleri içerir.

## 1. Mimari Genel Bakış
Proje **Next.js 15 (App Router)** altyapısı üzerine inşa edilmiştir. React'in **Server Components (RSC)** ve **Client Components** özellikleri yoğun şekilde kullanılmaktadır.

### Server Components vs. Client Components
- Varsayılan olarak her şey bir **Server Component'tir**.
- Sadece etkileşim (interaktivite), state (\useState\), hook (\useEffect\) veya tarayıcı API'leri gereken yerlerde \use client\ direktifi kullanılır.
- **ÖNEMLİ KURAL:** Server Component'ler doğrudan event handler (ör: \onClick\) kabul edemez. Örneğin; standart bir HTML \<button>\ elementi veya etkileşimli bir UI elementi, olay dinleyici alacaksa mutlaka Client Component olmalıdır veya onu sarmalayan bileşen bir Client Component olmak zorundadır.

## 2. Veri Çekme ve Yönetimi
Uygulama, frontend ile doğrudan konuşan dış API'ler yerine **Server Actions** (Sunucu Eylemleri) kullanımını tercih etmektedir. \src/app/actions/\ dizininde kategorize edilmiş fonksiyonlar mevcuttur.

### Server Actions Kuralları
- İstemci tarafından çağrılabilmesi için action dosyasının en başında \use server\ direktifi bulunmalıdır.
- Veritabanı sorguları (Supabase) her zaman yetkilendirme (RLS - Row Level Security) dikkate alınarak sunucuda yapılmalıdır.
- Hata durumları her zaman tek bir yapıda (standart JSON veya Throw Error) döndürülmelidir. Standart bir format için \src/utils/api-response.js\ kullanılmaktadır.

## 3. Stil Yönetimi ve UI
- Projede stil çözümü olarak **Tailwind CSS** kullanılmaktadır.
- UI bileşen kütüphanesi olarak **Shadcn UI** \src/components/ui/\ dizininde kuruludur.
- Tasarım estetiği, Glassmorphism, ince (subtle) animasyonlar, degraded (gradient) renk paletleri ve pürüzsüz arayüzlerden oluşmalıdır.
- Birden çok sınıfı birleştirmek veya Tailwind sınıflarını güvenli bir şekilde koşullandırmak için her zaman \cn()\ utility fonksiyonu (\src/lib/utils.js\) kullanılmalıdır.

## 4. Kimlik Doğrulama (Auth)
Kimlik doğrulama, **Supabase Auth** üzerinden sağlanmaktadır.
- İstemci (Client) tarafı için \createClient()\ (browser) (\src/utils/supabase/client.js\) kullanılır.
- Sunucu (Server) bileşenleri, Action'lar veya Route Handler'lar için \createClient(await cookies())\ (\src/utils/supabase/server.js\) kullanılmalıdır.
- Rol bazlı yetkilendirme (Admin vs Normal User) sunucu tarafında veri çekilirken (\uth.getUser()\) kontrol edilmelidir.

## 5. Test Altyapısı
- **Birim (Unit) Testleri:** Jest kütüphanesi ile yapılandırılmıştır.
- **Uçtan Uca (E2E) Testleri:** Playwright ile çalışır (\e2e/\ dizini).
- Test komutu: \
pm run test:e2e\`n- **Önemli:** Yerel e2e testlerini çalıştırmak için geliştirme sunucusu (Next.js \dev\ komutu ile) kullanılır. Testler çalıştırılmadan önce \.env.local\ içinde gerekli Supabase ortam değişkenlerinin bulunması gerekir.

## 6. Hata Yönetimi
- \console.log\ gibi doğrudan debug çağrıları yerine projeye dahil edilmiş olan \logger\ (src/utils/logger.js) aracını kullanın.
- React tarafında çökme yaşamamak için uygun yerlere (route bazlı) \error.js\ ve kök dizinde \global-error.js\ konulmuştur.
- 404 sayfaları için varsayılan bir \
ot-found.js\ şablonu özelleştirilmiştir.