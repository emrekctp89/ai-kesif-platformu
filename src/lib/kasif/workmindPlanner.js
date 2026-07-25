/**
 * Workmind iş akışı planlayıcısı (Kâşif, yerel).
 *
 * Gemini kapalı/rate-limit/403 olduğunda veya boş yanıtta Workmind'in
 * bozulmaması için niyet (goal/concept) ve proje şablonlarından adım üretir.
 * Harici LLM çağrısı yok.
 */

import { understandQuestion } from './engine';
import { formatKasifGoalLabel } from './goalLabels';

/** @typedef {{ id?: string, label: string, description: string, categorySlug: string }} WorkmindStep */
/** @typedef {{ id?: string, source: string, target: string }} WorkmindEdge */

/**
 * Kâşif goal id → 3-5 adımlık iş akışı şablonu.
 * categorySlug değerleri PRIMARY_CATEGORIES ile hizalıdır.
 */
const GOAL_STEP_TEMPLATES = {
  'meeting-notes': [
    {
      label: 'Toplantıyı kaydet',
      description: 'Görüşmeyi ses veya video olarak kaydet; net ses kalitesine dikkat et.',
      categorySlug: 'ses-muzik',
    },
    {
      label: 'Transkript ve özet çıkar',
      description: 'Kaydı metne dök, aksiyon maddeleri ve kararları özetle.',
      categorySlug: 'uretkenlik',
    },
    {
      label: 'Görevlere dağıt',
      description: 'Aksiyon maddelerini görev listesine veya ekibe aktar.',
      categorySlug: 'uretkenlik',
    },
    {
      label: 'Paylaşım notu yaz',
      description: 'Kısa bir özet notu hazırlayıp paydaşlarla paylaş.',
      categorySlug: 'metin-yazarligi',
    },
  ],
  'coding-assistant': [
    {
      label: 'Gereksinimleri netleştir',
      description: 'Özellik, teknik kısıtlar ve başarı kriterlerini yaz.',
      categorySlug: 'uretkenlik',
    },
    {
      label: 'Mimari ve iskelet',
      description: 'Yığın seç, klasör yapısı ve temel iskeleti kur.',
      categorySlug: 'kod-yazilim',
    },
    {
      label: 'Çekirdek özellikleri kodla',
      description: 'Ana akışları AI asistanıyla uygula ve test et.',
      categorySlug: 'kod-yazilim',
    },
    {
      label: 'Test ve hata ayıkla',
      description: 'Kritik senaryoları doğrula, hataları gider.',
      categorySlug: 'kod-yazilim',
    },
    {
      label: 'Dağıtım hazırlığı',
      description: 'Ortam değişkenleri, CI ve yayın adımlarını tamamla.',
      categorySlug: 'kod-yazilim',
    },
  ],
  'image-generation': [
    {
      label: 'Brief ve stil tanımı',
      description: 'Konu, stil, renk ve kullanım amacını netleştir.',
      categorySlug: 'tasarim',
    },
    {
      label: 'Prompt ile görsel üret',
      description: 'Metinden görsel üret; varyasyonları dene.',
      categorySlug: 'gorsel-uretim',
    },
    {
      label: 'Seç ve düzenle',
      description: 'En iyi kareyi seç, kırpma ve dokunuşları uygula.',
      categorySlug: 'gorsel-uretim',
    },
    {
      label: 'Kullanım formatına uyarla',
      description: 'Web, sosyal veya baskı boyutlarına dönüştür.',
      categorySlug: 'tasarim',
    },
  ],
  'video-generation': [
    {
      label: 'Senaryo ve storyboard',
      description: 'Mesaj, sahne akışı ve süre planını yaz.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Görsel / klip üret',
      description: 'Metinden veya görsellerden video sahneleri oluştur.',
      categorySlug: 'video-uretim',
    },
    {
      label: 'Ses ve müzik ekle',
      description: 'Seslendirme veya arka plan müziği ile zenginleştir.',
      categorySlug: 'ses-muzik',
    },
    {
      label: 'Montaj ve yayın',
      description: 'Kurgula, altyazı ekle ve paylaşım formatına export et.',
      categorySlug: 'video-uretim',
    },
  ],
  'voice-generation': [
    {
      label: 'Metni hazırla',
      description: 'Seslendirilecek metni düzenle; ton ve uzunluğu ayarla.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Ses / dublaj üret',
      description: 'Metinden ses oluştur veya klonlanmış ses kullan.',
      categorySlug: 'ses-muzik',
    },
    {
      label: 'Düzenle ve karıştır',
      description: 'Tempo, gürültü ve seviye ayarlarını yap.',
      categorySlug: 'ses-muzik',
    },
    {
      label: 'Teslim formatı',
      description: 'Podcast, video veya çağrı için uygun dosyaya dönüştür.',
      categorySlug: 'uretkenlik',
    },
  ],
  'music-generation': [
    {
      label: 'Tür ve ruh hali',
      description: 'Müzik tarzı, tempo ve kullanım amacını belirle.',
      categorySlug: 'ses-muzik',
    },
    {
      label: 'Beste / parça üret',
      description: 'AI ile enstrümantal veya vokal taslak üret.',
      categorySlug: 'ses-muzik',
    },
    {
      label: 'İnce ayar',
      description: 'Süre, yapı ve mix üzerinde iyileştir.',
      categorySlug: 'ses-muzik',
    },
    {
      label: 'Lisans ve kullanım',
      description: 'Ticari kullanım koşullarını kontrol edip dosyayı kaydet.',
      categorySlug: 'uretkenlik',
    },
  ],
  'workflow-automation': [
    {
      label: 'Süreci haritala',
      description: 'Tekrarlayan adımları ve tetikleyicileri listele.',
      categorySlug: 'uretkenlik',
    },
    {
      label: 'Araçları bağla',
      description: 'Uygulamaları ve API bağlantılarını kur.',
      categorySlug: 'otomasyon-ajan',
    },
    {
      label: 'Otomasyonu kur',
      description: 'Tetikleyici → eylem akışını no-code veya ajan ile oluştur.',
      categorySlug: 'no-code-low-code',
    },
    {
      label: 'Test et ve izle',
      description: 'Örnek çalıştırmalarla doğrula; hata bildirimleri ekle.',
      categorySlug: 'otomasyon-ajan',
    },
  ],
  'data-analysis': [
    {
      label: 'Veriyi topla',
      description: 'CSV, Excel veya kaynak sistemlerden veriyi hazırla.',
      categorySlug: 'veri-analiz',
    },
    {
      label: 'Temizle ve modelle',
      description: 'Eksik değerleri düzelt, alanları birleştir.',
      categorySlug: 'veri-analiz',
    },
    {
      label: 'Analiz ve görselleştir',
      description: 'Grafik, dashboard veya istatistiksel özet çıkar.',
      categorySlug: 'veri-analiz',
    },
    {
      label: 'Raporla',
      description: 'Bulguları karar vericiler için özet rapor haline getir.',
      categorySlug: 'metin-yazarligi',
    },
  ],
  'content-writing': [
    {
      label: 'Konu ve anahtar mesaj',
      description: 'Hedef kitle, amaç ve ana tezi netleştir.',
      categorySlug: 'uretkenlik',
    },
    {
      label: 'Taslak yaz',
      description: 'AI destekli ilk metin taslağını üret.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Düzenle ve ses tonu',
      description: 'Açık, tutarlı ve markaya uygun hale getir.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Yayın ve dağıtım',
      description: 'SEO başlıkları, CTA ve kanal planını tamamla.',
      categorySlug: 'pazarlama',
    },
  ],
  translation: [
    {
      label: 'Kaynak metni hazırla',
      description: 'Çevrilecek metni sadeleştir ve terimleri işaretle.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Çeviriyi üret',
      description: 'Hedef dile AI ile çevir; bağlamı koru.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Yerelleştir ve gözden geçir',
      description: 'İdiom, marka adı ve kültürel uyumu kontrol et.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Teslim formatı',
      description: 'Dosya formatını ve yayın kanalını hazırla.',
      categorySlug: 'uretkenlik',
    },
  ],
  'presentation-creation': [
    {
      label: 'Mesaj ve iskelet',
      description: 'Ana mesaj, bölümler ve süre planını yaz.',
      categorySlug: 'uretkenlik',
    },
    {
      label: 'İçerik metinleri',
      description: 'Her slayt için kısa, net metinler hazırla.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Slaytları tasarla',
      description: 'Görsel hiyerarşi, diyagram ve şablonlarla slayt üret.',
      categorySlug: 'tasarim',
    },
    {
      label: 'Görsel destek',
      description: 'Gerekirse illüstrasyon veya diyagram ekle.',
      categorySlug: 'gorsel-uretim',
    },
    {
      label: 'Prova ve teslim',
      description: 'Akışı oku, not ekle ve paylaşılabilir dosyayı üret.',
      categorySlug: 'uretkenlik',
    },
  ],
  'logo-design': [
    {
      label: 'Marka brief’i',
      description: 'İsim, sektör, değerler ve istenmeyen stilleri yaz.',
      categorySlug: 'tasarim',
    },
    {
      label: 'Logo konseptleri üret',
      description: 'Birkaç logo varyasyonu oluştur.',
      categorySlug: 'tasarim',
    },
    {
      label: 'Seçim ve ince ayar',
      description: 'En iyiyi seç; sadeleştir ve okunurluğu artır.',
      categorySlug: 'tasarim',
    },
    {
      label: 'Marka seti',
      description: 'Farklı zeminler, ikon ve sosyal avatar boyutları hazırla.',
      categorySlug: 'gorsel-uretim',
    },
  ],
  'ui-design': [
    {
      label: 'Kullanıcı ve akış',
      description: 'Hedef kullanıcı, ekranlar ve temel user flow’u tanımla.',
      categorySlug: 'uretkenlik',
    },
    {
      label: 'Wireframe / iskelet',
      description: 'Düşük detayda ekran iskeletlerini çıkar.',
      categorySlug: 'tasarim',
    },
    {
      label: 'UI tasarımı',
      description: 'Bileşen, renk ve tipografi ile yüksek sadakat tasarım yap.',
      categorySlug: 'tasarim',
    },
    {
      label: 'Prototip ve geri bildirim',
      description: 'Tıklanabilir prototip ile akışı doğrula.',
      categorySlug: 'tasarim',
    },
  ],
  'chatbot-assistant': [
    {
      label: 'Kullanım senaryosu',
      description: 'Botun cevaplayacağı soruları ve sınırları yaz.',
      categorySlug: 'uretkenlik',
    },
    {
      label: 'Bilgi tabanı hazırla',
      description: 'SSS, ürün ve politika metinlerini derle.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Asistanı kur',
      description: 'Chatbot / LLM arayüzünü senaryoya göre yapılandır.',
      categorySlug: 'chatbotlar',
    },
    {
      label: 'Test ve iyileştir',
      description: 'Örnek diyaloglarla test et; yanıtları sıkılaştır.',
      categorySlug: 'chatbotlar',
    },
  ],
  'email-writing': [
    {
      label: 'Amaç ve segment',
      description: 'Kampanya hedefi ve alıcı segmentini netleştir.',
      categorySlug: 'pazarlama',
    },
    {
      label: 'E-posta taslağı',
      description: 'Konu satırı, gövde ve CTA yaz.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Varyasyon ve A/B',
      description: 'Alternatif konu satırları ve kısa/uzun versiyonlar üret.',
      categorySlug: 'pazarlama',
    },
    {
      label: 'Gönderim planı',
      description: 'Zamanlama, liste ve ölçüm metriklerini belirle.',
      categorySlug: 'pazarlama',
    },
  ],
  'seo-optimization': [
    {
      label: 'Anahtar kelime araştırması',
      description: 'Hedef sorguları ve rakip sayfaları çıkar.',
      categorySlug: 'pazarlama',
    },
    {
      label: 'İçerik iskeleti',
      description: 'H1/H2 yapısı ve arama niyetine uygun taslak kur.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'SEO uyumlu metin',
      description: 'Başlık, meta ve gövde metnini optimize et.',
      categorySlug: 'pazarlama',
    },
    {
      label: 'Teknik ve ölçüm',
      description: 'İç link, hız ve sıralama takibini planla.',
      categorySlug: 'veri-analiz',
    },
  ],
  'customer-support': [
    {
      label: 'Destek senaryoları',
      description: 'Sık gelen talepleri ve SLA’yı listele.',
      categorySlug: 'musteri-destek',
    },
    {
      label: 'Bilgi bankası',
      description: 'SSS ve çözüm adımlarını yaz.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Bot / ticket otomasyonu',
      description: 'İlk yanıt ve yönlendirme akışını kur.',
      categorySlug: 'musteri-destek',
    },
    {
      label: 'İzleme ve iyileştirme',
      description: 'Çözüm süresi ve memnuniyeti takip et.',
      categorySlug: 'veri-analiz',
    },
  ],
  'ecommerce-copy': [
    {
      label: 'Ürün ve alıcı persona',
      description: 'Faydalar, itirazlar ve hedef kitleyi yaz.',
      categorySlug: 'e-ticaret',
    },
    {
      label: 'Ürün açıklamaları',
      description: 'Satış odaklı, net ürün metinleri üret.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Görseller ve vitrin',
      description: 'Ürün görseli / yaşam tarzı görselleri hazırla.',
      categorySlug: 'gorsel-uretim',
    },
    {
      label: 'Kampanya ve SEO',
      description: 'Landing, reklam metni ve arama optimizasyonu yap.',
      categorySlug: 'pazarlama',
    },
  ],
  'sales-crm': [
    {
      label: 'Pipeline tanımı',
      description: 'Lead aşamaları ve kriterleri netleştir.',
      categorySlug: 'satis-crm',
    },
    {
      label: 'Outreach mesajları',
      description: 'Soğuk e-posta / LinkedIn mesaj taslakları yaz.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'CRM otomasyonu',
      description: 'Takip, hatırlatma ve puanlama kurallarını kur.',
      categorySlug: 'satis-crm',
    },
    {
      label: 'Raporlama',
      description: 'Dönüşüm ve aktivite metriklerini izle.',
      categorySlug: 'veri-analiz',
    },
  ],
  'learning-tutor': [
    {
      label: 'Öğrenme hedefini yaz',
      description: 'Ne öğreneceğini ve mevcut seviyeni tanımla.',
      categorySlug: 'egitim',
    },
    {
      label: 'Müfredat planı',
      description: 'Konuları haftalık veya oturumlara böl.',
      categorySlug: 'egitim',
    },
    {
      label: 'Pratik ve soru-cevap',
      description: 'Alıştırmalar ve AI tutor ile pekiştir.',
      categorySlug: 'chatbotlar',
    },
    {
      label: 'Değerlendirme',
      description: 'Kısa test veya proje ile öğrenmeyi ölç.',
      categorySlug: 'egitim',
    },
  ],
  'legal-review': [
    {
      label: 'Belgeyi topla',
      description: 'İncelenecek sözleşme veya metni hazırla.',
      categorySlug: 'hukuk-uyumluluk',
    },
    {
      label: 'Risk taraması',
      description: 'Kritik maddeleri ve riskleri işaretle.',
      categorySlug: 'hukuk-uyumluluk',
    },
    {
      label: 'Özet ve notlar',
      description: 'Anlaşılır bir özet ve soru listesi çıkar.',
      categorySlug: 'metin-yazarligi',
    },
    {
      label: 'Uzman onayı',
      description: 'Hukuki kararları uzmanla doğrula (AI yedek değildir).',
      categorySlug: 'hukuk-uyumluluk',
    },
  ],
  'three-d-generation': [
    {
      label: 'Sahne / asset brief’i',
      description: 'Stil, kullanım (oyun, ürün, avatar) ve kısıtları yaz.',
      categorySlug: 'tasarim',
    },
    {
      label: '3D model üret',
      description: 'Metinden veya referanstan 3D asset oluştur.',
      categorySlug: '3d-modelleme',
    },
    {
      label: 'Malzeme ve ışık',
      description: 'Texture, ışık ve render ayarlarını yap.',
      categorySlug: '3d-modelleme',
    },
    {
      label: 'Export ve entegrasyon',
      description: 'Hedef motor veya formata export et.',
      categorySlug: '3d-modelleme',
    },
  ],
};

