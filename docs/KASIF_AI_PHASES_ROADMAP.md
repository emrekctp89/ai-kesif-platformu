# Kâşif AI — Faz 1–5 uygulama ve canlıya geçiş roadmap’i

Son güncelleme: 2026-08-01
Çalışma dalı: `codex/kasif-phases`

## Güncel entegrasyon notu — 2026-07-29

- Roadmap ve bağımsız Kâşif public/server sınırı `main` çalışma ağacına geri alındı.
- Faz 1 hibrit retrieval, `gemini-embedding-2` (768 boyut), eksik embedding yenileme servisi
  ve günlük `/api/cron/tool-embeddings` cron’u entegre edildi.
- Yerel doğrulama: boundary/workmind 4 test; Faz 1 retrieval/embedding 17 test başarılı.
- Canlı read-only ölçüm: 467 approved aracın 467’sinde embedding eksik. Backfill henüz
  çalıştırılmadı; production verisi değiştirilmedi.
- Faz 2 clustering backend’i, haftalık goal-candidate cron’u, admin kabul/red arayüzü ve
  RLS’li migration güncel çalışma ağacına entegre edildi. Migration henüz uygulanmadı.
- Faz 1–2 + boundary + i18n hedefli doğrulama: 6 suite / 30 test başarılı.
- Faz 3 gap analizi sonrası yalnız eksik LLM-understanding katmanı entegre edildi:
  regex → learned alias → partner/Gemini → local fallback; canonical taxonomy doğrulaması ve
  confidence/source kaydı eklendi.
- Faz 3 hedefli doğrulama: 5 suite / 71 test başarılı.
- Production read-only kontrolünde `kasif_lexicon_aliases` erişilebilir ve Gemini yapılandırılmış;
  Partner API henüz yapılandırılmamış. Bu nedenle canlı zincir şu an Gemini → local çalışabilir.
- Faz 4 gap analizi sonrası opaque claim, HMAC-SHA256 webhook doğrulaması, beş dakikalık
  timestamp penceresi, tek kullanımlık/replay korumalı evidence transaction’ı ve
  verified/self-report metrik ayrımı entegre edildi.
- Faz 4 hedefli doğrulama: 4 suite / 25 test başarılı; ESLint ve i18n parity temiz.
- Production read-only kontrolde completion claim/event tabloları erişilebilir; ancak
  `KASIF_PARTNER_WEBHOOK_SECRETS_JSON` içinde yapılandırılmış provider yok. Gerçek partner
  sandbox doğrulaması yapılmadan verified completion metriği dış iletişimde kullanılmamalı.
- Faz 5 gap analizi sonrası yalnız yeni authenticated interaction’lara `user_id` sahipliği,
  tamamlanmış iş/pack tabanlı yeni araç sıralaması, authenticated-only API, sahiplik kontrollü
  shown/clicked/dismissed event’leri ve Kâşif “Senin için yeni” arayüzü entegre edildi.
- Proaktif event POST yüzeyine ayrıca 120/saat rate limit eklendi; eski anonim kayıtlar için
  tahmine dayalı backfill yapılmadı.
- Faz 5 hedefli doğrulama: 4 suite / 19 test ve bileşen suite’inde 14 test başarılı.
- Production read-only kontrolde `kasif_interactions.user_id` henüz yok (`42703`). Kod bu durumda
  anonim kayda güvenli fallback yapar ve öneri API’si boş sonuç döndürür; Faz 5 migration’ı
  uygulanmadan kişiselleştirme canlıda veri biriktirmez.

## Belgenin amacı

Bu belge Kâşif AI için planlanan beş fazın:

- başlangıç durumunu;
- repoda tamamlanan işleri;
- ilgili commit ve teknik yüzeyleri;
- doğrulama sonuçlarını;
- canlıya geçiş bağımlılıklarını;
- güvenilir biçimde kullanılabilecek metrikleri;
- dış ekip veya production erişimi gerektiren engelleri

tek yerde tutar.

Bu roadmap “kod yazıldı” ile “özellik production’da çalışıyor” durumlarını özellikle ayırır.

