# Kâşif yol haritası (notlar)

Bu dosya Kâşif’in **öneri motoru** ile **kataloga araç çekme** yönünü ayırır ve sıradaki işleri tutar.

Son güncelleme: 2026-07-26

---

## Strateji: dizin → iş bitirme

North Star artık yalnızca tıklama/affiliate değil:

`job_stated → tool_recommended → tool_selected → setup_started → setup_completed → first_result → job_done`

| Faz    | Durum | Ne                                                      |
| ------ | ----- | ------------------------------------------------------- |
| **P0** | ✅    | Job funnel kolon + API + self-report UI + admin hunisi  |
| **P1** | ✅    | Tüm goal sihirbazları (22 + default checklist + şablon) |
| **P2** | ✅    | Workmind ↔ Kâşif tek “görev oturumu”                    |
| **P3** | ✅    | Metin nişlerinde kopyala-yapıştır first_result bridge   |
| **P4** | ✅    | İş paketleri + Pro gate/kota + pack runner + pack stats |
| **P5** | ✅    | Partner API LLM zinciri + history follow-up kalitesi    |
| **P6** | ✅    | Add-tool ops + coding/legal/research pack runners       |

### P0 teknik yüzey

- `kasif_interactions.funnel` (jsonb) — migration `20260725120000_kasif_interactions_funnel.sql`
- `src/lib/kasif/funnel.js` — stage sırası, seed, stats
- `POST /api/kasif/funnel` — client stage ilerletme (token ile)
- `/kasif` — “Bu araçla devam et” + checklist + ilk sonuç / iş bitti self-report
- Admin **Kâşif kalite** — görev tamamlama hunisi kartı
- Analytics event’leri: `kasif_funnel_*`

### P1 teknik yüzey

- `src/lib/kasif/jobWizards.js` — 22 goal + default sihirbaz (video, music, legal, 3d, …)
- `JobFunnelPanel` — intent.goals → goal-specific checklist + kopyala
- Funnel meta: `goal`, `wizard_id`; analytics: `kasif_wizard_prompt_copy`

### P2 teknik yüzey

- `src/lib/kasif/jobSession.js` — session model, progress, Kâşif→Workmind handoff URL
- `POST /api/kasif/job-session` — Workmind oturumu için `kasif_interactions` + funnel seed
- Workmind: `JobSessionBar`, adım tamamla, araç seç → funnel, node yeşil durum
- `/kasif` → “Workmind'de adım adım planla” (`?goal=&from=kasif&interactionId=…&auto=1`)
- Generate meta: her yanıtta `goals` (Gemini yolunda da `understandQuestion`)

### P3 teknik yüzey

- `src/lib/kasif/resultBridge.js` — email / content / presentation doğrulama + fingerprint
- `POST /api/kasif/result-bridge` — paste → `first_result` (+ opsiyonel `job_done`), `funnel.result_artifact`
- `ResultBridgePanel` — JobFunnelPanel içinde (OAuth’sız kanıt)
- Admin hunisi: bridge paste sayısı / oranı
- Analytics: `kasif_result_bridge_paste`

### P4 teknik yüzey

- `src/lib/kasif/jobPacks.js` — 5 iş paketi (hedefler, Workmind prompt, adım etiketleri)
- `/kasif` — `JobPacksStrip` + öneri sonrası `JobPackSuggestion`
- Pack → Workmind: `?from=pack&pack=&goals=&auto=1`; job-session `packId` intent
- Bridge genişletme: `image-generation` (URL), `workflow-automation`, `meeting-notes`
- `/uyelik` — iş paketleri / orkestrasyon Pro konumlandırması
- Analytics: `kasif_pack_ask`, `kasif_pack_workmind`, `kasif_pack_matched_workmind`
- **Pro gate / kota**: proHint paketler — giriş + 2 ücretsiz/30g, sonrası Pro (`packAccess`)
- **Runner**: `POST /api/kasif/pack-runner` → 10 paket (+ code, legal, research)
- **Admin**: pack_id conversion kovaları + runner sayacı
- **Soft-landing conversion**: `fromSoftLanding` intent stamp + starter buckets + admin oranları
  (`shown → follow-up → sourced rec`); analytics: `kasif_soft_landing_*`