/**
 * Karmaşık / çok adımlı proje kalıpları (goal tek başına yetmeyince).
 * İlk eşleşen kalıp kullanılır.
 */
const PROJECT_PATTERNS = [
  {
    id: 'ecommerce-launch',
    test: (text) =>
      /e-?ticaret|eticaret|online ma[gğ]aza|shopify|woocommerce|ürün sat|marketplace/i.test(text),
    steps: [
      {
        label: 'Niş ve ürün tanımı',
        description: 'Satılacak ürün, fiyat ve hedef müşteriyi netleştir.',
        categorySlug: 'e-ticaret',
      },
      {
        label: 'Marka ve görseller',
        description: 'Logo, ürün görseli ve vitrin görsellerini hazırla.',
        categorySlug: 'gorsel-uretim',
      },
      {
        label: 'Mağaza metinleri',
        description: 'Ürün açıklamaları, SSS ve güven metinlerini yaz.',
        categorySlug: 'metin-yazarligi',
      },
      {
        label: 'Site / mağaza kur',
        description: 'No-code veya hazır mağaza altyapısını ayağa kaldır.',
        categorySlug: 'no-code-low-code',
      },
      {
        label: 'SEO ve reklam',
        description: 'Arama ve sosyal kampanyalarla trafik planla.',
        categorySlug: 'pazarlama',
      },
      {
        label: 'Destek ve otomasyon',
        description: 'Sipariş ve müşteri destek akışlarını bağla.',
        categorySlug: 'musteri-destek',
      },
    ],
  },
  {
    id: 'saas-launch',
    test: (text) => /saas|b2b ürün|startup ürün|ürün lansman|mvp (kur|geli[sş]tir)/i.test(text),
    steps: [
      {
        label: 'Problem ve kullanıcı',
        description: 'Çözülecek sorunu ve ilk kullanıcı segmentini yaz.',
        categorySlug: 'uretkenlik',
      },
      {
        label: 'MVP kapsamı',
        description: 'Minimum özellikleri ve başarı ölçütünü belirle.',
        categorySlug: 'is-dunyasi',
      },
      {
        label: 'Ürünü geliştir',
        description: 'Çekirdek özellikleri kodla veya no-code ile kur.',
        categorySlug: 'kod-yazilim',
      },
      {
        label: 'Landing ve mesaj',
        description: 'Değer önerisi, landing metni ve CTA hazırla.',
        categorySlug: 'metin-yazarligi',
      },
      {
        label: 'GTM ve pazarlama',
        description: 'İlk kanal, içerik ve outreach planını uygula.',
        categorySlug: 'pazarlama',
      },
    ],
  },
  {
    id: 'mobile-app',
    test: (text) => /mobil uygulama|mobile app|ios uygulama|android uygulama/i.test(text),
    steps: [
      {
        label: 'Fikir doğrulama',
        description: 'Kullanıcı problemi ve rakipleri kısaca doğrula.',
        categorySlug: 'uretkenlik',
      },
      {
        label: 'UX akışı',
        description: 'Ekran listesi ve temel navigasyonu tasarla.',
        categorySlug: 'tasarim',
      },
      {
        label: 'Geliştirme',
        description: 'MVP özelliklerini kodla veya low-code ile üret.',
        categorySlug: 'kod-yazilim',
      },
      {
        label: 'Test ve yayın',
        description: 'Kritik akışları test et; mağaza listesini hazırla.',
        categorySlug: 'kod-yazilim',
      },
      {
        label: 'Büyüme',
        description: 'ASO, içerik ve ilk kullanıcı edinimi planla.',
        categorySlug: 'pazarlama',
      },
    ],
  },
  {
    id: 'podcast-launch',
    test: (text) => /podcast|radyo program|sesli i[cç]erik serisi/i.test(text),
    steps: [
      {
        label: 'Format ve konu',
        description: 'Bölüm formatı, süre ve hedef dinleyiciyi belirle.',
        categorySlug: 'uretkenlik',
      },
      {
        label: 'Senaryo / notlar',
        description: 'Bölüm taslağı ve soru listesini yaz.',
        categorySlug: 'metin-yazarligi',
      },
      {
        label: 'Kayıt ve ses',
        description: 'Kayıt al; gerekirse seslendirme veya müzik ekle.',
        categorySlug: 'ses-muzik',
      },
      {
        label: 'Kapak ve tanıtım',
        description: 'Kapak görseli, kısa ve uzun tanıtım metni üret.',
        categorySlug: 'gorsel-uretim',
      },
      {
        label: 'Yayın ve dağıtım',
        description: 'Platformlara yükle; sosyal kliplerle duyur.',
        categorySlug: 'pazarlama',
      },
    ],
  },
  {
    id: 'youtube-content',
    test: (text) => /youtube|video kanal|i[cç]erik üretici|content creator/i.test(text),
    steps: [
      {
        label: 'Kanal stratejisi',
        description: 'Niş, format ve yayın ritmini netleştir.',
        categorySlug: 'pazarlama',
      },
      {
        label: 'Senaryo',
        description: 'Başlık, hook ve video iskeletini yaz.',
        categorySlug: 'metin-yazarligi',
      },
      {
        label: 'Görüntü / video üret',
        description: 'Çekim veya AI video ile materyali oluştur.',
        categorySlug: 'video-uretim',
      },
      {
        label: 'Kurgu ve ses',
        description: 'Montaj, altyazı ve ses dengelemesi yap.',
        categorySlug: 'video-uretim',
      },
      {
        label: 'Yayın ve büyüme',
        description: 'Thumbnail, SEO başlık ve paylaşım planı uygula.',
        categorySlug: 'pazarlama',
      },
    ],
  },
  {
    id: 'course-create',
    test: (text) =>
      /online kurs|e-?e[gğ]itim|ders serisi|course create|e[gğ]itim program/i.test(text),
    steps: [
      {
        label: 'Öğrenme çıktıları',
        description: 'Kursun öğreteceği becerileri yaz.',
        categorySlug: 'egitim',
      },
      {
        label: 'Müfredat',
        description: 'Modül ve ders sırasını planla.',
        categorySlug: 'egitim',
      },
      {
        label: 'İçerik üretimi',
        description: 'Metin, slayt veya video ders materyali hazırla.',
        categorySlug: 'metin-yazarligi',
      },
      {
        label: 'Görsel / video ders',
        description: 'Ders videoları veya destek görselleri üret.',
        categorySlug: 'video-uretim',
      },
      {
        label: 'Satış sayfası',
        description: 'Landing metni ve fiyatlandırma mesajını yaz.',
        categorySlug: 'pazarlama',
      },
    ],
  },
];

