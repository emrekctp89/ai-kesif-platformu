# AI Keşif Platformu — Uygulama Yol Haritası

Tarih: 2026-09-13. İncelenen yerel temel: `c2c1b19f` ve mevcut çalışma ağacı.
Durum: geliştirme devam ediyor. Bu belge önceki “proje tamamlandı” listesinin yerini alır.

## Amaç ve kapsam

Kullanıcının ihtiyacını tanımlayıp doğru aracı seçmesi ve doğrulanabilir bir ilk sonuç üretmesi ana ürün hedefidir. Katalog, Kâşif ve Pro akışı bu hedef etrafında geliştirilir. Yeni özelliklerden önce güvenilirlik ve ölçüm tamamlanır.

İnceleme; paket komutları, CI, Jest/Playwright yapılandırması, API hız sınırlama, ödeme/webhook, PWA kaynağı, Kâşif belgeleri ve migration envanterine dayanır. Canlı Supabase politikaları, üretim metrikleri, Stripe ayarları ve tüm ekranlar doğrulanmadı. Dosyada altyapı bulunması, üretimde çalıştığı anlamına gelmez. Süreler tek geliştirici için ilk tahmindir; haftalık gözden geçirilir.

Başlangıçta main, yereldeki origin/main referansından iki commit gerideydi; 12 izlenen dosyada değişiklik ve bir yeni dosya vardı. Kullanıcı değişiklikleri korunur; entegrasyon öncesinde uzak farklar ayrıca incelenir.

## Mevcut durum ve kanıtlar

| Alan             | Gözlem                                                                                                                | Sonuç / yapılacak iş                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Uygulama         | Next.js 15.5, React 19, Supabase, Stripe, Gemini; yerelleştirilmiş App Router                                         | Geniş yüzey mevcut; özellik tamamlanması akış testi gerektirir                |
| Kalite kapıları  | `.github/workflows/ci.yml`: lint, Jest, offline eval, build                                                           | E2E işi yok; Jest komutu test yokken başarıya izin veriyor                    |
| Yerel doğrulama  | `package.json`: verify yalnız lint + build                                                                            | Testleri ortak doğrulama komutuna dahil et                                    |
| E2E              | `playwright.config.js`: mobil projeler yorumda                                                                        | Mobil kapsam aktif değil                                                      |
| E2E beklentileri | `e2e/navigation.spec.js`: URL kontrolü `/\//`                                                                         | Yanlış sayfada bile geçebilir; gerçek hedef/sonuç kontrolü gerekli            |
| Rate limit       | `src/lib/rateLimit.js`: modül genelinde Map, kayan reset yanıtı, sınırda eski pencere                                 | İlk uygulama paketinde düzeltildi; dağıtık kota ayrıca gerekli                |
| Ödemeler         | `src/app/api/stripe-webhook/route.js`: promosyon update hatası kontrol edilmiyor, süre işleme zamanından hesaplanıyor | DB hatasında yanlış başarı ve tekrarlı olayda süre kayması riski              |
| PWA              | `src/app/sw.js`: defaultCache, push click URL açılışı                                                                 | Oturumlu içerik/cache ve bildirim URL politikası test edilmeli                |
| Operasyon        | `/api/health` yalnız liveness; Kâşif ops digest, cron ve Sentry altyapısı var                                         | Readiness, alarm ve kurtarma tatbikatı ayrı doğrulanmalı                      |
| Dokümantasyon    | Önceki roadmap ölçüm kanıtı olmadan coverage, ölçekleme, SSO tamamlandı diyor                                         | Doğrulanmamış işler yeniden açık; mock SSO üretim SSO sayılmaz                |
| Kâşif            | `docs/KASIF_ROADMAP.md`, eval komutları, funnel ve receipt altyapısı                                                  | Yeni geliştirmeler mevcut modülleri genişletmeli; yinelenen motor kurulmamalı |

## Öncelik ve teslim planı

P0: kullanıcı/veri/ödeme doğruluğu ve sürüm güvenilirliği. P1: ana kullanıcı yolculuğu ve ölçülebilir kalite. P2: büyüme ve ölçek. Roller planlama amaçlıdır; atanmış ekip varsayılmaz.

