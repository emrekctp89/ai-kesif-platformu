# AI Keşif Platformu — Sistem ve Site Gelişim Raporu

**İnceleme tarihi:** 27 Eylül 2026  
**İncelenen dal:** `main`  
**Kapsam:** yerel repo, kaynak kod, yapılandırma, testler, CI, migration'lar ve mevcut dokümantasyon  
**Hedef okuyucu:** proje sahibi, Grok, Claude Code ve diğer kodlama ajanları

> Bu belge bir “tamamlandı” beyanı değildir. Repo içinde görülebilen kanıtları, doğrulanmış kontrolleri ve önerilen uygulama sırasını kaydeder. Canlı Supabase politikaları, Vercel ayarları, gerçek kullanıcı metrikleri, Stripe hesabı ve production davranışı bu yerel incelemede doğrulanmadı.

## 1. Yönetici özeti

Proje, basit bir katalog MVP'sini aşmış durumda: 65 sayfa, 37 API rotası, Kâşif öneri motoru, Workmind, içerik/topluluk, geliştirici API'si, admin alanı, PWA, iki dil, Supabase ve kapsamlı otomatik test altyapısı var. Yerel kontrolde ESLint başarılı oldu; Jest'te **82 paket ve 586 test geçti**, 1 paket/1 test atlandı. Bu, iyi bir geliştirme tabanı olduğunu gösteriyor.

En büyük risk özellik eksikliği değil, büyüyen sistemin güvenilir biçimde işletilmesi. Kritik başlıklar şunlar:

1. Çalışma ağacında devam eden embedding göçü ve çok sayıda değiştirilmiş dosya var; yeni iş bunlarla karıştırılmamalı.
2. E2E testleri CI secret'ları yoksa başarıyla atlanıyor; ana kullanıcı yolculukları zorunlu bir kalite kapısı değil.
3. Yetkilendirme birçok dosyada `ADMIN_EMAIL` karşılaştırmasıyla tekrarlanıyor; merkezi rol/politika modeli ve negatif yetki testleri gerekiyor.
4. Bazı dosyalar aşırı büyümüş durumda; bakım, inceleme ve AI ajan bağlam maliyeti yükseliyor.
5. README ve bazı CI yorumlarında karakter kodlama bozuk; README en az 13 var olmayan yerel dosyaya bağlantı veriyor.
6. Dağıtık rate limit, ödeme idempotency, production RLS matrisi, readiness/alarmlar ve yedekten dönüş henüz yerel kod varlığıyla kanıtlanmış değil.
7. Ürün çok geniş bir yüzeye yayılmış; aktivasyon, ilk değer ve Kâşif kalitesi ölçülmeden yeni modül eklemek odağı dağıtabilir.

**Önerilen yön:** Önce 2 haftalık stabilizasyon ve güvenlik dönemi; sonra ölçülebilir ana akış/E2E; ardından mimari sadeleştirme ve performans; en son büyüme özellikleri.

## 2. İnceleme yöntemi ve sınırlar

İncelenen başlıca kaynaklar:

- `package.json`, `next.config.js`, `playwright.config.js`, Jest/ESLint yapılandırmaları
- `.github/workflows/*`, Docker/Vercel yapılandırmaları
- `src/app`, `src/components`, `src/lib`, `src/utils`
- `__tests__`, `src/**/__tests__`, `e2e`
- `supabase/migrations`, Edge Functions ve `supabase/config.toml`
- README, mevcut roadmap'ler ve `docs/`
- Git çalışma ağacı ve izlenen/atlanmış dosyalar

Çalıştırılan doğrulamalar:

| Kontrol                       | Sonuç        | Not                                                           |
| ----------------------------- | ------------ | ------------------------------------------------------------- |
| `npm run lint`                | Başarılı     | 27 Eylül 2026 yerel çalışma ağacı                             |
| `npm run test:ci -- --silent` | Başarılı     | 82/83 paket geçti; 586/587 test geçti; 1 paket/1 test atlandı |
| `npm run build`               | Başarılı     | 13 statik sayfa üretildi; ortak First Load JS 228 kB          |
| Canlı E2E                     | Doğrulanmadı | Gerçek test Supabase ortamı ve kontrollü fixture gerekli      |
| Canlı güvenlik/RLS            | Doğrulanmadı | Yerel migration görmek production politikasını kanıtlamaz     |
| Canlı performans              | Doğrulanmadı | RUM/Sentry/Vercel saha verisi gerekli                         |

