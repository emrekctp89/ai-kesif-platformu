# Kâşif AI motoru

Kâşif dış AI API'si, Ollama veya üçüncü taraf bir dil modeli kullanmaz. Sorgu anlama,
araç puanlama, fiyat tercihi, kaynak seçimi ve cevap oluşturma platform kodunda çalışır.

Sıradaki işler ve **web’den araç çekme (scrape)** yönü için: [`docs/KASIF_ROADMAP.md`](./KASIF_ROADMAP.md).

## Etkinleştirme

Kâşif varsayılan olarak açıktır. Gerektiğinde `.env.local` dosyasında
`KASIF_ENABLED=false` ile kapatılabilir. Üretim ekranı `/kasif` adresindedir.
Bu bayrak tavsiye, karşılaştırma, sesli asistan ve konsiyerj entegrasyonlarının tamamına uygulanır.
Workmind iki Kâşif katmanı kullanır:

1. **İş akışı planlama** (`src/lib/kasif/workmindPlanner.js`): Gemini kapalı, rate-limit veya
   hata verdiğinde hedef metninden 3–6 adımlık yerel iş akışı üretir (proje kalıpları, goal
   şablonları, kavram ipuçları, genel yedek). Harici LLM yok.
2. **Adım araç önerisi**: Her adımda ana hedef + adım bağlamı Kâşif'e iletilir; yalnızca onaylı
   platform araçları sıralanır. Kâşif sonuç üretemezse kategori tabanlı liste yedeklenir.

## Çalışma biçimi

1. Kullanıcı sorusu Türkçe karakterlerden bağımsız biçimde normalize edilir.
2. Son kullanıcı mesajları takip soruları için sorguya eklenir.
3. Yalnızca onaylı platform araçları Supabase'ten alınır.
4. İsim, kategori, açıklama, fiyat tercihi, doğrulama ve puan sinyalleri ağırlıklandırılır.
5. Cevap ve bağlantılar yalnızca sıralanan veritabanı kayıtlarından üretilir.
6. Başarılı önerilerde `kasif_interactions.funnel` seedlenir (`job_stated` / `tool_recommended`).
   Kullanıcı “Bu araçla devam et” ve self-report ile huniyi ilerletir (`POST /api/kasif/funnel`).
7. `intent.goals` doluysa `src/lib/kasif/jobWizards.js` üzerinden goal-specific checklist ve
   kopyalanabilir ilk-çıktı şablonları gösterilir (P1).
8. Workmind ile tek görev oturumu (P2): `/kasif` → Workmind handoff; `POST /api/kasif/job-session`;
   adım tamamla + araç seçimi funnel’a yazılır (`src/lib/kasif/jobSession.js`).
9. P3 result bridge: email / content / presentation için araç çıktısını yapıştır →
   `POST /api/kasif/result-bridge` ile `first_result` (+ opsiyonel `job_done`).

Takip sorularında son kullanıcı mesajlarındaki konu ve görev niyeti korunur. Güncel mesajdaki açık
fiyat tercihi (`ücretsiz` veya `ücretli`) önceki tercihin üzerine yazılır.

## Değerlendirme

Yerel geliştirme sunucusu çalışırken `npm run kasif:evaluate` komutu sunum, görsel üretim, kodlama,
toplantı notları, SEO, e-posta, chatbot, logo, hukuk, 3D, doğal dil varyantları ve takip
sorularını doğrular. Yerel değerlendirme çağrıları `kasif_interactions` tablosuna analitik kaydı
eklemez.

Geri bildirim özeti için (service role gerekir):

```bash
npm run kasif:feedback-report
npm run kasif:feedback-report -- --days=14 --limit=30
```

Rapor negatif geri bildirimleri token ve goal kovalarına ayırır; lexicon kural adayları önerir.
Aynı özet admin panelindeki **Kâşif kalite** sekmesinde de görünür (`buildKasifQualityStats`).

Eski etkileşimleri mevcut motorla dry-run yeniden yorumlamak için:

```bash
npm run kasif:reprocess-intents
npm run kasif:reprocess-intents -- --days=30 --limit=50
```

Bu komut veritabanına yazmaz; goal kazanan veya meta sayılan örnekleri listeler.

## Meta sorular

`sen kimsin`, `ne yapabilirsin`, `how do you work` gibi sorular katalog aramasına gitmeden
sabit platform açıklaması döndürür (`answerMetaQuestion`).

## Soft-landing (geçmişsiz follow-up)

Konuşma geçmişi yokken `Peki bunlardan ücretsiz olanlar hangileri?` gibi referanslı
follow-up’lar zayıf katalog araması yerine soft-landing üretir (`answerContextlessFollowUp`):
kullanıcıdan görevi tek cümlede yeniden yazmasını ister. Geçmiş varsa normal intent taşıma
devam eder.

Bu sürüm platforma özel bir öneri motorudur; genel amaçlı serbest metin üreten temel dil
modeli değildir. Gerçek kullanım geri bildirimleri biriktikçe ağırlıklar çevrimdışı olarak
öğrenilebilir ve motor sürümlenmiş bir değerlendirme veri setiyle geliştirilebilir.

## Kavram ve hedef sözlüğü

`src/lib/kasif/lexicon.js` platform kategorileriyle hizalı kavramlar (`KASIF_CONCEPTS`) ve görev
hedefleri (`KASIF_GOALS`) tutar. Yeni bir iş alanı eklerken:

1. Kavram kelimelerini ekle (topic isolation için).
2. `queryGroups` + `evidence` + gerekirse `negativeEvidence` ile hedef tanımla.
3. `__tests__/lib/kasif-engine.test.js` içine ayırt edici bir case yaz.
4. `scripts/kasif-evaluate.mjs` içine canlı katalog beklenen araçlarıyla eval case ekle.