| ID  | Öncelik / tahmin                      | İş ve çıktı                                                                                        | Kabul kriteri                                                                                                                        | Bağımlılık / rol                          |
| --- | ------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| R01 | P0 / 0.5 gün                          | Hız sınırlayıcı izolasyonu ve sabit pencere düzeltmesi                                             | Aynı token ile farklı limiterlar bağımsız; reset sabit; tam sınırda yeni pencere; regresyon testleri yeşil                           | Yok / backend                             |
| R02 | P0 / 1–2 gün                          | Başlangıç test/build raporu; yerel değişiklikler ve uzak iki commit entegrasyon incelemesi         | Değişiklik sahipliği korunur; başarısızlıklar dosya ve komutla kaydedilir; bütünleşik lint/Jest/build yeşil                          | R01 / bakım                               |
| R03 | Ertelendi; açılış öncesi P0 / 2–3 gün | Stripe promosyon DB hatalarını kontrol et; event idempotency, ödeme durumu ve olay sıralaması      | Başarısız DB yazımı 5xx; aynı olay iki kez süreyi uzatmaz; geçersiz imza reddedilir; sandbox ödeme/iptal/yeniden deneme testleri     | R02, test Stripe + test DB / backend      |
| R04 | P0 / 2–4 gün                          | Auth/RLS/API güvenlik matrisi; admin, kullanıcı ve anonim sınırları                                | Başkasının koleksiyon/proje/mesajına erişim reddedilir; admin ve service-role sırları istemciye gitmez; negatif entegrasyon testleri | İzole test DB / backend                   |
| R05 | P0 / 1–2 gün                          | CI’da zorunlu gerçek test keşfi, ortak verify komutu ve test raporu                                | Sıfır test başarı sayılmaz; lint + Jest + build tek komutla çalışır; başarısız kontroller birleşmeyi engeller                        | R02 / bakım                               |
| R06 | P0 / 2–3 gün                          | HTTP çıkışları ve abuse incelemesi: ikon, scraper, webhook, redirect; dağıtık kota tasarımı        | Özel IP/redirect testleri; timeout/boyut limitleri; instance bağımsız atomik kota için seçilmiş ve test edilmiş çözüm                | R04; mevcut ikon değişiklikleri / backend |
| R07 | P1 / 3–5 gün                          | Deterministik E2E veri seti ve CI Chromium + mobil smoke                                           | TR/EN giriş, keşif, detay, karşılaştırma, kaydetme, Kâşif hata/başarı yolları gerçek sonuçla doğrulanır; trace saklanır              | R04–R05, izole DB / kalite                |
| R08 | P1 / 2–3 gün                          | Katalog veri kalite raporu: mükerrer alan adı, kırık link, boş fiyat/platform, kategori, embedding | Önce dry-run raporu; değişiklikler denetlenebilir; onaylı/aktif araç görünürlüğü testli; embedding kapsama oranı ölçülür             | R02 / veri                                |
| R09 | P1 / 3–5 gün                          | Kâşif kalite tabanı: TR/EN niyet, retrieval, follow-up, sıfır sonuç, sağlayıcı hatası              | Versiyonlu eval kümesi; mevcut baseline gerilemez; gecikme ve istek maliyeti raporu; kanıtsız job_done ayrı sayılır                  | R08 / AI-backend                          |
| R10 | P1 / 3–4 gün                          | Ana akış UX: mobil filtre, boş/hata/yükleme durumu, karşılaştırma ve koleksiyona geçiş             | 360px ekranda yatay taşma yok; klavye ile tamamlanır; etiket/focus/kontrast sorunları kapalı; E2E kanıtı                             | R07 / frontend                            |
| R11 | P1 / 2–3 gün                          | Yerelleştirme ve SEO: TR/EN metin, canonical/hreflang, sitemap, gizli sayfalar                     | Yanlış dil/link yok; taslak/onaysız içerik sitemap’e girmez; metadata ve indeksleme kontrolleri                                      | R08, R10 / frontend                       |
| R12 | P1 / 2–4 gün                          | Performans tabanı ve ölçüme göre optimizasyon                                                      | Keşif/detay/Kâşif için bundle ve sorgu raporu; hedef p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; saha verisi yoksa “ölçülmedi”              | R07, saha ölçümü / frontend-backend       |
| R13 | P1 / 2–3 gün                          | Operasyon: readiness, cron başarısı, hata/maliyet alarmları, geri alma ve yedek tatbikatı          | Kontrollü bağımlılık kesintisi fark edilir; cron son başarı görünür; geri yükleme test DB’de denenir; sorumlu ve runbook belirli     | R03–R06 / operasyon                       |
| R14 | P1 / 1–2 gün                          | PWA cache, çıkış sonrası gizlilik ve bildirim URL doğrulaması                                      | Oturum kapatınca özel içerik offline görünmez; harici/tehlikeli notification URL reddedilir; yeni SW güncellemesi testli             | R07 / frontend                            |
| R15 | P2 / 3–5 gün                          | Aktivasyon ve Pro dönüşüm ölçümü; fiyat/limit açıklığı                                             | Ziyaret→öneri→seçim→ilk sonuç→Pro hunisi ölçülür; ödeme hakları backend ile tutarlı; yinelenen olaylar sayılmaz                      | R03, R09, R13 / ürün                      |
| R16 | P2 / 3–5 gün                          | Topluluk ve admin iş akışı: moderasyon, rapor, bildirim, toplu işlem                               | Yetki matrisi testli; toplu işlem kısmi hata/yeniden deneme raporlar; moderasyon eylemleri izlenir                                   | R04, R07 / full-stack                     |
| R17 | P2 / 2–4 gün                          | Geliştirici API sözleşmesi ve doküman bütünlüğü                                                    | OpenAPI ile yanıtlar uyumlu; pagination/kota/auth sözleşme testleri; README kırık referansları ve kurulum doğrulanır                 | R05–R06 / backend                         |
| R18 | P2 / keşif 2 gün                      | SSO, yeni partnerler ve ölçek yatırımı için karar belgesi                                          | Talep, maliyet ve teknik gereksinim kanıtı; SSO mock tamamlandı sayılmaz; uygulama ayrı tahminlenir                                  | R15 ve müşteri talebi / ürün              |