## 3. Mevcut sistem fotoğrafı

### Teknik yapı

- Next.js 15.5 / React 19 / App Router
- Supabase Auth, PostgreSQL, RLS, RPC ve Edge Functions
- Gemini ve partner sağlayıcıları; Kâşif retrieval/eval/feedback altyapısı
- Tailwind, Radix UI, next-intl ile TR/EN
- Jest ve Playwright; GitHub Actions CI
- Sentry, Vercel Analytics/Speed Insights
- Stripe altyapısı mevcut, yeni ödemeler uygulama anahtarıyla geçici kapalı
- Serwist tabanlı PWA/service worker

### Ölçek göstergeleri

| Gösterge                  |                    Gözlenen değer |
| ------------------------- | --------------------------------: |
| `src` altındaki dosya     |                               526 |
| Sayfa rotası              |                                65 |
| API rotası                |                                37 |
| Test/spec dosyası         |                       yaklaşık 90 |
| Jest sonucu               |      82 paket / 586 başarılı test |
| En büyük istemci bileşeni | `AdminPageClient.js`, 3.580 satır |
| En büyük action modülü    |   `actions/tools.js`, 2.254 satır |
| Büyük Kâşif modülü        |      `packRunner.js`, 1.998 satır |

### Güçlü yanlar

- Ana modüllerin çoğunda testler var; Kâşif için ayrıca offline regresyon eval'i bulunuyor.
- Güvenlik başlıkları, CSP, service worker ve server-side Supabase ayrımı düşünülmüş.
- Migration'lar tarihli ve özellik bazlı; veri değişikliklerinin kaydı tutuluyor.
- Katalog kalite, link audit, embedding backfill ve Kâşif değerlendirme script'leri operasyonel düşüncenin başladığını gösteriyor.
- Önceki roadmap; kabul kriteri, geri alma ve ölçüm kavramlarını içeriyor.
- `.env.local` ve Google credential dosyası Git tarafından izlenmiyor. Buna karşılık `supabase/.temp/*` dosyalarının bir kısmı izleniyor; bunlar temizlenmeli.

## 4. Eksikler, hatalar ve riskler

Öncelik tanımı: **P0** güvenlik/veri/üretim engeli, **P1** ana akış ve sürdürülebilirlik, **P2** optimizasyon/büyüme.

### P0 — Önce çözülmesi gerekenler

#### P0.1 Çalışma ağacı ve embedding göçü kontrollü kapanmamış

İnceleme anında `.env.example`, roadmap, Kâşif retrieval/release, Gemini/embedding yardımcıları, testler, Supabase config ve migration'lar dahil çok sayıda dosya değiştirilmiş; yeni `text-embedding` Edge Function ve migration dosyaları var.

**Risk:** Yarım göç, 768/384 boyut karışması, eski ve yeni embedding alanlarının birlikte kullanılması, production RPC uyumsuzluğu veya geri dönüşsüz veri değişimi.

**Gerekli çıktı:** Tek amaçlı branch/PR; schema → Edge Function → tek kayıt smoke → kontrollü backfill → retrieval karşılaştırması → eski alanı kaldırma sırası. Migration ileri yönlü ve tekrar çalıştırılabilir olmalı; backfill öncesi kapsam/başarısızlık raporu alınmalı.

#### P0.2 Gerçek E2E kalite kapısı yok

CI ve ayrı E2E workflow'u, Supabase secret'ları yoksa tarayıcı testlerini başarılı biçimde atlıyor. Bu tasarım fork/PR kolaylığı sağlasa da korunan `main` için gerçek doğrulama sunmuyor.

**Risk:** Login, keşif, detay, karşılaştırma, kayıt ve Kâşif akışı kırıldığı halde PR yeşil olabilir.

**Gerekli çıktı:** İzole test projesi/branch DB, deterministik seed, her `main` PR'ında en az Chromium masaüstü + mobil smoke. Secret yoksa korunan dalda açık hata; dış katkı PR'ında sınırlı public smoke veya ayrı güven modeli.