- **Eval CI**: `scripts/kasif-eval-cases.cjs` + offline Jest (`kasif:evaluate:offline` in CI);
  live `kasif:evaluate` via scheduled workflow when `KASIF_EVAL_URL` secret set

### P5 teknik yüzey

- **Partner LLM zinciri**: `src/lib/kasif/partnerRunner.js` — OpenAI-compatible chat
  (`KASIF_PARTNER_API_URL` + `KASIF_PARTNER_API_KEY` + opsiyonel model) → Gemini → local
- Pack runner’lar `callLlmJson` kullanır; `source`: `partner` | `gemini` | `local`
- Status (key sızdırmaz): `GET /api/kasif/partner/status` (+ `preferredSource`, `chain`, provider label)
- **Wizard**: tüm `GOAL_LABELS` anahtarları için checklist + prompt
- **History follow-up**: `isPriceOnlyRefinement` / `isTopicSwitchUtterance` / `isRankingFollowUp`
  — “bu kez ücretli” goal korur; “hayır, görsel…” topic switch; “en iyisi hangisi?” ranking

### P5.1 Partner OAuth UX (platform-first)

- **Görünür runner durumu**: `PackRunnerPanel` partner/Gemini/local badge + dostça source etiketi
- **Araç hesabı bağlama rehberi**: `partnerConnect.js` — runner sonrası 3 adım
  (Kâşif’ten araç seç → araç sitesinde OAuth/kayıt → Workmind / paste bridge)
- **Not**: aikeşif üçüncü taraf araç OAuth token’ı saklamaz; hesap bağlama araç sitesinde kalır
- **Admin**: Kâşif kalite sekmesinde Partner LLM durumu (host/model/zincir, key yok)

---

## Bugün ne var?

### Öneri motoru (`src/lib/kasif/*`)

- Katalog içi ranking, follow-up, meta, soft-landing, admin kalite paneli
- Job completion funnel (seed + self-report)
- Öneri cevapları platform kayıtlarından; pack runner’da opsiyonel Partner/Gemini JSON

### Katalog keşfi (`src/lib/toolDiscoveryCron.js`)

- Gemini aday üretimi + link doğrulama (HEAD/GET)
- Admin dry-run / live insert
- Scrape pipeline P0–P3 tamam; P4 Kâşif “bu aracı ekle” intent’i açık

---

### P5.2 Pack runner genişletme + add-tool intent

- **Paketler**: seo-brief, support-kit (+ P6: code-scaffold, legal-review, research-brief)
- **UI**: PackRunnerPanel adım adım çıktı + tam metin accordion
- **Add-tool**: `detectAddToolIntent` + `queueToolCandidateFromUrl`
  — scrape → `tools.is_approved=false` → admin pending queue
  — rate limit `kasif-add-tool` (5/saat); dizin host engeli korunur
  — eval dry path (`evaluation=true`) insert etmez

### P6 Add-tool ops + vertical packs

- **Admin analytics**: `buildAddToolStats` — queued / duplicate / missing_url / error + recent list
  (Kâşif kalite sekmesi)
- **Ops notify**: `KASIF_ADD_TOOL_NOTIFY=true` + Resend → `ADMIN_EMAIL` (opsiyonel)
- **Yeni pack’ler**: `code-scaffold` (Pro), `legal-review` (Pro), `research-brief` (free)
- Toplam **10** runnable pack

---

### P6.1 Runner source mix + learn deep links

- **Funnel stats**: `runnerSourceMix` / `runnerSourceCounts` + pack bazlı `sources`
- **Pack-runner**: `result_artifact.runner_source` stamp
- **Admin**: Kâşif kalite hunisinde partner/gemini/local rozetleri
- **Deep link**: `/kasif?pack=seo-brief&runner=1` → JobPacksStrip runner açar + scroll
- **Learn path**: packs/capstone modülleri pack+runner query ile bağlanır

---

### P6.2 Eval genişletme + soft-landing A/B