## Durum özeti

| Alan                           | Repo durumu                   | Production durumu                               | Commit     |
| ------------------------------ | ----------------------------- | ----------------------------------------------- | ---------- |
| Bağımsız Kâşif domain sınırı   | Tamamlandı                    | Ana dala alınması doğrulanmalı                  | `e0ec01b6` |
| Faz 1 — Hibrit retrieval       | Tamamlandı                    | Migration, embedding ve cron bekliyor           | `531f4a4b` |
| Faz 2 — Otomatik taksonomi     | Tamamlandı                    | Veri hacmi, migration ve cron bekliyor          | `531f4a4b` |
| Faz 3 — LLM anlama katmanı     | Tamamlandı                    | Provider/API aktivasyonu bekliyor               | `776173a7` |
| Faz 4 — Doğrulanmış completion | Tamamlandı                    | Partner webhook anlaşmaları bekliyor            | `7822d8e4` |
| Faz 5 — Proaktif öneriler      | İlk güvenli katman tamamlandı | Migration ve yeni authenticated geçmiş bekliyor | `b54e50e9` |

## Mimari başlangıç noktası: bağımsız Kâşif domain’i

Commit: `e0ec01b6`

Kâşif’in platform içindeki resmi modül sınırı:

- `@/lib/kasif`: client-safe public API;
- `@/lib/kasif/server`: route ve server action API’si;
- engine, job session, integrations ve job wizard dosyaları: iç implementasyon;
- Workmind, Admin ve platform action’ları: doğrudan iç dosyalar yerine public giriş noktaları;
- boundary testi: platform kodunun yeniden Kâşif iç dosyalarına bağlanmasını CI’da engeller.

Bu commit faz dalının başlangıç commit’i değildir. Faz dalı ana dala alınmadan önce `e0ec01b6` ile
rebase/merge edilmeli ve public export uyumluluğu tekrar doğrulanmalıdır.

---

## Faz 1 — Var olan retrieval altyapısını devreye alma

### Hedef

Mevcut ILIKE/lexicon eşleşmesini hızlı ve ücretsiz fast-path olarak korumak; sonuç bulunamadığında
veya güvenli eşleşme sayısı düşük kaldığında pgvector tabanlı `match_tools` aramasına düşmek.

### Uygulananlar

- Lexical fast-path korunur.
- Fast-path güven eşiği yapılandırılabilir.
- Düşük güven veya yetersiz sonuçta Gemini embedding üretilir.
- `match_tools` RPC ile vector fallback yapılır.
- Vector sonuçları katalog kayıtlarıyla hydrate edilir.
- Lexical ve vector sonuçları tekilleştirilerek birleştirilir.
- Vector/provider hatasında lexical sonuçlara güvenli dönüş yapılır.
- Embedding üretimini zamanlanmış çalıştıracak cron yüzeyi eklendi.

### Teknik yüzey

- `src/lib/kasif/retrieval.js`
- `scripts/generate_embeddings.mjs`
- `/api/cron/tool-embeddings`
- `match_tools` RPC ve `tools.embedding`

### Konfigürasyon

- `GEMINI_API_KEY`
- `KASIF_VECTOR_MATCH_THRESHOLD`
- `KASIF_VECTOR_MATCH_COUNT`
- `KASIF_FAST_PATH_CONFIDENT_MATCHES`
- Cron yetkilendirme secret’ı

### Production kabul kriterleri

- Approved katalog araçlarının en az %95’inde embedding bulunması.
- Embedding cron’unun yeni/değişmiş araçları idempotent biçimde güncellemesi.
- Fast-path hit-rate ve vector fallback-rate ölçümlerinin izlenmesi.
- Provider arızasında lexical aramanın çalışmaya devam etmesi.
- Türkçe ve İngilizce eval setlerinde retrieval kalitesinin baseline’ın altına düşmemesi.

---

## Faz 2 — Taksonomiyi veriden beslenen sisteme dönüştürme

### Hedef