#### P0.3 Yetkilendirme dağınık ve e-posta tabanlı

Admin kontrolü çok sayıda server action içinde `user.email === process.env.ADMIN_EMAIL` biçiminde tekrarlanıyor. Bazı ortak yardımcılar olsa da tek politika noktası yok.

**Risk:** Yeni action'da kontrol unutulması, davranış farklılığı, admin e-postası değişiminde operasyonel hata, RLS ile uygulama katmanının ayrışması.

**Gerekli çıktı:** Merkezi `requireUser`, `requireAdmin`, `requireOwnerOrAdmin` API'si; veritabanında rol/claim stratejisi; action/API/RLS yetki matrisi; anonim, kullanıcı A, kullanıcı B ve admin negatif testleri. Service-role yalnız sunucu modüllerinde kalmalı.

#### P0.4 Ödeme yeniden açılmadan idempotency ve mutabakat şart

Yeni ödeme alımı kapalı olsa da webhook ve mevcut üyelik yaşam döngüsü sistemde. Önceki roadmap de DB hata kontrolü, olay tekrarı ve süre kayması riskini açık bırakmış.

**Risk:** Aynı event'in iki kez hak tanıması, sırası ters event'lerin durumu bozması, DB yazımı başarısızken 2xx dönülmesi.

**Gerekli çıktı:** Stripe event tablosunda unique event ID, transaction/atomik hak güncelleme, event ordering kuralı, 5xx retry davranışı ve Stripe test clock/sandbox senaryoları. Bunlar geçmeden `PAYMENTS_ENABLED` açılmamalı.

#### P0.5 Dağıtık abuse/rate-limit koruması eksik

Mevcut limiter process içi `Map` kullanıyor. Tek instance testleri için uygun olsa da serverless instance'lar arasında ortak sayaç değil; IP başlığı doğrudan güvenilir kabul ediliyor.

**Risk:** Instance değiştirerek kota aşma, bellek büyümesi, proxy başlığı sahteciliği ve pahalı AI uçlarının maliyet saldırısına açık olması.

**Gerekli çıktı:** Supabase/Redis/KV üzerinde atomik, TTL'li sayaç; kullanıcı + güvenilir platform IP'si + endpoint maliyet ağırlığı; 429 ve `Retry-After`; abuse metriği. Özellikle Kâşif ask, AI üretim, scrape, feedback ve auth uçları test edilmeli.

### P1 — Ana ürün ve bakım kalitesi

#### P1.1 Büyük dosyalar değişiklik riskini artırıyor

Örnekler: `AdminPageClient.js` 3.580, `actions/tools.js` 2.254, `packRunner.js` 1.998, `KasifChatCore.js` 1.311, `actions/ai.js` 1.273 satır.

**Öneri:** Davranışı değiştirmeden dikey dilimlere ayırın. UI'da feature panel/hook/schema; backend'de auth, query, command, DTO ve sağlayıcı adaptörü sınırları kullanın. Her ayrıştırma öncesi characterization testi ekleyin. Sadece satır sayısı hedeflenmemeli; bağımlılık yönü ve tek sorumluluk esas olmalı.

#### P1.2 Dokümantasyon güvenilir değil

README'de mojibake/UTF-8 bozulması görülüyor. En az şu bağlantılar mevcut değil: `LICENSE`, `CODE_OF_CONDUCT.md`, `docs/user-guide.md`, `docs/collections.md`, `docs/comparison.md`, `docs/studio.md`, `docs/api.md`, `docs/database.md`, `docs/components.md`, `docs/deployment.md`, `docs/admin.md`, `docs/content-management.md`, `docs/user-management.md`.

**Risk:** Yeni geliştirici ve kodlama ajanı yanlış kurulum/özellik varsayımıyla çalışır.

**Gerekli çıktı:** README'yi gerçek repo yapısıyla eşleştirin; UTF-8 düzeltin; var olmayan belgeleri ya üretin ya bağlantıyı kaldırın. Markdown local-link checker CI'a eklenmeli. Tek aktif roadmap bu belgeye veya güncel bir ana roadmap'e yönlenmeli; eski dosyalar “historical” olarak işaretlenmeli.

#### P1.3 Supabase geçici dosyaları izleniyor