const GENERIC_STEPS = [
  {
    label: 'Hedefi netleştir',
    description: 'Başarı tanımı, kısıtlar ve hedef kitleyi bir cümleyle yaz.',
    categorySlug: 'uretkenlik',
  },
  {
    label: 'Araştırma ve ilham',
    description: 'Benzer örnekleri ve platformdaki ilgili araçları tara.',
    categorySlug: 'arastirma-akademik',
  },
  {
    label: 'İlk taslağı üret',
    description: 'Metin, görsel veya kod — ana çıktının ilk versiyonunu oluştur.',
    categorySlug: 'metin-yazarligi',
  },
  {
    label: 'Gözden geçir',
    description: 'Kalite, tutarlılık ve riskleri kontrol et; iyileştir.',
    categorySlug: 'uretkenlik',
  },
  {
    label: 'Yayınla veya teslim et',
    description: 'Doğru formatta paketlenmiş sonucu paylaş veya yayınla.',
    categorySlug: 'pazarlama',
  },
];

const CONCEPT_CATEGORY_HINTS = {
  gorsel: 'gorsel-uretim',
  video: 'video-uretim',
  ses: 'ses-muzik',
  muzik: 'ses-muzik',
  '3d': '3d-modelleme',
  tasarim: 'tasarim',
  yazim: 'metin-yazarligi',
  kod: 'kod-yazilim',
  veri: 'veri-analiz',
  otomasyon: 'otomasyon-ajan',
  chatbot: 'chatbotlar',
  uretkenlik: 'uretkenlik',
  pazarlama: 'pazarlama',
  'e-ticaret': 'e-ticaret',
  satis: 'satis-crm',
  destek: 'musteri-destek',
  egitim: 'egitim',
  hukuk: 'hukuk-uyumluluk',
  arastirma: 'arastirma-akademik',
  saglik: 'saglik-yasam',
  oyun: 'oyun-eglence',
};