Kâşif’in cevaplayamadığı soft-landing sorgularını haftalık olarak gruplayıp admin paneline yeni goal
adayları olarak taşımak. Lexicon değişiklikleri otomatik yayınlanmaz; insan onayı korunur.

### Uygulananlar

- Soft-landing etkileşimleri clustering girdisi olarak seçilir.
- Soru embedding’leri oluşturulur.
- Benzer sorgular deterministik kümelere ayrılır.
- Küme etiketi, anahtar kelimeler, örnek sorular, occurrence ve similarity değerleri üretilir.
- Adaylar `kasif_goal_candidates` tablosuna idempotent biçimde yazılır.
- Admin review akışı için `pending`, `accepted`, `rejected` durumları oluşturuldu.
- Haftalık cron endpoint’i eklendi.
- Kabul edilen adayların kontrollü biçimde learned lexicon’a dönüşebilmesi için kalıcı katman eklendi.

### Teknik yüzey

- `src/lib/kasif/goalCandidates.js`
- `/api/cron/kasif-goal-candidates`
- `kasif_goal_candidates`
- `kasif_learned_lexicon`
- İlgili Supabase migration’ları

### Güvenlik ve yönetişim

- Aday goal, otomatik olarak production lexicon’a girmez.
- Admin review insan denetimi olarak kalır.
- Örnek sorular kişisel veri ve hassas içerik bakımından yayınlanmadan önce gözden geçirilmelidir.
- Ham sorguların saklama süresi ve silme politikası ayrıca tanımlanmalıdır.

### Production kabul kriterleri

- Son 30–90 günde yeterli soft-landing hacmi.
- Haftalık cron’un başarılı ve idempotent çalışması.
- Admin review kuyruğunun sahipliği ve SLA’i.
- Kabul edilen goal’lar için eval vakası eklenmesi.
- Learned lexicon değişikliklerinin geri alınabilir olması.

---

## Faz 3 — LLM’i anlama katmanına ekleme

### Hedef

Regex/lexicon fast-path’i maliyetsiz ilk katman olarak korumak; yalnız düşük güvenli sorularda mevcut
partner → Gemini → local zincirini `understandQuestion` için kullanmak.

### Uygulananlar

- Yüksek güvenli regex/lexicon sonucu doğrudan kullanılır.
- Düşük güvende partner runner üzerinden yapılandırılmış intent istenir.
- Provider zinciri:
  1. OpenAI-compatible partner;
  2. Gemini;
  3. local fallback.
- LLM sonucu şema ve izin verilen goal/concept listeleriyle sınırlandırılır.
- Geçersiz veya düşük kaliteli provider sonucu local anlayışa geri döner.
- Başarılı yeni eşleşmeler learned lexicon’a yazılabilir.
- Provider kaynağı analytics/meta içine taşınır.

### Teknik yüzey

- `src/lib/kasif/understanding.js`
- `src/lib/kasif/partnerRunner.js`
- `src/app/api/kasif/ask/route.js`
- `kasif_learned_lexicon`

### Maliyet ve güven kuralları

- Her soru LLM’e gönderilmez.
- Fast-path daima ilk sıradadır.
- Timeout ve provider hatası kullanıcı akışını durdurmaz.
- LLM’in önerdiği goal/concept serbest metin olarak kabul edilmez.
- Learned lexicon yazımı confidence ve tekrar sinyalleriyle sınırlandırılır.

### Production kabul kriterleri

- En az bir provider’ın production’da etkin olması.
- Latency, fallback oranı, token maliyeti ve intent doğruluğu dashboard’u.
- LLM kullanılan ve kullanılmayan sorgular için ayrı kalite karşılaştırması.
- Öğrenilen lexicon girdilerinin gözden geçirme ve geri alma mekanizması.

---

## Faz 4 — Doğrulanmış completion ve güven katmanı

### Hedef

Kullanıcının “yaptım” beyanını doğrulanmış completion’dan ayırmak; dış iletişimde yalnız kanıtlı
tamamlama oranlarının kullanılmasını sağlamak.

### Uygulananlar