## Takvim ve bağımlılıklar

- Sprint 0, ilk 1–2 gün: R01, R02; doğrulanmış başlangıç raporu.
- Sprint 1, hafta 1–2: R03–R06; güvenlik ve ödeme doğruluğu, CI kapıları.
- Sprint 2, hafta 3–4: R07–R09; otomatik ana akışlar, katalog ve Kâşif baseline.

R08 için salt-okunur rapor komutu: `npm run catalog:quality-report -- --output=catalog-quality.json`. Rapor yalnızca onaylı araçlardaki eksik alanları, isim/domain çakışmalarını, önceki link denetim sonuçlarını ve embedding kapsamasını ölçer. Canlı veri baseline'ı için Supabase service key ve URL gerekli; rapor üretilmeden otomatik düzeltme yapılmaz.

- Sprint 3, hafta 5–6: R10–R12; mobil kullanım, dil/SEO ve ölçülen performans.
- Sprint 4, hafta 7–8: R13–R15; operasyon, PWA gizliliği ve dönüşüm.
- Sprint 5, hafta 9–10+: R16–R18; moderasyon, API ve talebe bağlı büyüme.

Tahmini toplam 10–12 hafta; test ortamı kurulumu, bulunan güvenlik sorunları ve üretim verisi bekleme süreleri takvimi uzatabilir. Aynı anda en fazla bir ana iş ve bir doğrulama işi açık tutulur. Öncelik haftalık bulgu ve kullanıcı etkisine göre güncellenir.

## Başarı ölçümü

- Ana metrik: haftalık doğrulanmış ilk sonuç üreten benzersiz kullanıcı. Self-report ve bağımsız kanıt ayrı raporlanır.
- Aktivasyon: öneri alanlar içinde araç seçenler ve ilk sonuca ulaşanlar; adım bazında payda sabit tanımlanır.
- Kâşif: niyet/retrieval başarı oranı, sıfır sonuç, p50/p95 gecikme, sağlayıcı hata oranı ve başarılı sonuç başına maliyet.
- Katalog: aktif/onaylı araçlarda erişilebilir link, güncel metadata, embedding kapsaması ve mükerrer oranı.
- Güvenilirlik: 5xx, başarısız cron/webhook, başarısız ödeme hak eşlemesi; ilk hedef sessiz ödeme kaybı olmaması.
- Teslim kalitesi: zorunlu CI kontrolleri yeşil, ana E2E akışları yeşil, bilinen kritik güvenlik/ödeme hatası sıfır.
- Dönüşüm: Pro checkout başlatma/tamamlama ve ilk değer üretme oranları. İlk iki hafta baseline toplanmadan büyüme yüzdesi vaat edilmez.

