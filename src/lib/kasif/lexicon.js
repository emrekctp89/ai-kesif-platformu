export const KASIF_CONCEPTS = {
  'gorsel-uretim': ['görsel', 'resim', 'fotoğraf', 'illüstrasyon', 'image'],
  'video-uretim': ['video', 'animasyon', 'montaj', 'film'],
  'ses-muzik': ['ses', 'müzik', 'podcast', 'voice', 'audio'],
  'metin-yazarligi': ['metin', 'yazı', 'blog', 'içerik', 'çeviri'],
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
  'presentation-creation': {
    queryGroups: [
      ['sunum', 'slayt'],
      ['hazırla', 'oluştur', 'üret', 'yap', 'öner', 'araç', 'gerekli'],
    ],
    evidence: ['sunum oluştur', 'sunum hazırla', 'slayt oluştur', 'presentation', 'sunum', 'slayt'],
  },
};
