# Kâşif v2.1.2 — Evidence CEO + Admin DeepSeek

Yayın tarihi: 2026-08-01

Kâşif v2.1, öneri motorunu katalog temelli bir iş bitirme ve karar orkestratörü olarak
paketler. Ücretli model sağlayıcısı çekirdek çalışma için zorunlu değildir.

## Öne çıkan yetenekler

- Türkçe/İngilizce yerel niyet ve hedef anlama
- Onaylı katalogla temellendirilmiş araç önerisi ve ücretsiz/ücretli karşılaştırma
- Workmind planları, iş paketleri, sihirbazlar ve ilk çıktı üretimi
- Oturum, funnel, sonuç köprüsü ve doğrulanmış tamamlanma takibi
- Frekans/cooldown kontrollü proaktif öneriler ve kullanıcı opt-out tercihi
- Robots.txt, SSRF, DNS, boyut ve host korumalı web scraping
- JSON-LD ve semantik bölüm çıkarımı, kanıt skoru, provenance ve yerel kategori tahmini
- Scrape adaylarını yalnız admin onay kuyruğuna yazan çift onaylı production CLI
- DeepSeek V4 uyumlu, açık opt-in ve katalog-grounded çok turlu chatbot katmanı

## Sürüm sözleşmesi

- Public durum endpoint’i: `GET /api/kasif/status`
- Developer recommend cevabı: `meta.version = "2.1.2"`
- Kâşif kimlik yanıtı ve ana ekran etiketi: `v2.1.2`
- Otomatik katalog yayını: kapalı
- Scrape sonrası admin onayı: zorunlu
- Ücretli sağlayıcı gereksinimi: yok
- DeepSeek sohbeti varsayılan kapalıdır; yalnız admin panelindeki süper güç anahtarıyla açılır

## Bilinen dış engel

Google projesinde embedding erişimi reddedildiği için semantic vector coverage henüz hazır
değildir. Bu durum yerel anlama, katalog önerisi, planlama, scraping veya onay kuyruğunu
engellemez.

## Kabul kapısı

- Release manifest ve status endpoint regresyon testleri
- Kâşif engine regresyon testleri
- Scraper testleri
- ESLint, TypeScript ve production build
