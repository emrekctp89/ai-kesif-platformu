# Katalog embedding backfill — ops runbook

Son güncelleme: 2026-07-30

Faz 1 hibrit retrieval, eksik embedding olduğunda `match_tools` vector fallback’e düşer.
Production kabul eşiği: **approved araçların ≥ %95’inde embedding**.

Bu runbook, 467 (veya güncel) approved aracı güvenli batch’lerle doldurmak ve günlük
cron’u doğrulamak içindir.

## Önkoşullar

| Gereksinim                        | Not                                                       |
| --------------------------------- | --------------------------------------------------------- |
| `GEMINI_API_KEY`                  | Generative Language API **etkin** olmalı                  |
| `GEMINI_EMBED_MODEL`              | Varsayılan `gemini-embedding-2` (768 boyut)               |
| `SUPABASE_SERVICE_ROLE_KEY`       | Offline script için tercih edilir                         |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL                                      |
| `CRON_SECRET`                     | Canlı cron tetiklemek için Bearer token                   |
| `tools.embedding` + `match_tools` | Migration `20260705095915_add_vector_search_to_tools.sql` |

API kapalıysa script/cron hata verir; production verisi kısmen güncellenmiş kalabilir —
batch idempotent’tir (`embedding IS NULL` satırları).

## Hızlı komutlar

```bash
# 1) Kapsam ölç (yazma yok)
npm run tools:embeddings:status

# 2) Gemini API/model/dimension probe (tek API çağrısı, DB yazmaz)
npm run tools:embeddings:probe

# 3) Küçük dry-run (liste, Gemini/DB yazmaz)
npm run tools:embeddings:dry-run

# 4) Kontrollü ilk batch (ör. 25 araç)
node scripts/generate_embeddings.mjs --limit=25 --delay-ms=500

# 5) Kalanları döngüyle doldur (batch başına 100, en fazla 10 tur)
npm run tools:embeddings:backfill
```

Cron (Vercel, günde bir 03:30 UTC):

```text
GET /api/cron/tool-embeddings
Authorization: Bearer $CRON_SECRET
# opsiyonel: ?limit=100&delayMs=200
```

Yanıtta `coverageBefore` / `coverageAfter`, `updated`, `failed`, `hasMore` gelir.

## Önerilen üretim sırası

### A. Smoke (maliyet/kalite)

1. Staging veya production **read-only** status:
   `npm run tools:embeddings:status`
2. Generative Language API’nin 768 boyutlu vektör döndürdüğünü DB’ye yazmadan doğrula:
   `npm run tools:embeddings:probe`
3. Probe başarılıysa tek araçlık kontrollü yazma yap:
   `node scripts/generate_embeddings.mjs --limit=1 --delay-ms=0`
4. `match_tools` RPC ile bir sorgu dene (Kâşif ask veya SQL).

### B. Kontrollü backfill

1. `--limit=25` ile ilk tur; hata oranını izle.
2. Hata yoksa `--limit=100 --loop --max-batches=5`.
3. Her tur sonunda coverage satırını kaydet (ops notu / ticket).
4. `%95+` olana kadar tekrarla veya daily cron’a bırak.

### C. Sürekli bakım

1. Vercel cron `/api/cron/tool-embeddings` etkin (zaten `vercel.json`).
2. Yeni onaylanan araçlar: discovery/add-tool insert embedding dener; kaçanlar cron ile dolar.
3. Haftalık status: coverage `%95` altına düşerse alarm / ticket.

## Güvenlik ve maliyet

- Script **yalnız approved** araçlara yazar; `is_approved=false` aday kuyruğuna dokunmaz.
- Varsayılan **only-missing**: mevcut vektörleri silmez / yeniden yazmaz (`--all` ile zorlanır).
- `delay-ms` rate limit ve kota için vardır (varsayılan offline 400 ms).
- `--max-batches` sonsuz döngüyü keser; yarıda kalınca aynı komutu yeniden çalıştırın.
- Service role key’i CI log’una basmayın; local `.env.local` kullanın.

## Kabul kontrol listesi

- [ ] `tools:embeddings:status` → `ready=true` (≥ %95)
- [ ] Cron bir turda `success: true` ve `failed: 0` (veya bilinen geçici provider hatası)
- [ ] Kâşif low-confidence soruda vector fallback log/metriği görünür
- [ ] Provider kapalıyken lexical fast-path hâlâ çalışır (Faz 1 guardrail)

## İlgili kod

| Yüzey         | Dosya                                       |
| ------------- | ------------------------------------------- |
| Server batch  | `src/lib/toolEmbeddings.js`                 |
| Günlük cron   | `src/app/api/cron/tool-embeddings/route.js` |
| Offline CLI   | `scripts/generate_embeddings.mjs`           |
| Gemini helper | `src/utils/gemini.js` → `embedGeminiText`   |
| Retrieval     | `src/lib/kasif/retrieval.js`                |
| Schedule      | `vercel.json` → `30 3 * * *`                |

## Exit kodları (CLI)

| Kod | Anlam                                          |
| --- | ---------------------------------------------- |
| `0` | Status ready / dry-run tamam / backfill ≥ %95  |
| `1` | Ortam veya beklenmeyen hata                    |
| `2` | Status/backfill sonrası coverage hâlâ &lt; %95 |

## Bilinen engeller

1. **Gemini API disabled** (cloud project): backfill başlamaz.
2. Production’da embedding kolon yoksa migration önce uygulanmalı.
3. Anon key ile update RLS’e takılabilir → **service role** kullanın.