- **Offline pack eval**: `__tests__/lib/kasif-pack-addtool-eval.test.js` — 10 pack `runPack` + artifact
- **Add-tool cases**: shared `kasif-eval-cases` + offline/live skor (`expectAddTool*`)
- **Soft-landing A/B**: `softLanding.js` varyant A/B, sticky localStorage, API `softLandingVariant`
- **Starters**: sunucu `starters[]` chip listesi (seo/meeting/support dahil); analytics `kasif_soft_landing_shown`

---

### P6.3 Soft-landing A/B admin + pack smoke

- **Admin**: soft-landing varyant kovaları (A/B/unknown) — shown / follow-up / convertRate
- **Intent stamp**: follow-up’larda `softLandingVariant` (sticky client → API)
- **Pack smoke**: `npm run kasif:pack-smoke` / `kasif:evaluate:pack` (10 pack offline)

---

### P6.4 Paywall UX + add-tool success

- **Paywall**: `buildPackPaywall` — login vs kota mesajları, free runner alternatifi, `/login?next=`
- **JobPacksStrip / PackRunnerPanel**: kilit kartı + kota bitince banner
- **Add-tool UI**: badge (queued/duplicate/missing_url) + `/admin?tab=approval_queue`
- **Admin**: `?tab=` deep link (controlled Tabs)

---

### P6.5 Pro onboarding + add-tool admin inbox

- **ProPackOnboarding**: ilk Pro runner açılışında 4 adımlık tur (localStorage)
- **admin_alerts**: her Kâşif add-tool queue → `alert_type=kasif_add_tool` (+ opsiyonel e-posta)
- **Admin Uyarılar**: kasif_add_tool satırında slug/link + onay kuyruğu deep link

---

### P6.6 Onboarding metrics + i18n parity

- Pack runner stamps `proOnboardingStatus` / `proOnboardingCompleted` on intent
- Admin hunisi: complete / dismiss / none + Complete→FR + complete share of FR
- Jest i18n parity: packs paywall/onboarding + soft-landing/add-tool + admin keys

---

### P6.7 Soft-landing win-rate + Learn i18n parity

- `pickSoftLandingWinner`: min 20 follow-up/side → A/B/tie veya insufficient_sample
- Admin soft-landing kartında kazanan özeti + önde rozet
- i18n: full `Learn` / `LearnKasif` / `Kasif` / `AdminClient` key parity tests

---

### P6.8 Soft-landing pin flag + add-tool SLA

- Env: `KASIF_SOFT_LANDING_DEFAULT_VARIANT=A|B|ab` + optional `FORCE_VARIANT` (NEXT_PUBLIC_*)
- Yeni kullanıcı ataması pin’lenebilir; sticky client + server resolve
- Add-tool queued cevabı / UI: **1–3 iş günü** inceleme SLA (garanti değil)

---

### P6.9 Auto-pin soft-landing winner (ops, env-free)

- **DB**: `app_settings` key `kasif_soft_landing_pin` (migration `20260726120000_create_app_settings.sql`)
- **Priority**: env FORCE → ops pin → env DEFAULT → ab split
- **Admin**: Kâşif kalite → “Kazananı pinle” / “Pini kaldır” (`pinKasifSoftLandingWinner`)
- **Client**: `GET /api/kasif/soft-landing-config` sticky init
- **Server**: ask soft-landing path loads ops pin into `resolveSoftLandingVariant`

### P6.10 Add-tool “durumumu sor” follow-up

- `detectAddToolStatusIntent` + history URL/slug extract
- Lookup `tools` by slug/link/host → pending | approved | not_found
- Queued answer hints “durumumu sor” / “check my tool status”
- Intent `meta: add-tool-status` for analytics/admin samples

---

## Sıradaki adımlar (öneri motoru)

Öncelik sırasıyla tutulacak:

1. ~~P0–P6.10~~ ✅
2. **Shareable job receipt** — first_result/job_done özet kartı + kopyala link
3. **Pro pack ROI snapshot** — admin: pack başına FR/job_done maliyeti (runner source mix ile)

---

## Yeni yön: Web’den araç çekme (scraping)

### Amaç

Kâşif / admin akışının **yeni AI araçlarını web’den bulup** site kataloğuna aday olarak getirebilmesi.

### İlkeler

