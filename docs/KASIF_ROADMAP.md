# Kâşif yol haritası (notlar)

Bu dosya Kâşif’in **öneri motoru** ile **kataloga araç çekme** yönünü ayırır ve sıradaki işleri tutar.

Son güncelleme: 2026-07-25

---

## Strateji: dizin → iş bitirme

North Star artık yalnızca tıklama/affiliate değil:

`job_stated → tool_recommended → tool_selected → setup_started → setup_completed → first_result → job_done`

| Faz    | Durum | Ne                                                                |
| ------ | ----- | ----------------------------------------------------------------- |
| **P0** | ✅    | Job funnel kolon + API + self-report UI + admin hunisi            |
| **P1** | ✅    | Top job sihirbazları (goal checklist + kopyalanabilir şablon)     |
| **P2** | ✅    | Workmind ↔ Kâşif tek “görev oturumu”                              |
| **P3** | ✅    | Metin nişlerinde kopyala-yapıştır first_result bridge             |
| **P4** | ✅    | İş paketleri + Pro gate/kota + content-studio runner + pack stats |

### P0 teknik yüzey

- `kasif_interactions.funnel` (jsonb) — migration `20260725120000_kasif_interactions_funnel.sql`
- `src/lib/kasif/funnel.js` — stage sırası, seed, stats
- `POST /api/kasif/funnel` — client stage ilerletme (token ile)
- `/kasif` — “Bu araçla devam et” + checklist + ilk sonuç / iş bitti self-report
- Admin **Kâşif kalite** — görev tamamlama hunisi kartı
- Analytics event’leri: `kasif_funnel_*`

### P1 teknik yüzey

- `src/lib/kasif/jobWizards.js` — 10 goal + default sihirbaz (adımlar, prompt şablonları, first-result tanımı)
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
- **Runner**: `POST /api/kasif/pack-runner` → 5 paket (content, sales, meeting, social, pitch) Gemini/local
- **Admin**: pack_id conversion kovaları + runner sayacı

---

## Bugün ne var?

### Öneri motoru (`src/lib/kasif/*`)

- Katalog içi ranking, follow-up, meta, soft-landing, admin kalite paneli
- Job completion funnel (seed + self-report)
- Dış LLM ile serbest sohbet yok; cevaplar platform kayıtlarından üretilir

### Katalog keşfi (`src/lib/toolDiscoveryCron.js`)

- Gemini aday üretimi + link doğrulama (HEAD/GET)
- Admin dry-run / live insert
- Scrape pipeline P0–P3 tamam; P4 Kâşif “bu aracı ekle” intent’i açık

---

## Sıradaki adımlar (öneri motoru)

Öncelik sırasıyla tutulacak:

1. **Partner API runner** — seçili araç OAuth ile gerçek dış çağrı
2. **Canlı eval regresyonu** — `npm run kasif:evaluate` CI veya periyodik koşu
3. **Soft-landing → conversion** — soft-landing sonrası starter tıklama / başarılı öneri oranı
4. **Wizard kapsamı** — kalan goals için sihirbaz ekle (video, music, legal, …)
5. **History’li follow-up kalitesi** — fiyat daraltması / konu değişimi edge case testleri

---

## Yeni yön: Web’den araç çekme (scraping)

### Amaç

Kâşif / admin akışının **yeni AI araçlarını web’den bulup** site kataloğuna aday olarak getirebilmesi.

### İlkeler

- **Öneri motoru** ile **keşif/scrape** ayrı katmanlar kalır (mevcut `toolDiscoveryCron` genişletilir)
- Ham scrape sonucu doğrudan publish edilmez: **aday → doğrulama → (opsiyonel) admin onay → insert**
- Yalnızca **resmî ürün siteleri**; dizin/aggregator hostları `toolLinkPolicy` ile engellenir
- Rate limit, robots/ToS saygısı, user-agent, timeout zorunlu
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
| **P4**    | Kâşif sohbetinden “bu aracı ekle/incele” intent’i (admin gate)                      |

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