function chainEdges(nodes) {
  if (nodes.length < 2) return [];
  return nodes.slice(0, -1).map((node, index) => ({
    id: `e-${node.id}-${nodes[index + 1].id}`,
    source: node.id,
    target: nodes[index + 1].id,
  }));
}

/**
 * Model veya şablon çıktısını Workmind graph sözleşmesine indirger.
 * @param {{ nodes?: unknown[], edges?: unknown[] } | null | undefined} data
 */
export function normalizeWorkmindWorkflow(data) {
  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];

  const cleanNodes = nodes
    .map((node, index) => {
      const id = String(node?.id || `step-${index + 1}`).slice(0, 40);
      const label = String(node?.label || `Adım ${index + 1}`)
        .trim()
        .slice(0, 80);
      const description = String(node?.description || '')
        .trim()
        .slice(0, 220);
      const categorySlug = String(node?.categorySlug || 'diger')
        .trim()
        .toLowerCase()
        .slice(0, 80);

      if (!label) return null;
      return { id, label, description, categorySlug };
    })
    .filter(Boolean)
    .slice(0, 6);

  const nodeIds = new Set(cleanNodes.map((n) => n.id));
  let cleanEdges = edges
    .map((edge, index) => {
      const source = String(edge?.source || '');
      const target = String(edge?.target || '');
      if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return null;
      return {
        id: String(edge?.id || `e-${source}-${target}-${index}`),
        source,
        target,
      };
    })
    .filter(Boolean);

  if (!cleanEdges.length && cleanNodes.length > 1) {
    cleanEdges = chainEdges(cleanNodes);
  }

  return { nodes: cleanNodes, edges: cleanEdges };
}