- Result bridge self-report kayıtları açıkça:
  - `verified: false`;
  - `verification: "self_report"`
    olarak işaretlenir.
- 15 content/SEO/sosyal araç için pilot allowlist oluşturuldu.
- Tek kullanımlık, 24 saatlik opaque completion claim endpoint’i eklendi.
- HMAC-SHA256 imzalı partner webhook protokolü eklendi.
- İmza girdisi: `{timestamp}.{rawBody}`.
- Beş dakikalık timestamp toleransı uygulanır.
- Partner event ID ve claim için replay/idempotency koruması vardır.
- Claim tüketimi, evidence insert ve funnel update tek DB transaction’ında yapılır.
- Ham webhook payload’ı ve claim token’ı saklanmaz; hash ve minimum kanıt tutulur.
- Admin funnel/ROI görünümünde:
  - doğrulanmış completion;
  - self-report completion;
  - verified completion / first-result;
  - verified completion / job-stated
    ayrı gösterilir.

### Pilot allowlist

- `hoppycopy`
- `adcreative`
- `ahrefs-nsfeya`
- `google-trends-e1d1nu`
- `anyword`
- `copymatic`
- `paragraphai`
- `longshotai`
- `youwrite-ct3syc`
- `optimizely`
- `bloomreach`
- `demandbase`
- `domo`
- `callrail`
- `adext-ai`

Allowlist, bu partnerlerin bugün canlı webhook gönderdiği anlamına gelmez. Bunlar onboarding için
hedeflenen/pilot araçlardır.

### Teknik yüzey

- `/api/kasif/completion-claim`
- `/api/kasif/completion-webhook/[provider]`
- `src/lib/kasif/completionVerification.js`
- `src/lib/kasif/COMPLETION_WEBHOOKS.md`
- `kasif_completion_claims`
- `kasif_completion_events`
- `record_kasif_verified_completion(...)`

### Pazarlama metriği kuralı

Şu ifade kullanılabilir:

> Doğrulanmış partner completion sinyali bulunan kullanıcıların %X’i ilk oturumda işi tamamladı.

Şu ifade yalnız self-report verisiyle kullanılmamalıdır:

> Kullanıcıların %X’i işi tamamladı.

### Production kabul kriterleri

- En az bir gerçek partner secret’ı ve webhook anlaşması.
- OAuth state veya partner job metadata içine claim token aktarımı.
- Webhook replay, expired claim ve invalid signature alarm/ölçümleri.
- Gerçek partner sandbox’ında uçtan uca doğrulama.
- Metrik yayınlamadan önce yeterli örneklem büyüklüğü.

---

## Faz 5 — Reaktiften proaktife

### Hedef

Dönen, giriş yapmış kullanıcıya geçmiş tamamlanmış işleri ve seçtiği paketlerle ilişkili yeni katalog
araçlarını göstermek.

### Başlangıçta bulunan kritik boşluk

`kasif_interactions` geçmişi vardı ancak kayıtların kullanıcı sahibi yoktu. `user_id` olmadan
geçmişi güvenli biçimde dönen kullanıcıyla ilişkilendirmek mümkün değildi.

### Uygulanan ilk güvenli katman

- `kasif_interactions.user_id` eklendi.
- Yeni authenticated Kâşif istekleri kullanıcıya bağlanır.
- Anonymous istekler anonymous kalır.
- Yalnız:
  - `job_done` aşamasına ulaşmış işler;
  - veya açıkça seçilmiş `packId`
    öneri teması olur.
- Araç, kaynak interaction’dan sonra kataloğa eklenmiş olmalıdır.
- Daha önce seçilen veya interaction kaynaklarında bulunan araçlar elenir.
- Goal, soru ve katalog açıklamasından lexical relevance skoru çıkarılır.
- Düşük güvenli eşleşmeler bastırılır.
- Kullanıcı Kâşif sayfasına döndüğünde en fazla üç öneri görür.
- Gösterim, tıklama ve gizleme event’leri kaydedilir.
- Gizlenen öneri tekrar gösterilmez.
- Event yazımından önce interaction’ın authenticated kullanıcıya ait olduğu doğrulanır.

