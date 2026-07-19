# Kâşif AI motoru

Kâşif dış AI API'si, Ollama veya üçüncü taraf bir dil modeli kullanmaz. Sorgu anlama,
araç puanlama, fiyat tercihi, kaynak seçimi ve cevap oluşturma platform kodunda çalışır.

## Etkinleştirme

Kâşif varsayılan olarak açıktır. Gerektiğinde `.env.local` dosyasında
`KASIF_ENABLED=false` ile kapatılabilir. Üretim ekranı `/kasif` adresindedir.

## Çalışma biçimi

1. Kullanıcı sorusu Türkçe karakterlerden bağımsız biçimde normalize edilir.
2. Son kullanıcı mesajları takip soruları için sorguya eklenir.
3. Yalnızca onaylı platform araçları Supabase'ten alınır.
4. İsim, kategori, açıklama, fiyat tercihi, doğrulama ve puan sinyalleri ağırlıklandırılır.
5. Cevap ve bağlantılar yalnızca sıralanan veritabanı kayıtlarından üretilir.

Takip sorularında son kullanıcı mesajlarındaki konu ve görev niyeti korunur. Güncel mesajdaki açık
fiyat tercihi (`ücretsiz` veya `ücretli`) önceki tercihin üzerine yazılır.

## Değerlendirme

Yerel geliştirme sunucusu çalışırken `npm run kasif:evaluate` komutu sunum, görsel üretim, kodlama,
toplantı notları, doğal dil varyantları ve takip sorularını doğrular. Yerel değerlendirme çağrıları
`kasif_interactions` tablosuna analitik kaydı eklemez.

Bu sürüm platforma özel bir öneri motorudur; genel amaçlı serbest metin üreten temel dil
modeli değildir. Gerçek kullanım geri bildirimleri biriktikçe ağırlıklar çevrimdışı olarak
öğrenilebilir ve motor sürümlenmiş bir değerlendirme veri setiyle geliştirilebilir.