`supabase/.temp/cli-latest`, sürüm ve linked-project bilgileri gibi çalışma makinesine özgü dosyalar Git index'inde.

**Risk:** Gereksiz diff, ortam bilgisinin sızması, ekipler arasında CLI durum çakışması.

**Gerekli çıktı:** `supabase/.temp/` ignore edilmeli ve dosyalar index'ten çıkarılmalı. Geçmişte secret bulunup bulunmadığı ayrıca secret scanner ile kontrol edilmeli; gerçek secret bulunursa sadece silmek yetmez, anahtar döndürülmelidir.

#### P1.4 Gözlemlenebilirlik “altyapı var” seviyesinde

Sentry ve ops digest kodu var; ancak SLO, alarm eşiği, cron son-başarı kaydı, readiness ve restore tatbikatının canlı kanıtı yok.

**Gerekli çıktı:** `/api/health` liveness olarak kalsın, ayrı korumalı readiness bağımlılıkları ölçsün. 5xx, AI sağlayıcı hatası/maliyeti, cron gecikmesi, webhook kuyruğu ve retrieval zero-result için dashboard + alarm + runbook oluşturun. Aylık test DB restore tatbikatı yapın.

#### P1.5 Ürün yüzeyi geniş, ana değer metriği net işletilmiyor

Katalog, Kâşif, Workmind, stüdyo, topluluk, araştırma, yarışma, geliştirici portalı ve içerik üretimi aynı üründe. Kod tarafında event/funnel altyapısı olsa da canlı baseline bu incelemede yok.

**Öneri:** Kuzey yıldızı “haftalık doğrulanmış ilk sonuç üreten kullanıcı” olsun. Ziyaret → ihtiyaç ifadesi → öneri → araç seçimi → ilk çıktı → geri dönüş hunisi tek event sözlüğüyle ölçülsün. Yeni büyük özellik, bu hunide hangi metriği değiştireceğini belirtmeden başlamasın.

#### P1.6 Yerelleştirme ve metin tutarlılığı

UI içinde çok sayıda doğrudan Türkçe metin bulunuyor; bazı eski dosyalarda mojibake var. Bu durum TR/EN eşitliğini kod incelemesine bağımlı bırakıyor.

**Gerekli çıktı:** Kullanıcıya görünen literal metinler için lint/rapor, TR/EN anahtar eşitliği testi, kritik rotalarda iki dil E2E ve UTF-8 kontrolü. Admin-only metinler ayrı politika ile ertelenebilir.

### P2 — Performans, ölçek ve büyüme

#### P2.1 Build ve bundle maliyeti

Build sırasında Webpack 100–139 KiB büyük string cache uyarıları verdi. Çok sayıda client component ve büyük UI modülü bundle/hydration maliyeti yaratabilir.

**Gerekli çıktı:** Route bazlı bundle raporu, en ağır 10 modül, dinamik import adayları, client/server sınırı incelemesi. Hedefler: p75 LCP ≤ 2,5 sn, INP ≤ 200 ms, CLS ≤ 0,1; saha verisi yoksa sonuç “ölçülmedi” yazılmalı.

#### P2.2 Katalog kalite ve Kâşif retrieval

Mevcut roadmap 469 onaylı araçta embedding kapsamını önce %0 ölçmüş ve `gte-small` göçünü başlatmış. Bu çalışma henüz çalışma ağacında.

**Gerekli çıktı:** embedding kapsamı, model/sürüm, boyut ve üretilme zamanı kayıtlı olmalı. Versiyonlu TR/EN eval setinde precision@k/nDCG veya görev bazlı başarı, zero-result, p50/p95 süre ve istek maliyeti raporlanmalı. Keyword fallback ve vector sonuçları ayrı izlenmeli.

#### P2.3 Erişilebilirlik ve mobil kalite

Mobil Playwright projeleri var ancak gerçek ortam olmadığında atlanıyor; otomatik a11y kapısı görünmüyor.

**Gerekli çıktı:** 360 px temel akış smoke, klavye/focus testi, form hata duyuruları, modal focus trap ve axe tabanlı kritik sayfa taraması. Otomasyon, manuel ekran okuyucu kontrolünün yerine geçmemeli.

## 5. Önerilen yol haritası