- **Öneri motoru** ile **keşif/scrape** ayrı katmanlar kalır (mevcut `toolDiscoveryCron` genişletilir)
- Ham scrape sonucu doğrudan publish edilmez: **aday → doğrulama → (opsiyonel) admin onay → insert**
- Yalnızca **resmî ürün siteleri**; dizin/aggregator hostları `toolLinkPolicy` ile engellenir
- Rate limit, `robots.txt` (30 dk cache), ToS saygısı, user-agent, timeout zorunlu
- Kullanıcı URL’lerinde özel/yerel ağ, DNS çözüm ve redirect hedefi engeli; yanıt boyutu üst sınırı zorunlu
- Ücretsiz API kotaları bitince self-hosted veya native `fetch` fallback

### Önerilen mimari (özet)

```
Kaynak seçimi (Product Hunt / resmi blog / arama sonucu URL listesi)
        ↓
Fetch / Scrape provider (ücretsiz API veya self-hosted)
        ↓
Normalize (name, link, description, pricing, platforms, category)
        ↓
Mevcut pipeline: link audit + blocked host + embedding + dry-run
        ↓
tools tablosu (is_approved=false veya autoApprove kuralları)
```

### Ücretsiz / düşük maliyet scrape seçenekleri (aday)

| Provider                      | Not                                                 |
| ----------------------------- | --------------------------------------------------- |
| **Jina Reader** (`r.jina.ai`) | URL → markdown; basit ve ücretsiz deneme için uygun |
| **Firecrawl**                 | Free tier; structured crawl                         |
| **Crawl4AI**                  | Self-hosted, ücretsiz                               |
| **Playwright/Puppeteer**      | Self-hosted JS render                               |
| **Native `fetch` + cheerio**  | Statik sayfalar, sıfır API maliyeti                 |

Env taslağı (ileride):

```bash
# KASIF_SCRAPE_PROVIDER=jina|firecrawl|native|crawl4ai
# FIRECRAWL_API_KEY=
# JINA_API_KEY=   # gerekirse
# KASIF_SCRAPE_ENABLED=false
```

### Uygulama fazları

| Faz       | İş                                                                                  |
| --------- | ----------------------------------------------------------------------------------- |
| **P0** ✅ | `scrapeToolPage(url)` + `native`/`jina`/`auto`; admin dry-run + onay kuyruğuna ekle |
| **P1** ✅ | Admin: kategori seçimi, opsiyonel Gemini enrich, toplu URL dry-run (max 5)          |
| **P2** ✅ | Seed URL listeleri; kategori kuyruğu; host+name dedupe (prefilter + insert gate)    |
| **P3** ✅ | Zamanlanmış cron; kota takibi; başarısız scrape retry; admin alert                  |
| **P4** ✅ | Kâşif sohbetinden “bu aracı ekle/incele” intent’i → onaysız admin kuyruğu           |

### Güvenlik / kalite kapıları (zorunlu)

- `getBlockedToolHost` + link audit (`checkToolLink`)
- Açıklama dil/uzunluk kuralları (`toolQuality`)
- Duplicate name/link kontrolü
- Scrape içeriğini asla kullanıcıya “doğrulanmış platform kaydı” diye sunma (önce DB + onay)

---

## Bilinçli ayrım

| Yetenek                  | Kâşif öneri motoru | Katalog scrape/keşif               |
| ------------------------ | ------------------ | ---------------------------------- |
| Kullanıcı sorusuna cevap | Evet (katalogdan)  | Hayır                              |
| Web’den yeni araç bulma  | Hayır (şimdilik)   | Evet (hedef)                       |
| Dış LLM                  | Kullanmaz          | Discovery’de Gemini kullanılabilir |
| Ücretsiz scrape API      | —                  | Evet, provider olarak              |

Öneri motorunun “yalnızca platform kayıtları” kuralı korunur. Scrape çıktısı önce katalog adayı olur; onaylandıktan sonra Kâşif sıralamasına girer.

---

## Notlar

- Kullanıcı tercihi: gerekirse **ücretsiz web scraping API**’leri kullanılacak.
- Mevcut discovery link check ve enrichment pipeline’ı yeniden kullanılacak; sıfırdan ikinci bir insert yolu açılmayacak.
