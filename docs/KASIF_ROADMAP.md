# Kâşif yol haritası (notlar)

Bu dosya Kâşif’in **öneri motoru** ile **kataloga araç çekme** yönünü ayırır ve sıradaki işleri tutar.

Son güncelleme: 2026-07-24

---

## Bugün ne var?

### Öneri motoru (`src/lib/kasif/*`)

- Katalog içi ranking, follow-up, meta, soft-landing, admin kalite paneli
- Dış LLM ile serbest sohbet yok; cevaplar platform kayıtlarından üretilir

### Katalog keşfi (`src/lib/toolDiscoveryCron.js`)

- Gemini aday üretimi + link doğrulama (HEAD/GET)
- Admin dry-run / live insert
- Henüz genel amaçlı web scraping pipeline’ı yok

---

## Sıradaki adımlar (öneri motoru)

Öncelik sırasıyla tutulacak:

1. **Canlı eval regresyonu** — `npm run kasif:evaluate` (meta/soft/concept case’leri dahil) CI veya periyodik koşu
2. **Soft-landing → conversion** — soft-landing sonrası starter tıklama / başarılı öneri oranı (analytics)
3. **Kaynak kartı A/B kopyası** — `reasons` metinlerinin okunabilirlik ince ayarı
4. **Concept gürültüsü izleme** — feedback report + forbiddenConcepts eval setini büyütme
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
| **P1**    | Admin UI: “URL’den aday çek” dry-run; mevcut discovery formuna bağla                |
| **P2**    | Seed URL listeleri / kategori bazlı tarama kuyruğu; dedupe by host+name             |
| **P3**    | Zamanlanmış cron; kota takibi; başarısız scrape retry; admin alert                  |
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