### Teknik yüzey

- `/api/kasif/proactive`
- `src/lib/kasif/proactiveRecommendations.js`
- `src/lib/kasif/PROACTIVE_RECOMMENDATIONS.md`
- `kasif_interactions.user_id`
- `kasif_proactive_events`
- `KasifExperiment` içindeki “Senin için yeni” kartları

### Gizlilik sınırı

- Eski anonymous interaction’lar kullanıcıya tahmin yoluyla bağlanmaz.
- Service-role erişimi yalnız server tarafında kullanılır.
- Proaktif event tabloları browser rollerine açılmaz.
- İlk katman yalnız Kâşif sayfasında gösterilir.
- E-posta, push veya notification-center dağıtımı için ayrıca açık izin, frekans sınırı ve unsubscribe
  politikası gerekir.

### Production kabul kriterleri

- Migration sonrası yeterli authenticated history birikmesi.
- Öneri gösterim → tıklama → yeni job başlatma hunisi.
- Kullanıcı başına frekans sınırı.
- Aynı aracın tekrar gösterilmesini sınırlayan cooldown.
- Katalogdaki `created_at` ve approval zamanının güvenilir tutulması.
- CTR yanında dismiss ve downstream completion ölçümü.
- Kişiselleştirmeyi kapatma tercihi.

---

## Doğrulama özeti

### Domain boundary

- 4 ilgili suite geçti.
- 16/16 test başarılı.
- ESLint, Prettier ve commit hook’ları temizdi.

### Faz 1–3

- İlgili unit/API/regression testleri çalıştırıldı.
- Faz 3 sonunda 10 suite / 106 test başarılıydı.

### Faz 4

- Tüm Kâşif regresyon seti:
  - 67 suite başarılı;
  - 505 test başarılı;
  - 1 bilinçli skip.
- ESLint’te yeni hata yok.
- Değişen dosyalar Prettier kontrolünden geçti.
- Production build tamamlandı; mevcut iki public export uyarısı raporlandı.

### Faz 5

- Tüm Kâşif regresyon seti:
  - 68 suite başarılı;
  - 508 test başarılı;
  - 1 bilinçli skip.
- ESLint’te yeni hata yok.
- Mevcut `JobFunnelPanel` hook uyarısı devam ediyor.
- Değişen dosyalar Prettier kontrolünden geçti.
- Build kaynak derleme aşamasını geçti; mevcut public export uyarılarından sonra Windows build worker
  `3221226505` ile kapandı.

### Son entegrasyon doğrulaması — 29 Temmuz 2026

- Next.js route dosyalarındaki destek fonksiyonu export’ları ayrıştırıldı.
- `npx tsc --noEmit --pretty false` başarılı.
- Güncel Kâşif odaklı regresyon: 42 suite / 318 test başarılı, 1 bilinçli skip.
- Tam ESLint kontrolü 0 hata ve 0 uyarıyla başarılı.
- Next.js production build’i başarıyla tamamlandı; Kâşif API rotaları build çıktısında doğrulandı.
- `git diff --check` başarılı.

## Bilinen kod/entegrasyon uyarıları

Kod tarafında canlıya geçişi engelleyen bilinen bir derleme, tip, lint veya Kâşif regresyon hatası
kalmadı. Aşağıdaki işler ortam, veri, secret veya dış partner sahipliği gerektirir.

---

## Dış engeller ve sahiplik gerektiren işler

### 1. Supabase migration’ları

Durum: **Engelli — production uygulaması gerekli**

Production’a uygulanması gereken faz migration’ları:

- goal candidate / interaction embedding;
- learned lexicon;
- verified completion evidence;
- proactive recommendation ownership ve event tabloları.

Gerekli işlemler:

1. Migration sırasını staging’de doğrula.
2. `supabase migration list` ile local/remote farkını kontrol et.
3. Migration’ları staging’e uygula.
4. RLS/grant/advisor sonuçlarını kontrol et.
5. Smoke test sonrası production’a geçir.

### 2. Gemini API

