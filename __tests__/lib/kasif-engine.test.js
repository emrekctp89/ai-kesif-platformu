jest.mock('server-only', () => ({}));
jest.mock('@/utils/supabase/server', () => ({ createClient: jest.fn() }));

import {
  answerMetaQuestion,
  answerQuestion,
  detectMetaIntent,
  prioritizeGoals,
  rankTools,
  understandConversation,
  understandQuestion,
} from '@/lib/kasif/engine';

const records = [
  {
    id: 1,
    name: 'Sunum Pro',
    slug: 'sunum-pro',
    description: 'Hızlı sunum hazırlar',
    pricing_model: 'paid',
  },
  {
    id: 2,
    name: 'Slayt Free',
    slug: 'slayt-free',
    description: 'Sunum ve slayt hazırlar',
    pricing_model: 'freemium',
    is_verified: true,
  },
];

const meetingRecords = [
  { id: 3, name: 'Generic Chat', description: 'Ekip iletişimi ve toplantı platformu' },
  {
    id: 4,
    name: 'Meeting Notes',
    description: 'Toplantı kaydını transkript ve özet haline getirir',
  },
];

describe('Kâşif engine', () => {
  it('ücretsiz araç niyetini belirler', () => {
    const intent = understandQuestion(
      'Ücretsiz sunum hazırlamak için hangi araçları kullanabilirim?'
    );
    expect(intent.wantsFree).toBe(true);
    expect(intent.tokens).toEqual(['sunum']);
  });

  it('fiyat tercihini sıralamaya yansıtır', () => {
    expect(rankTools(records, understandQuestion('Ücretsiz sunum aracı'))[0].record.id).toBe(2);
  });

  it('yalnızca sıralanan kayıtlarla kaynaklı cevap üretir', () => {
    const result = answerQuestion('Ücretsiz sunum aracı', records);
    expect(result.insufficientContext).toBe(false);
    expect(result.answer).toContain('Slayt Free');
    expect(result.sourceIds[0]).toBe('tool:2');
  });

  it('İngilizce soruyu anlayıp İngilizce yanıt üretir', () => {
    const result = answerQuestion('Recommend a free presentation tool', records, [], 'en');

    expect(result.intent.goals).toContain('presentation-creation');
    expect(result.intent.pricePreference).toBe('free');
    expect(result.answer).toContain('Based on platform data');
    expect(result.answer).toContain('free or offers a free plan');
    expect(result.answer).not.toContain('araçlar');
  });

  it('İngilizce ücret reddini ve karşılaştırma niyetini anlar', () => {
    const intent = understandQuestion('Compare presentation tools without paying');

    expect(intent.wantsFree).toBe(true);
    expect(intent.wantsPaid).toBe(false);
    expect(intent.wantsComparison).toBe(true);
    expect(intent.goals).toContain('presentation-creation');
  });

  it('İngilizce takip sorusunda önceki konuyu korur', () => {
    const intent = understandConversation('Which of these are free?', [
      { role: 'user', content: 'Recommend a tool to create presentations' },
    ]);

    expect(intent.goals).toContain('presentation-creation');
    expect(intent.wantsFree).toBe(true);
    expect(intent.tokens).toContain('presentations');
  });

  it('genel kategori eşleşmesi yerine doğrudan görev yeteneğini öne alır', () => {
    const intent = understandQuestion('Toplantı notlarını otomatik özetlemek istiyorum');
    expect(intent.goals).toContain('meeting-notes');
    expect(rankTools(meetingRecords, intent)[0].record.id).toBe(4);
  });

  it('ücretli olmasın ifadesini ücretsiz tercihine dönüştürür', () => {
    const intent = understandQuestion('Sunum aracı ücretli olmasın');
    expect(intent.wantsFree).toBe(true);
    expect(intent.wantsPaid).toBe(false);
  });

  it('uygun seçenek varken fiyat tercihini katı filtre olarak uygular', () => {
    const ranked = rankTools(records, understandQuestion('Ücretsiz sunum aracı'));
    expect(ranked.every(({ record }) => record.pricing_model === 'freemium')).toBe(true);
  });

  it('aynı görev uygunluğunda daha yüksek platform puanını öne alır', () => {
    const ratedRecords = [
      {
        id: 40,
        name: 'Sunum Orta',
        description: 'Sunum ve slayt oluşturur',
        average_rating: 3.2,
      },
      {
        id: 41,
        name: 'Sunum Güçlü',
        description: 'Sunum ve slayt oluşturur',
        average_rating: 4.9,
      },
    ];

    expect(rankTools(ratedRecords, understandQuestion('Sunum oluşturma aracı'))[0].record.id).toBe(
      41
    );
  });

  it('karşılaştırma yanıtında kategori ve fiyat bilgisini gösterir', () => {
    const comparisonRecords = records.map((record) => ({
      ...record,
      category: { name: 'Üretkenlik' },
    }));
    const result = answerQuestion('Bu sunum araçlarını karşılaştır', comparisonRecords);
    expect(result.answer).toContain('Üretkenlik');
    expect(result.answer).toContain('Freemium');
  });

  it('doğal sunum aracı sorgusunu oluşturma hedefi olarak anlar', () => {
    const intent = understandQuestion('Ücretsiz sunum için hangi araçlar gerekli?');

    expect(intent.goals).toContain('presentation-creation');
    expect(intent.wantsFree).toBe(true);
  });

  it('takip sorusunda önceki konuyu korur ve güncel fiyat tercihini uygular', () => {
    const intent = understandConversation('Peki bunlardan ücretsiz olanlar hangileri?', [
      { role: 'user', content: 'Sunum hazırlamak için araç öner' },
      { role: 'assistant', content: 'Bazı sunum araçları önerdim.' },
    ]);

    expect(intent.goals).toContain('presentation-creation');
    expect(intent.concepts).toContain('uretkenlik');
    expect(intent.tokens).toContain('sunum');
    expect(intent.wantsFree).toBe(true);
    expect(intent.wantsPaid).toBe(false);
  });

  it('takip sorusundaki açık fiyat tercihini geçmiş tercihin üzerine yazar', () => {
    const intent = understandConversation('Bu kez ücretli seçenekleri göster', [
      { role: 'user', content: 'Ücretsiz kod yazma asistanı öner' },
    ]);

    expect(intent.goals).toContain('coding-assistant');
    expect(intent.wantsFree).toBe(false);
    expect(intent.wantsPaid).toBe(true);
  });

  it('açık konu değişikliğinde geçmiş hedefi yeni hedefe sızdırmaz', () => {
    const intent = understandConversation('Hayır, görsel oluşturmak istiyorum', [
      { role: 'user', content: 'Ücretsiz sunum hazırlamak için araç öner' },
      { role: 'assistant', content: 'Sunum araçlarını sıraladım.' },
    ]);

    expect(intent.goals).toEqual(['image-generation']);
    expect(intent.concepts).toEqual(['gorsel-uretim']);
    expect(intent.tokens).toEqual(expect.arrayContaining(['gorsel', 'olusturmak']));
    expect(intent.tokens).not.toContain('sunum');
    expect(intent.wantsFree).toBe(true);
  });

  it('yeni konu açık ama hedef belirsizse geçmiş hedefi taşımayı bırakır', () => {
    const intent = understandConversation('Peki kod araçları nasıl?', [
      { role: 'user', content: 'Sunum hazırlamak için araç öner' },
    ]);

    expect(intent.concepts).toEqual(['kod-yazilim']);
    expect(intent.goals).toEqual([]);
    expect(intent.tokens).toContain('kod');
    expect(intent.tokens).not.toContain('sunum');
  });

  it('takip sorusuna geçmiş bağlamla daha yüksek güvenli yanıt üretir', () => {
    const result = answerQuestion('Peki bunlardan ücretsiz olanlar hangileri?', records, [
      { role: 'user', content: 'Sunum hazırlamak için araç öner' },
    ]);

    expect(result.intent.goals).toContain('presentation-creation');
    expect(result.intent.pricePreference).toBe('free');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('görsel üretim sorgusunda yalnızca çözünürlük artıran aracı geriye iter', () => {
    const imageRecords = [
      {
        id: 10,
        name: 'Görsel Üretici',
        description: 'Metinden yüksek kaliteli görsel üretir ve resim oluşturur',
      },
      {
        id: 11,
        name: 'Görsel Büyütücü',
        description: 'Mevcut görsellerin çözünürlüğünü artırır ve parazit temizler',
      },
    ];

    const ranked = rankTools(imageRecords, understandQuestion('Bir resim çizmek istiyorum'));

    expect(ranked[0].record.id).toBe(10);
  });

  it('video üretim sorgusunda enhancer araçlarını üreticilerin gerisine iter', () => {
    const videoRecords = [
      {
        id: 12,
        name: 'Video Üretici',
        description: 'Metinden video üretir ve animasyon oluşturur',
      },
      {
        id: 13,
        name: 'Video Enhancer',
        description: 'Düşük çözünürlüklü videoları 8K seviyesine yükselten iyileştirme aracı',
      },
    ];

    const intent = understandQuestion('Metinden video ve animasyon oluşturmak istiyorum');
    const ranked = rankTools(videoRecords, intent);

    expect(intent.goals).toContain('video-generation');
    expect(ranked[0].record.id).toBe(12);
  });

  it('seslendirme isteğinde metinden sese aracını transkripsiyon aracının önüne alır', () => {
    const voiceRecords = [
      {
        id: 14,
        name: 'Voice Maker',
        description: 'Metinden sese dönüştürme, seslendirme ve ses klonlama aracı',
      },
      {
        id: 15,
        name: 'Audio Notes',
        description: 'Toplantı seslerini transkript ve özet haline getirir',
      },
    ];

    const intent = understandQuestion(
      'Metinden seslendirme ve yapay zeka sesi oluşturmak istiyorum'
    );
    const ranked = rankTools(voiceRecords, intent);

    expect(intent.goals).toContain('voice-generation');
    expect(ranked[0].record.id).toBe(14);
  });

  it('müzik üretim isteğini tanır ve müzik üreticisini öne alır', () => {
    const musicRecords = [
      {
        id: 16,
        name: 'Music Maker',
        description: 'Vokal ve enstrümantal müzik üretir, melodi ve beste oluşturur',
      },
      {
        id: 17,
        name: 'Podcast Editor',
        description: 'Podcast düzenleme, transkript ve ses temizleme aracı',
      },
    ];

    const intent = understandQuestion('Yapay zeka ile müzik ve şarkı üretmek istiyorum');
    const ranked = rankTools(musicRecords, intent);

    expect(intent.concepts).toContain('muzik-uretim');
    expect(intent.goals).toContain('music-generation');
    expect(ranked[0].record.id).toBe(16);
  });

  it('workflow otomasyon isteğinde entegrasyon aracını görsel aracının önüne alır', () => {
    const automationRecords = [
      {
        id: 18,
        name: 'Workflow Builder',
        description: 'Uygulamaları birbirine bağlar ve tekrarlayan görevleri otomatikleştirir',
      },
      {
        id: 19,
        name: 'AI Designer',
        description: 'Yapay zeka ile görsel oluşturur ve fotoğraf üretir',
      },
    ];

    const intent = understandQuestion(
      'Tekrarlayan işlerimi otomatikleştirecek bir workflow aracı öner'
    );
    const ranked = rankTools(automationRecords, intent);

    expect(intent.goals).toContain('workflow-automation');
    expect(ranked[0].record.id).toBe(18);
  });

  it('veri analizi isteğinde CSV analiz aracını SEO aracının önüne alır', () => {
    const analysisRecords = [
      {
        id: 23,
        name: 'Data Analyst',
        description: 'CSV verilerini analiz eder, dashboard ve grafik oluşturur',
      },
      {
        id: 24,
        name: 'SEO Analyzer',
        description: 'SEO analizi ve içerik optimizasyon raporu sunar',
      },
    ];

    const intent = understandQuestion('CSV verilerimi analiz edip grafik oluşturmak istiyorum');
    const ranked = rankTools(analysisRecords, intent);

    expect(intent.goals).toContain('data-analysis');
    expect(ranked[0].record.id).toBe(23);
  });

  it('blog yazımı isteğinde içerik üreticisini görsel aracının önüne alır', () => {
    const writingRecords = [
      {
        id: 25,
        name: 'Content Writer',
        description: 'SEO uyumlu blog yazısı, makale ve pazarlama metni üretir',
      },
      {
        id: 26,
        name: 'Image Writer',
        description: 'Metin komutlarından görsel üretir ve video oluşturur',
      },
    ];

    const intent = understandQuestion('SEO uyumlu blog yazısı ve pazarlama metni oluştur');
    const ranked = rankTools(writingRecords, intent);

    expect(intent.goals).toContain('content-writing');
    expect(ranked[0].record.id).toBe(25);
  });

  it('metin çevirisi isteğinde dil aracını kod çeviricisinin önüne alır', () => {
    const translationRecords = [
      {
        id: 27,
        name: 'Language Translator',
        description: 'Metin çeviri ve diller arası çeviri yapar',
      },
      {
        id: 28,
        name: 'Code Translator',
        description: 'Programlama dilleri arasında kod çeviri ve kod anlama sağlar',
      },
    ];

    const intent = understandQuestion('Uzun bir metni Türkçeye çevirmek istiyorum');
    const ranked = rankTools(translationRecords, intent);

    expect(intent.concepts).toContain('metin-yazarligi');
    expect(intent.goals).toContain('translation');
    expect(ranked[0].record.id).toBe(27);
  });

  it('kod asistanı sorgusunda eğitim ve dönüşüm araçlarını geriye iter', () => {
    const codingRecords = [
      {
        id: 20,
        name: 'Kod Asistanı',
        description: 'IDE içinde kod yazar, kod tamamlar ve hata ayıklar',
      },
      {
        id: 21,
        name: 'Kod Dönüştürücü',
        description: 'Programlama dilleri arasında kod dönüşümü yapar',
      },
      {
        id: 22,
        name: 'Kod Akademisi',
        description: 'Programlama dillerini eğitim ve derslerle öğretir',
      },
    ];

    const ranked = rankTools(codingRecords, understandQuestion('Kod yazmak için asistan öner'));

    expect(ranked[0].record.id).toBe(20);
  });

  it('aynı alan adındaki ürün varyantlarıyla sonuç listesini doldurmaz', () => {
    const variants = [
      {
        id: 30,
        name: 'Otter.ai',
        description: 'Toplantı transkript ve özet aracı',
        link: 'https://otter.ai/',
      },
      {
        id: 31,
        name: 'Otter Teams',
        description: 'Toplantı transkript ve özet aracı',
        link: 'https://otter.ai/teams',
      },
      {
        id: 32,
        name: 'Fathom',
        description: 'Toplantı transkript ve özet aracı',
        link: 'https://fathom.video/',
      },
    ];

    const ranked = rankTools(variants, understandQuestion('Toplantı notlarını otomatik özetle'));

    const ids = ranked.map(({ record }) => record.id);
    expect(ids).toHaveLength(2);
    expect(ids).toEqual(expect.arrayContaining([30, 32]));
    expect(ids).not.toContain(31);
  });

  it('logo tasarım isteğini genel görsel üretimden ayırır', () => {
    const designRecords = [
      {
        id: 50,
        name: 'Logo Maker',
        description: 'Logo tasarım ve marka kimliği oluşturur',
      },
      {
        id: 51,
        name: 'Image Studio',
        description: 'Metinden görsel üretir ve resim oluşturur',
      },
    ];

    const intent = understandQuestion('Markam için logo tasarlamak istiyorum');
    const ranked = rankTools(designRecords, intent);

    expect(intent.goals).toContain('logo-design');
    expect(intent.concepts).toContain('tasarim');
    expect(ranked[0].record.id).toBe(50);
  });

  it('chatbot asistanı isteğini kod asistanından ayırır', () => {
    const assistantRecords = [
      {
        id: 52,
        name: 'Chat Helper',
        description: 'Sohbet botu ve yapay zeka asistan arayüzü sunar',
      },
      {
        id: 53,
        name: 'Code Buddy',
        description: 'IDE içinde kod yazar ve kod tamamlar',
      },
    ];

    const intent = understandQuestion('Gündelik sorular için sohbet asistanı öner');
    const ranked = rankTools(assistantRecords, intent);

    expect(intent.goals).toContain('chatbot-assistant');
    expect(ranked[0].record.id).toBe(52);
  });

  it('e-posta yazımı isteğini tanır', () => {
    const emailRecords = [
      {
        id: 54,
        name: 'Mail Writer',
        description: 'Soğuk e-posta ve e-posta kampanya metni yazar',
      },
      {
        id: 55,
        name: 'Blog Bot',
        description: 'SEO uyumlu blog yazısı ve makale üretir',
      },
    ];

    const intent = understandQuestion('Soğuk e-posta kampanyası yazmak için araç öner');
    const ranked = rankTools(emailRecords, intent);

    expect(intent.goals).toContain('email-writing');
    expect(ranked[0].record.id).toBe(54);
  });

  it('SEO optimizasyon isteğini veri analizinden ayırır', () => {
    const seoRecords = [
      {
        id: 56,
        name: 'SEO Pro',
        description: 'SEO analizi, anahtar kelime ve sıralama raporu sunar',
      },
      {
        id: 57,
        name: 'Data Plot',
        description: 'CSV verilerini analiz eder ve dashboard grafik oluşturur',
      },
    ];

    const intent = understandQuestion('Sitem için SEO analizi ve anahtar kelime araçları öner');
    const ranked = rankTools(seoRecords, intent);

    expect(intent.goals).toContain('seo-optimization');
    expect(ranked[0].record.id).toBe(56);
  });

  it('müşteri destek otomasyonu isteğini tanır', () => {
    const supportRecords = [
      {
        id: 58,
        name: 'Helpdesk AI',
        description: 'Müşteri destek botu ve ticket otomasyonu sağlar',
      },
      {
        id: 59,
        name: 'Sales CRM',
        description: 'Satış pipeline ve lead yönetimi sunar',
      },
    ];

    const intent = understandQuestion(
      'Müşteri destek ticket yanıtlarını otomatikleştiren bot öner'
    );
    const ranked = rankTools(supportRecords, intent);

    expect(intent.goals).toContain('customer-support');
    expect(ranked[0].record.id).toBe(58);
  });

  it('e-ticaret ürün açıklaması isteğini tanır', () => {
    const commerceRecords = [
      {
        id: 60,
        name: 'Product Copy',
        description: 'E-ticaret ürün açıklaması ve product listing yazar',
      },
      {
        id: 61,
        name: 'Blog Writer',
        description: 'Blog yazısı ve makale üretir',
      },
    ];

    const intent = understandQuestion('Mağaza için ürün açıklaması yazacak araç öner');
    const ranked = rankTools(commerceRecords, intent);

    expect(intent.goals).toContain('ecommerce-copy');
    expect(ranked[0].record.id).toBe(60);
  });

  it('hukuki sözleşme inceleme isteğini tanır', () => {
    const legalRecords = [
      {
        id: 62,
        name: 'Contract AI',
        description: 'Sözleşme inceleme ve yasal uyumluluk analizi yapar',
      },
      {
        id: 63,
        name: 'Copywriter',
        description: 'Pazarlama metni ve blog yazısı üretir',
      },
    ];

    const intent = understandQuestion('Hukuki sözleşme incelemek için AI aracı öner');
    const ranked = rankTools(legalRecords, intent);

    expect(intent.goals).toContain('legal-review');
    expect(ranked[0].record.id).toBe(62);
  });

  it('3D model üretim isteğini tanır', () => {
    const modelRecords = [
      {
        id: 64,
        name: 'MeshGen',
        description: 'Metinden 3D model ve avatar oluşturur',
      },
      {
        id: 65,
        name: 'PhotoGen',
        description: 'Metinden görsel üretir ve resim oluşturur',
      },
    ];

    const intent = understandQuestion('Metinden 3D model ve avatar oluşturmak istiyorum');
    const ranked = rankTools(modelRecords, intent);

    expect(intent.goals).toContain('three-d-generation');
    expect(intent.concepts).toContain('3d-modelleme');
    expect(ranked[0].record.id).toBe(64);
  });

  it('ücretsiz tercihli yanıtta fiyat ipucu ekler', () => {
    const result = answerQuestion('Ücretsiz sunum aracı', records);
    expect(result.answer).toContain('ücretsiz/freemium tercihine göre');
  });

  it('meta kimlik sorusunu katalog aramadan yanıtlar', () => {
    expect(detectMetaIntent('Sen kimsin ve görevin ne?')).toBe('identity');
    const result = answerMetaQuestion('Sen kimsin?', 'tr');
    expect(result.meta).toBe(true);
    expect(result.answer).toMatch(/Kâşif/i);
    expect(result.sourceIds).toEqual([]);
    expect(result.confidence).toBeGreaterThanOrEqual(0.99);
  });

  it('yetenek ve çalışma biçimi meta sorularını ayırır', () => {
    expect(detectMetaIntent('Ne yapabilirsin?')).toBe('capabilities');
    expect(detectMetaIntent('How do you work?')).toBe('how');
    expect(answerMetaQuestion('What can you do?', 'en').answer).toMatch(/recommend tools/i);
  });

  it('net goal eşleşmesinde güven tabanı uygular', () => {
    const result = answerQuestion('Ücretsiz sunum aracı', records);
    expect(result.intent.goals).toContain('presentation-creation');
    expect(result.confidence).toBeGreaterThanOrEqual(0.78);
  });

  it('daha spesifik goal genel olanı baskılar', () => {
    expect(prioritizeGoals(['image-generation', 'logo-design'])).toEqual(['logo-design']);
    expect(prioritizeGoals(['learning-tutor', 'coding-assistant'])).toEqual(['coding-assistant']);
    expect(prioritizeGoals(['content-writing', 'email-writing'])).toEqual(['email-writing']);
  });

  it('kod öğrenme starterında coding-assistant öğrenme hedefini baskılar', () => {
    const intent = understandQuestion(
      'Kodlama öğrenirken bana yardımcı olacak ücretsiz AI araçları öner'
    );
    expect(intent.goals).toContain('coding-assistant');
    expect(intent.goals).not.toContain('learning-tutor');
  });
});