function materializeSteps(steps) {
  const nodes = (Array.isArray(steps) ? steps : []).slice(0, 6).map((step, index) => ({
    id: `step-${index + 1}`,
    label: String(step.label || `Adım ${index + 1}`).slice(0, 80),
    description: String(step.description || '').slice(0, 220),
    categorySlug: String(step.categorySlug || 'diger').slice(0, 80),
  }));
  return normalizeWorkmindWorkflow({ nodes, edges: chainEdges(nodes) });
}

function mergeGoalTemplates(goals) {
  const selected = (goals || []).filter((g) => GOAL_STEP_TEMPLATES[g]).slice(0, 3);
  if (!selected.length) return null;

  if (selected.length === 1) {
    return materializeSteps(GOAL_STEP_TEMPLATES[selected[0]]);
  }

  // Çoklu goal: her hedeften 1-2 ayırt edici adım al, max 6.
  const perGoal = selected.length === 2 ? 3 : 2;
  const merged = [];
  const seenLabels = new Set();

  for (const goal of selected) {
    const template = GOAL_STEP_TEMPLATES[goal] || [];
    for (const step of template.slice(0, perGoal)) {
      const key = step.label.toLocaleLowerCase('tr-TR');
      if (seenLabels.has(key)) continue;
      seenLabels.add(key);
      merged.push({
        ...step,
        description:
          step.description ||
          `${formatKasifGoalLabel(goal, 'tr')} adımı: ${step.label.toLocaleLowerCase('tr-TR')}.`,
      });
      if (merged.length >= 6) break;
    }
    if (merged.length >= 6) break;
  }

  return materializeSteps(merged);
}