Durum: **Kısmen etkin — Google proje erişimi/kota engeli sürüyor**

- Project: `276581158121`
- Generative Language API etkin ve model kataloğu okunabiliyor.
- Text üretim kotası `0`; embedding çağrısı `403 project denied access` dönüyor.
- Google proje erişimi/billing düzelmeden vector embedding ve Gemini fallback production’da çalışmaz.

### 3. Katalog embedding backfill

Durum: **Kod/runbook hazır — Google embedding erişimi engelli**

- 2026-08-01 canlı ölçümünde 467/467 approved aracın embedding’i eksik; smoke çağrısı
  Google tarafından reddedildiği için production verisi değiştirilmedi.
- Faz 1 kodu + P6.20 tooling hazır: `getToolEmbeddingCoverage`, güvenli batch refresh,
  offline CLI (`--status` / `--dry-run` / `--loop`), `docs/EMBEDDING_BACKFILL.md`.
- Vector fallback fayda üretmez ta ki coverage ≥ %95 olana kadar.
- Sıra: Google embedding erişimi/billing düzelt → `npm run tools:embeddings:status` → küçük batch smoke →
  `tools:embeddings:backfill` → daily `/api/cron/tool-embeddings` doğrula.

### 4. Partner LLM provider

Durum: **Engelli — provider hesabı/secret gerekli**

Eksik production değişkenleri:

- `KASIF_PARTNER_API_URL`
- `KASIF_PARTNER_API_KEY`
- opsiyonel `KASIF_PARTNER_MODEL`

Provider olmadan zincir Gemini/local fallback’e devam eder; ancak Faz 3’ün partner-first hattı aktif olmaz.

### 5. Soft-landing veri hacmi

Durum: **Engelli — organik veri gerekli**

- Son 90 günlük canlı soft-landing interaction sayısı: `0`.
- Faz 2 clustering kodu hazırdır ancak anlamlı goal adayı üretmek için gerçek örnek yoktur.
- Önce logging/migration deployment’ı doğrulanmalı, ardından yeterli veri birikmelidir.

### 6. Learned lexicon kalıcılığı

Durum: **Engelli — migration gerekli**

- Dynamic learned lexicon migration’ı production’da uygulanmadan Faz 3 öğrenmeleri kalıcı olmaz.
- Migration sonrası review, expiry ve rollback operasyonu tanımlanmalıdır.

### 7. Partner completion webhook’ları

Durum: **Engelli — dış partner koordinasyonu gerekli**

- `KASIF_PARTNER_WEBHOOK_SECRETS_JSON` production’da tanımlı değil.
- Allowlist partnerlerinin gerçek OAuth/job metadata ve completion webhook desteği doğrulanmadı.
- En az bir partner sandbox entegrasyonu tamamlanmadan verified completion metriği dışarı açıklanamaz.

### 8. Eski anonymous Kâşif geçmişi

Durum: **Kalıcı veri sınırı**

- Eski interaction’larda `user_id` yoktur.
- Bu kayıtlar kullanıcıya güvenli biçimde otomatik bağlanamaz.
- Faz 5 kişiselleştirmesi migration sonrası oluşan authenticated geçmişle büyür.
- Eski kayıtlar için tahmine dayalı backfill yapılmamalıdır.

### 9. Proaktif dış kanal izni

Durum: **Ürün/hukuk kararı gerekli**

- Mevcut Faz 5 yalnız Kâşif sayfasında öneri gösterir.
- E-posta, push ve notification-center için:
  - açık kullanıcı tercihi;
  - unsubscribe;
  - frekans sınırı;
  - sessiz saatler;
  - veri saklama süresi
    tanımlanmalıdır.

### 10. Dal entegrasyonu ve build

Durum: **Tamamlandı — yerel entegrasyon doğrulandı**

- Faz dalı: `codex/kasif-phases`
- Boundary commit: `e0ec01b6`
- Grok’un eşzamanlı değişiklikleri ayrı tutuldu.
- Boundary ayrımı, route export’ları, Kâşif regresyonu, tip kontrolü, ESLint ve production build
  güncel çalışma ağacında doğrulandı.

