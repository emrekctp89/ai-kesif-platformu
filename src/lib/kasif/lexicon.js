export const KASIF_CONCEPTS = {
  'gorsel-uretim': ['görsel', 'resim', 'fotoğraf', 'illüstrasyon', 'image'],
  'video-uretim': ['video', 'animasyon', 'montaj', 'film'],
  'ses-uretim': ['ses', 'seslendirme', 'dublaj', 'podcast', 'voice', 'audio', 'tts'],
  'muzik-uretim': ['müzik', 'şarkı', 'beste', 'melodi', 'music', 'song'],
  'metin-yazarligi': [
    'metin',
    'yazı',
    'blog',
    'içerik',
    'makale',
    'çeviri',
    'çevir',
    'tercüme',
    'translation',
    'diller arası',
  ],
  'kod-yazilim': ['kod', 'yazılım', 'programlama', 'developer', 'test'],
  pazarlama: ['pazarlama', 'seo', 'reklam', 'sosyal medya'],
  'veri-analiz': ['veri', 'analiz', 'rapor', 'sql', 'istatistik'],
  'otomasyon-ajan': ['otomasyon', 'ajan', 'agent', 'workflow', 'iş akışı'],
  chatbotlar: ['sohbet', 'chatbot', 'asistan', 'chat'],
  uretkenlik: ['sunum', 'slayt', 'not', 'toplantı', 'takvim', 'görev'],
};

export const FREE_WORDS = ['ücretsiz', 'free', 'bedava', 'açık kaynak', 'open-source'];
export const PAID_WORDS = ['ücretli', 'premium', 'paid', 'enterprise'];

export const KASIF_GOALS = {
  'meeting-notes': {
    queryGroups: [['toplantı'], ['not', 'özet', 'transkript', 'kaydet']],
    evidence: ['transkript', 'özet', 'toplantı notu', 'kayıt', 'deşifre'],
  },
  'coding-assistant': {
    queryGroups: [
      ['kod', 'yazılım', 'programlama'],
      ['yaz', 'geliştir', 'asistan', 'tamamla'],
    ],
    evidence: ['kod yaz', 'kod üret', 'kod tamamlama', 'programlama', 'geliştirici asistan'],
    negativeEvidence: ['arasında kod dönüşümü', 'programlama dillerini öğreten', 'eğitim deneyimi'],
  },
  'image-generation': {
    queryGroups: [
      ['görsel', 'resim', 'fotoğraf', 'illüstrasyon'],
      ['üret', 'oluştur', 'çiz', 'yap'],
    ],
    evidence: [
      'metinden görsel',
      'görsel üret',
      'resim oluştur',
      'image generation',
      'illüstrasyon',
    ],
    negativeEvidence: ['çözünürlüğünü artır', 'parazit temizler', 'görsel büyüt'],
  },
  'video-generation': {
    queryGroups: [
      ['video', 'animasyon', 'film'],
      ['üret', 'oluştur', 'yap', 'dönüştür'],
    ],
    evidence: [
      'metinden video',
      'video üret',
      'video oluştur',
      'text to video',
      'animasyon oluştur',
    ],
    negativeEvidence: [
      'çözünürlüğünü artır',
      'çözünürlüklü videoları',
      'video iyileştir',
      'gürültü azalt',
      'yükselten',
    ],
  },
  'voice-generation': {
    queryGroups: [
      ['ses', 'seslendirme', 'dublaj', 'voice'],
      ['üret', 'oluştur', 'yap', 'dönüştür', 'klonla'],
    ],
    evidence: [
      'metinden sese',
      'metni sese',
      'text to speech',
      'seslendirme',
      'ses klonlama',
      'voice cloning',
      'dublaj',
    ],
    negativeEvidence: ['gürültü azalt', 'transkript', 'toplantı özeti', 'ses temizleme'],
  },
  'music-generation': {
    queryGroups: [
      ['müzik', 'şarkı', 'beste', 'melodi'],
      ['üret', 'oluştur', 'yap', 'bestele'],
    ],
    evidence: [
      'müzik üret',
      'şarkı oluştur',
      'music generation',
      'beste',
      'melodi',
      'vokal müzik',
      'enstrümantal müzik',
    ],
    negativeEvidence: ['transkript', 'podcast düzenleme', 'gürültü azalt', 'ses temizleme'],
  },
  'workflow-automation': {
    queryGroups: [
      ['otomasyon', 'workflow', 'iş akışı', 'ajan', 'agent'],
      ['otomatikleştir', 'bağla', 'tekrarlayan', 'entegrasyon', 'görev'],
    ],
    evidence: [
      'iş akışı otomasyonu',
      'workflow automation',
      'tekrarlayan görev',
      'iş akışları',
      'uygulamaları birbirine bağ',
      'entegrasyon',
      'otomatikleştir',
      'no-code otomasyon',
    ],
    negativeEvidence: ['görsel oluştur', 'video çözünürlük', 'fotoğraf üret', 'görüntü kalitesi'],
  },
  'data-analysis': {
    queryGroups: [
      ['veri', 'csv', 'excel', 'sql', 'dataset'],
      ['analiz', 'rapor', 'grafik', 'görselleştir', 'dashboard'],
    ],
    evidence: [
      'veri analizi',
      'data analysis',
      'csv',
      'veri set',
      'elektronik tablo',
      'veri görselleştirme',
      'dashboard',
      'grafik oluştur',
      'grafik çiz',
      'istatistiksel model',
      'iş zekası',
    ],
    negativeEvidence: [
      'seo analizi',
      'içerik optimizasyon',
      'görsel üret',
      'fotoğraf oluştur',
      'reklam materyalleri',
      'proje yönetimi',
      'zaman takip',
    ],
  },
  'content-writing': {
    queryGroups: [
      ['blog', 'makale', 'içerik', 'metin'],
      ['yaz', 'hazırla', 'kaleme'],
    ],
    evidence: [
      'blog yazısı',
      'makale',
      'içerik üret',
      'metin üret',
      'seo uyumlu metin',
      'reklam metni',
      'pazarlama metni',
    ],
    negativeEvidence: ['görsel üret', 'video oluştur', 'kod üret', 'seslendirme'],
  },
  translation: {
    queryGroups: [
      ['çeviri', 'çevir', 'tercüme', 'translation'],
      ['metin', 'dil', 'türkçe', 'ingilizce'],
    ],
    evidence: [
      'metin çeviri',
      'diller arası çeviri',
      'çok dilli çeviri',
      'çeviri yap',
      'translation',
      'tercüme',
    ],
    negativeEvidence: [
      'kod çeviri',
      'kod anlama',
      'programlama',
      'toplantı özeti',
      'toplantı platform',
      'seslendirme',
      'ses klonlama',
      'video oluştur',
      'videoya dönüştür',
    ],
  },
  'presentation-creation': {
    queryGroups: [
      ['sunum', 'slayt'],
      ['hazırla', 'oluştur', 'üret', 'yap', 'öner', 'araç', 'gerekli'],
    ],
    evidence: ['sunum oluştur', 'sunum hazırla', 'slayt oluştur', 'presentation', 'sunum', 'slayt'],
  },
};