### Faz 0 — Güvenli başlangıç (1–2 gün)

- Mevcut dirty worktree'yi iş sahibine göre ayır; embedding göçü için tek PR oluştur.
- Bu rapordaki baseline komutlarını kaydet.
- `supabase/.temp` takibini kaldır; secret/history taraması yap.
- README/doküman bağlantılarını gerçek durumla eşleştir.

**Çıkış kriteri:** Her değişiklik tek amaca ait; migration planı ve geri alma yaklaşımı yazılı; lint/test/build sonucu kaydedilmiş.

### Faz 1 — Güvenlik ve üretim doğruluğu (1–2 hafta)

- Merkezi auth/rol yardımcıları ve yetki matrisi.
- RLS negatif entegrasyon testleri.
- Dağıtık rate limiter ve AI maliyet koruması.
- Stripe webhook idempotency/mutabakat testleri; ödeme kapalı kalır.
- Cron/readiness/secret eksikliği fail-closed kontrolleri.

**Çıkış kriteri:** Açık P0 kalmaz; anonim/kullanıcı A/kullanıcı B/admin testleri yeşil; aynı Stripe event'i ikinci kez hak değiştirmez.

### Faz 2 — Ana yolculuk ve ölçüm (2 hafta)

- Deterministik test Supabase projesi ve seed/cleanup.
- Desktop + mobil E2E: ana sayfa, arama/filtre, araç detay, karşılaştırma, login, koleksiyon, Kâşif başarı/hata.
- Ortak analytics event sözlüğü ve funnel dashboard.
- Kâşif eval baseline ve katalog kalite dashboard'u.

**Çıkış kriteri:** Korunan dalda E2E atlanamaz; ana funnel olayları çift sayılmaz; Kâşif baseline sürüm kontrollü.

### Faz 3 — Mimari sadeleştirme ve performans (2–3 hafta)

- Büyük modülleri characterization testleriyle parçala.
- Server/client sınırlarını ve bundle'ı optimize et.
- Query sayısı, pagination, cache ve indeksleri gerçek ölçüme göre düzelt.
- UTF-8/i18n ve local-link CI kapılarını ekle.
- Kritik rotalarda axe + klavye + 360 px kontrolleri.

**Çıkış kriteri:** En riskli dosyalar anlamlı modüllere ayrılmış; route bundle ve Web Vitals baseline iyileşmiş veya en azından bütçe içinde; doküman linkleri yeşil.

### Faz 4 — Kontrollü büyüme (3–6 hafta, veriye bağlı)

- Kâşif sonuçtan işe geçiş ve Workmind entegrasyonunu sadeleştir.
- Aktivasyon darboğazına göre onboarding/geri dönüş deneyleri.
- Ödeme ancak Faz 1 kabul kriterleri ve sandbox E2E sonrası açılır.
- Topluluk/creator/geliştirici API yatırımları kullanım verisine göre sıralanır.

**Çıkış kriteri:** Her deney için hipotez, ana metrik, guardrail ve durdurma kuralı var; güvenilirlik metrikleri gerilemiyor.

## 6. Öncelikli görev havuzu