## Sürüm kabulü ve geri alma

Her değişiklikte ilgili regresyon testleri, lint ve gerekli build çalıştırılır. DB/politika değişikliği test ortamında doğrulanır; migration, veri etkisi ve geri alma yöntemi yazılır. Checkout ve webhook gerçek ücret yerine sandbox ile test edilir. Ana akış E2E ve mobil kontrolü tamamlanmadan kullanıcı akışı tamamlandı sayılmaz. Canlıya çıkan sürümde sağlık, hata ve ödeme metrikleri karşılaştırılır; bozulmada önceki sürüme dönülür. Şema geri dönüşü veri kaybı yaratıyorsa geri migration yerine düzeltici migration planlanır.

## Başlatılan işler / yürütme kaydı

- [x] Repo yapısı, eski roadmap, CI, test yapılandırması ve kritik kod yüzeyleri incelendi.
- [x] Kanıt, öncelik, tahmin, bağımlılık ve kabul kriterleri olan bu plan yazıldı.
- [x] R01 kodu: sayaç Map’i limiter örneğine taşındı; reset pencere başlangıcına bağlandı; tam süre sınırı düzeltildi.
- [x] R01 için üç regresyon testi eklendi: izolasyon, sabit reset, tam sınır.
- [x] R01 doğrulandı: hedef test dosyasında 8/8 test başarılı.
- [ ] R02 uzak commit entegrasyonu ve E2E başlangıç raporu açık.
- [ ] Güncel sıra: R05 test kapıları, ardından R04/R07. R03 ödeme yeniden açılışına ertelendi.

Dağıtık kota ve Map kapasitesi R01 kapsamı dışında hâlâ açıktır. `uniqueTokenPerInterval` sert bellek üst sınırı değildir; süre aşmış kayıt temizleme eşiğidir. Mevcut API çağrılarında token önekleri kullanıldığı için izolasyon düzeltmesi bugün gözlenen uçlar arası bir kesinti iddiası değildir; yardımcı fonksiyonun bağımsız örnek sözleşmesini düzeltir.

### Doğrulama sonuçları (2026-09-13)

- `npm.cmd test -- --runInBand --ci --silent`: 78 paket, 562 test başarılı; 1 paket/test atlandı. Bu genel çalışmanın ardından R01 ayrıca doğrulandı.
- `npm.cmd test -- --runInBand --ci src/lib/__tests__/rateLimit.test.js`: 8/8 test başarılı; yeni üç regresyon dahil.
- İlk `npm.cmd run lint`: başarılı. Değişiklik sonrası kontrol ayrıca çalıştırıldı.
- `git diff --check`: başarılı.
- İlk inceleme anında E2E ve canlı servis doğrulaması mevcut değildi; sonraki R07 çalışmasında yerel E2E kapsamı tamamlandı. Canlı servis doğrulaması ve izole test verisi hâlâ açık.
- Build, `public/sw.js` üretilen dosyasını yeniden oluşturabilir; bu dosya inceleme başlangıcında zaten değişikti.

- Değişiklik sonrası `npm.cmd run lint`: başarılı.
- `npm.cmd run build`: başarılı; 13 statik sayfa üretildi. Ortak First Load JS 228 kB, ana sayfa 324 kB; R12 için başlangıç ölçümü. Webpack büyük cache string ve Edge/static generation uyarıları var; derlemeyi engellemedi.

## 2026-09-13 — Ödemelerin geçici kapatılması ve CI devamı

Kullanıcı kararı: yeni ödeme alımları şimdilik kapalı, sayfa içinde “yakında açılacak” bilgilendirmesi gösterilecek. R03 ödeme geliştirmesi yeniden açılış öncesine ertelendi; sıradaki çalışma R05 test kapıları ve ardından R04/R07.