function stepsFromConcepts(concepts = [], prompt) {
  const categories = [];
  for (const concept of concepts) {
    const slug = CONCEPT_CATEGORY_HINTS[concept];
    if (slug && !categories.includes(slug)) categories.push(slug);
  }
  if (!categories.length) return null;

  const steps = [
    {
      label: 'Hedefi netleştir',
      description: `“${String(prompt).slice(0, 60)}” için kapsam ve başarı kriterini yaz.`,
      categorySlug: 'uretkenlik',
    },
    ...categories.slice(0, 3).map((slug, index) => ({
      label: `Adım ${index + 2}: ilgili araçlarla üret`,
      description: `Bu adımda ${slug.replace(/-/g, ' ')} kategorisindeki araçlarla çıktı üret.`,
      categorySlug: slug,
    })),
    {
      label: 'Gözden geçir ve teslim et',
      description: 'Sonucu kontrol et, formatla ve paylaş.',
      categorySlug: categories[categories.length - 1] || 'uretkenlik',
    },
  ];

  return materializeSteps(steps);
}

/**
 * Kullanıcı hedefini yerel Kâşif sinyalleriyle iş akışına çevirir.
 * Her zaman en az 3 node döndürmeye çalışır (geçerli prompt varsayımı).
 *
 * @param {string} prompt
 * @returns {{ nodes: WorkmindStep[], edges: WorkmindEdge[], meta: object }}
 */