| ID  | Öncelik | Görev                                | Tahmin            | Bağımlılık                       | Kabul kriteri                                                                                 |
| --- | ------- | ------------------------------------ | ----------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| T01 | P0      | Embedding göçünü izole et ve doğrula | 2–4 gün           | Test/production Supabase erişimi | 384 boyut sözleşmesi; tek kayıt smoke; backfill raporu; retrieval regresyonu; geri alma planı |
| T02 | P0      | Merkezi auth ve yetki matrisi        | 3–5 gün           | Test DB                          | Tüm kritik action/API ortak guard kullanır; dört rol/persona için negatif test                |
| T03 | P0      | Zorunlu deterministik E2E ortamı     | 3–5 gün           | CI secret ve seed                | Main PR'larında desktop+mobil smoke atlanamaz; trace/report saklanır                          |
| T04 | P0      | Dağıtık rate limit ve abuse metriği  | 2–4 gün           | Ortak store seçimi               | Instance bağımsız atomik kota; TTL; 429 sözleşmesi; maliyetli uç testleri                     |
| T05 | P0      | Stripe idempotency ve mutabakat      | 3–5 gün           | Stripe test ortamı               | Tek event tek etki; out-of-order kuralı; DB hatasında retry; sandbox E2E                      |
| T06 | P1      | README/UTF-8/kırık link temizliği    | 1–2 gün           | Yok                              | Tüm yerel linkler mevcut; UTF-8 düzgün; link checker CI'da                                    |
| T07 | P1      | `supabase/.temp` ve secret hijyeni   | 0,5–1 gün         | Repo geçmişi erişimi             | Temp dosyaları index dışında; scanner sonucu belgeli; gerekiyorsa anahtarlar dönmüş           |
| T08 | P1      | Operasyon readiness ve alarm seti    | 2–4 gün           | Sentry/Vercel/Supabase erişimi   | SLO, dashboard, alarm, runbook; cron gecikmesi ve restore tatbikatı kanıtı                    |
| T09 | P1      | Ana funnel event sözlüğü             | 2–3 gün           | Ürün kararı                      | Tekilleştirilmiş event'ler; dashboard; veri kalite sorgusu; gizlilik kontrolü                 |
| T10 | P1      | Kâşif eval/retrieval baseline        | 3–5 gün           | T01, katalog verisi              | TR/EN versiyonlu set; kalite/gecikme/maliyet; CI regresyon eşiği                              |
| T11 | P1      | Büyük modülleri parçalama            | 5–10 gün, dilimli | Test kapsamı                     | Davranış değişmeden küçük PR'lar; characterization test; bağımlılık yönü net                  |
| T12 | P1      | i18n ve erişilebilirlik kapıları     | 3–5 gün           | T03                              | Anahtar eşitliği; kritik a11y smoke; mobil klavye/focus akışları                              |
| T13 | P2      | Bundle/query/performance bütçesi     | 3–5 gün           | Ölçüm erişimi                    | Route raporu; p75 hedefleri; budget ihlalinde CI uyarısı/kapısı                               |
| T14 | P2      | Ödeme yeniden açılış paketi          | 2–3 gün           | T02, T03, T05, T08               | Fiyat/hak/webhook E2E; rollback; destek/runbook; kontrollü feature flag                       |

## 7. Grok ve Claude Code için uygulama protokolü

Bu bölüm doğrudan ajan talimatı olarak kullanılmalıdır.

### Zorunlu çalışma kuralları

1. Başlamadan `git status -sb` ve ilgili dosyaların diff'ini oku. Kullanıcıya ait mevcut değişiklikleri silme, resetleme veya formatlama.
2. Aynı anda yalnız bir görev ID'si uygula. Kapsam dışı bulguyu kodlamak yerine bu raporun “Açık kararlar” bölümüne not et.
3. Değişiklikten önce ilgili testleri bul. Riskli refactor'da önce characterization/regresyon testi ekle.
4. Migration silme/değiştirme yerine ileri yönlü düzeltici migration tercih et. Production veri işlemi dry-run, limit, checkpoint ve tekrar çalıştırılabilirlik içersin.
5. Service-role, API key veya kişisel veri loglama. `.env.local` içeriğini rapora/çıktıya kopyalama.
6. Yeni kullanıcı metnini TR/EN birlikte ekle. Kullanıcıya görünen metni bileşene gömmekten kaçın.
7. Her PR küçük ve tek amaçlı olsun. Büyük dosya refactor'u ile davranış değişikliğini aynı PR'da birleştirme.
8. Canlı ortam, RLS, ödeme, e-posta veya dış servis davranışını yerel testten çıkarım yaparak “doğrulandı” sayma.

### Görev yürütme şablonu

```text
TASK_ID: Txx
GOAL: Tek cümlelik kullanıcı/operasyon sonucu
IN_SCOPE: Değiştirilebilecek modüller ve davranışlar
OUT_OF_SCOPE: Bilerek ertelenenler
PRECONDITIONS: Secret, test DB, fixture, ürün kararı
RISKS: Veri, güvenlik, uyumluluk, geri dönüş
IMPLEMENTATION:
  1. ...
  2. ...
TESTS:
  - hedef birim/entegrasyon testi
  - negatif test
  - gerekiyorsa E2E
ACCEPTANCE:
  - ölçülebilir sonuç
ROLLBACK:
  - kod ve veri için yöntem
EVIDENCE:
  - komutlar, test sayıları, ekran/rapor bağlantısı
```