---

## Önerilen canlıya geçiş sırası

### Aşama A — Kod entegrasyonu

- [x] `e0ec01b6` ve `codex/kasif-phases` değişikliklerini güncel çalışma ağacında birleştir.
- [x] Public API/route export uyarılarını düzelt.
- [x] Boundary testini çalıştır.
- [x] Kâşif regresyonunu çalıştır.
- [x] Production build’i temiz biçimde tamamla.

### Aşama B — Staging veritabanı

- [ ] Faz migration’larını sırayla uygula.
- [ ] RLS, grants ve DB advisor sonuçlarını incele.
- [ ] Cron endpoint’lerini staging secret’larıyla doğrula.
- [ ] Rollback prosedürünü yaz.

### Aşama C — Retrieval ve taxonomy

- [ ] Gemini API’yi etkinleştir.
- [x] Offline backfill CLI + coverage raporu + ops runbook (`docs/EMBEDDING_BACKFILL.md`).
- [ ] `tools:embeddings:status` ile coverage ölç; küçük batch smoke.
- [ ] 467 (veya güncel) araçlık backfill’i ≥ %95’e tamamla.
- [ ] Günlük embedding cron’unu production’da doğrula (`coverageAfter`).
- [ ] Soft-landing logging ve haftalık clustering cron’unu doğrula.

### Aşama D — LLM understanding

- [ ] Partner provider’ı yapılandır.
- [ ] Düşük güven eşiğini eval setiyle kalibre et.
- [ ] Provider latency, hata ve maliyet dashboard’unu aç.
- [ ] Learned lexicon review akışını işlet.

### Aşama E — Verified completion

- [ ] Bir pilot partner seç.
- [ ] OAuth state/job metadata claim aktarımını uygula.
- [ ] Sandbox webhook testini tamamla.
- [ ] Invalid signature/replay/expired claim alarmlarını kur.
- [ ] Yeterli örneklem oluşana kadar metriği internal tut.

### Aşama F — Proaktif öneriler

- [ ] Authenticated history birikimini izle.
- [ ] İlk öneri cohort’unu aç.
- [ ] CTR, dismiss ve downstream completion ölç.
- [x] 7 günlük frekans ve 30 günlük araç cooldown limitlerini ekle.
- [x] Authenticated kullanıcı kişiselleştirme tercihini ekle; production migration 2026-08-01'de doğrulandı.
- [ ] Yalnız yeterli kalite sonrası dış kanal seçeneklerini değerlendir.

## North-star ve koruyucu metrikler

### North-star

`verified_job_done / job_stated`

Bu oran yalnız doğrulanmış partner evidence bulunan completion’ları içerir.

### Destekleyici metrikler

- Fast-path hit rate
- Vector fallback rate
- Soft-landing rate
- Goal candidate acceptance rate
- LLM fallback rate
- Cost per understood low-confidence query
- First result / job stated
- Verified completion / first result
- Proactive suggestion CTR
- Proactive suggestion dismiss rate
- Proactive suggestion → new job
- Proactive suggestion → verified completion

### Guardrail metrikleri

- Invalid/replayed webhook oranı
- Provider timeout oranı
- Yanlış/ilgisiz proaktif öneri geri bildirimi
- Kullanıcı başına haftalık öneri sayısı
- Opt-out oranı
- Anonymous/authenticated veri ayrımı ihlali
- Retrieval latency p95

## “Tamamlandı” tanımı

Bir faz ancak aşağıdakilerin tümü sağlandığında production’da tamamlandı kabul edilir:

1. Kod ana dala entegre edilmiştir.
2. Migration ve environment değişkenleri production’da uygulanmıştır.
3. İlgili cron/provider/partner entegrasyonu gerçek ortamda çalışmaktadır.
4. İzleme ve hata alarmı vardır.
5. Rollback yolu belgelenmiştir.
6. Kabul kriterleri gerçek veride doğrulanmıştır.
7. Kullanılan dış metrikler kanıt seviyesini doğru ifade etmektedir.