- [x] `src/lib/paymentAvailability.js`: yeni satın alımlar için ortak `PAYMENTS_ENABLED = false` anahtarı.
- [x] Pro ve sponsorluk server action girişleri, auth/DB/Stripe çağrısından önce durdurulur ve üyelik bilgilendirmesine yönlendirir.
- [x] TR/EN üyelik sayfası, bağımsız Pro formu ve sponsorluk bileşeni “yakında” mesajı gösterir. Yeni ödeme formu, promo kod alanı, aktif fiyat ve anında erişim vaatleri kapalı durumda gösterilmez.
- [x] Kapalı modda üyelik sayfası ürün/fiyat tablolarını sorgulamaz; ücretsiz keşfe geçiş sunar. SSS mevcut durumu açıklar.
- [x] Mevcut abonelik hakları, iptal/fatura yönetimi ve webhook mutabakatı korunur. Bu değişiklik Stripe hesabındaki abonelikleri veya daha önce oluşturulmuş oturumları iptal etmez.
- [x] R05 uygulaması: `npm run test:ci` eklendi; `verify` lint + test + build çalıştırır. CI’daki `--passWithNoTests` kaldırıldı. Önceden var olan CI değişiklikleri korundu.
- [ ] R05 uzak branch protection ve CI çalışması ayrıca doğrulanacak; yerel düzenleme bu ayarları değiştirmez.
- [ ] Yeniden açılış: önce R03 ödeme doğruluğu, sandbox entegrasyonu ve mevcut Stripe durumunu doğrula; ardından ortak anahtarı açıp TR/EN akış testlerini çalıştır.

Eklenen testler: doğrudan Pro/sponsorluk action çağrılarının Stripe ve DB’ye ulaşmaması; TR/EN, girişli/girişsiz ödeme görünümü; sponsorlukta URL kaynaklı yanıltıcı başarı mesajının engellenmesi; ürün verisi olmadan üyelik bilgilendirmesi.

## 2026-09-14 — Yetkilendirme ve E2E kalite kapıları

- [x] Proje güncelleme, silme, içerik değiştirme ve AI strateji işlemlerine oturum + açık sahiplik kontrolü eklendi. Mutation sorguları ayrıca `user_id` ile sınırlandı.
- [x] Hatalı proje içerik JSON'u mevcut öğeler silinmeden reddediliyor.
- [x] Mesaj gönderme ve sohbeti okundu işaretleme işlemleri, kullanıcının `conversation_participants` kaydı doğrulandıktan sonra çalışıyor.
- [x] Kullanıcı aramasındaki PostgREST filtre karakterleri temizleniyor; iki karakterden kısa sorgular DB'ye ulaşmıyor.
- [x] Yetkisiz ve başka kullanıcıya ait kaynak senaryoları için 12 regresyon testi eklendi.
- [x] Playwright'a Pixel 5 tabanlı `mobile-chrome` projesi eklendi. Testler deterministik olması için tek worker çalışıyor.
- [x] CI production build sonrası Chromium kurup masaüstü + mobil smoke testlerini çalıştırıyor ve raporu 14 gün saklıyor.
- [x] Eski gezinme, auth, karşılaştırma ve araç detay kontrolleri TR/EN uyumlu hale getirildi; kategori testi gerçek hedef URL'yi doğruluyor.
- [x] Ödeme kapalı durumu için masaüstü ve mobil E2E testi eklendi.
- [x] Yerel doğrulama: Jest 82 paket / 584 test başarılı, 1 test atlandı; lint başarılı; gezinme E2E 4/4 başarılı; ödeme E2E ilk hedefli koşuda masaüstü ve mobil başarılı.
- [x] Tüm 26 E2E testi tek koşuda yeşil: Chromium + Pixel 5, tek worker, 26/26 başarılı (2026-09-14). İlk yerel koşu 8 worker ile geliştirme sunucusunu aşırı yüklemişti; paralellik, locale ve erişilebilirlik seçicileri düzeltildi.
- [x] Tam pakette görülen arama önerisi hatası düzeltildi: `tools` tablosunda bulunmayan `category_name` alanı yerine `categories(name, slug)` ilişkisi kullanılıyor; öneri çıktısı eski UI sözleşmesine normalize ediliyor.