export function planWorkmindWorkflow(prompt) {
  const text = String(prompt || '').trim();
  const intent = understandQuestion(text);

  for (const pattern of PROJECT_PATTERNS) {
    if (pattern.test(text)) {
      const workflow = materializeSteps(pattern.steps);
      return {
        ...workflow,
        meta: {
          source: 'kasif',
          planner: 'project-pattern',
          patternId: pattern.id,
          goals: intent.goals,
          concepts: intent.concepts,
        },
      };
    }
  }

  const fromGoals = mergeGoalTemplates(intent.goals);
  if (fromGoals?.nodes?.length) {
    return {
      ...fromGoals,
      meta: {
        source: 'kasif',
        planner: 'goal-template',
        goals: intent.goals,
        concepts: intent.concepts,
      },
    };
  }

  const fromConcepts = stepsFromConcepts(intent.concepts, text);
  if (fromConcepts?.nodes?.length) {
    return {
      ...fromConcepts,
      meta: {
        source: 'kasif',
        planner: 'concept-hint',
        goals: intent.goals,
        concepts: intent.concepts,
      },
    };
  }

  const generic = materializeSteps(
    GENERIC_STEPS.map((step, index) =>
      index === 2
        ? {
            ...step,
            description: text
              ? `“${text.slice(0, 80)}” için ilk somut çıktıyı üret.`
              : step.description,
          }
        : step
    )
  );

  return {
    ...generic,
    meta: {
      source: 'kasif',
      planner: 'generic',
      goals: intent.goals,
      concepts: intent.concepts,
    },
  };
}