### Asgari doğrulama komutları

```powershell
npm.cmd run lint
npm.cmd run test:ci -- --silent
npm.cmd run build
git diff --check
git status --short
```

Değişikliğe göre ayrıca:

```powershell
npm.cmd run kasif:evaluate:offline
npm.cmd run test:e2e -- --project=chromium --project=mobile-chrome
npm.cmd run catalog:quality-report
```

E2E veya canlı servis için gerekli ortam yoksa test “başarılı” yazılmamalı; **BLOCKED / NOT RUN** ve eksik önkoşul açıkça belirtilmeli.

## 8. Başarı göstergeleri

### Ürün

- Haftalık doğrulanmış ilk sonuç üreten benzersiz kullanıcı
- İhtiyaç ifadesinden araç seçimine ve ilk çıktıya dönüşüm
- 7/30 günlük geri dönüş; Kâşif önerisinden işe geçiş

### Kâşif ve katalog

- Retrieval görev başarısı, precision@k/nDCG veya görev-uygun metrik
- Zero-result, fallback ve hatalı sağlayıcı oranı
- p50/p95 gecikme ve başarılı sonuç başına maliyet
- Aktif katalogda erişilebilir link, tam metadata ve güncel embedding oranı

### Güvenilirlik ve güvenlik

- 5xx oranı, başarısız cron/webhook, alarmdan müdahaleye süre
- Yetkisiz erişim regresyonu: sıfır
- Çift/yanlış ödeme hakkı: sıfır
- Yedekten geri dönüş RTO/RPO tatbikat sonucu

### Teslimat

- Zorunlu CI başarı oranı ve medyan süresi
- Main'e kaçan hata, rollback ve change failure rate
- Atlanan test sayısı; flaky test oranı
- Kritik modüllerde sahiplik ve gözden geçirme süresi

## 9. Açık kararlar

Kod yazmadan önce iş sahibi tarafından netleştirilmesi gerekenler:

1. Önümüzdeki 8 haftanın tek ürün odağı Kâşif/araç keşfi mi, yoksa Workmind/creator/topluluk mu?
2. Test için ayrı Supabase projesi ve CI secret'ları sağlanacak mı?
3. Admin rolü tek e-posta mı kalacak, yoksa çoklu rol/organizasyon modeli mi gerekiyor?
4. Dağıtık rate limit için Supabase mi, harici Redis/KV mi tercih edilecek?
5. Stripe ödeme açılış hedef tarihi var mı? Yoksa ödeme kodu yalnız bakım modunda mı tutulacak?
6. Production SLO ve destek sorumlusu kim?

Bu kararlar verilene kadar T01, T06 ve T07 güvenle ilerleyebilir; T02 için gelecekteki rol modelini kilitlemeden ortak guard katmanı kurulabilir.

## 10. Önerilen ilk uygulama sırası

```text
T07 repo hijyeni
  → T06 doküman güvenilirliği
  → T01 embedding göçünü kapatma
  → T02 auth matrisi
  → T04 dağıtık rate limit
  → T03 zorunlu E2E
  → T05 ödeme doğruluğu
  → T08 operasyon
  → T09 + T10 ölçüm
  → T11 + T12 mimari/UX kalitesi
  → T13 performans
  → T14 kontrollü ödeme açılışı
```

Bu sırada yeni büyük özellik eklenmesi önerilmez. En yüksek getirili iş, mevcut geniş ürünün güvenilir, ölçülebilir ve değiştirilebilir hale gelmesidir.

---

### Doğrulama kaydı

- 27 Eylül 2026: `npm run lint` başarılı.
- 27 Eylül 2026: Jest — 82 paket başarılı, 1 paket atlandı; 586 test başarılı, 1 test atlandı.
- 27 Eylül 2026: Next.js production build başarılı; 13 statik sayfa üretildi. Ortak First Load JS 228 kB; ana sayfa 324 kB, admin 380 kB, araç detayı 375 kB, Workmind 343 kB. Webpack büyük string cache uyarıları verdi.
- Canlı E2E, production RLS, Stripe ve saha performansı çalıştırılmadı.
