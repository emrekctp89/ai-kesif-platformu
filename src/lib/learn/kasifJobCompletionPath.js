/** Platform learning path, localized and aligned with PRO access. */
export const KASIF_LEARN_MODULES = [
  {
    id: 'mindset',
    durationMin: 3,
    title: {
      tr: '1. Platforma ilk bakış',
      en: '1. Your first look at the platform',
    },
    summary: {
      tr: 'AI Keşif’te araç keşfi, öğrenme kaynakları ve topluluk bir arada. Kâşif sistem hakkında sohbet eder; WorkMind ve iş paketleri PRO özellikleridir.',
      en: 'AI Keşif combines tool discovery, learning resources and community. Kâşif chats about the system; WorkMind and job packs are PRO features.',
    },
    learn: [
      {
        tr: 'Önce yapmak istediğin işi tek cümlede yaz.',
        en: 'Describe your goal in one sentence.',
      },
      {
        tr: 'Öğrenme dersleri ve temel sohbet herkese açıktır.',
        en: 'Learning lessons and basic chat are open to everyone.',
      },
    ],
    practice: {
      label: {
        tr: 'Pratik',
        en: 'Practice',
      },
      body: {
        tr: 'Öğren merkezinde hedefinle eşleşen bir rota seç.',
        en: 'Choose a learning route that matches your goal.',
      },
      cta: {
        tr: 'Rotaları aç',
        en: 'Open routes',
      },
      href: '/ogren',
    },
  },
  {
    id: 'ask',
    durationMin: 5,
    title: {
      tr: '2. Kâşif ile sistemi tanı',
      en: '2. Get to know the system with Kâşif',
    },
    summary: {
      tr: 'Kâşif platformun sohbet asistanıdır. Site özelliklerini, kategorileri ve üyelik ayrımını sorabilirsin. Araç önerileri katalog verilerine dayanır.',
      en: 'Kâşif is the platform chat assistant. Ask about site features, categories and membership. Tool recommendations use catalog data.',
    },
    learn: [
      {
        tr: '“Bu platform nasıl çalışır?” diye sor.',
        en: 'Ask “How does this platform work?”',
      },
      {
        tr: 'Takip sorusunda anlamadığın özelliği netleştir.',
        en: 'Use a follow-up to clarify an unfamiliar feature.',
      },
    ],
    practice: {
      label: {
        tr: 'Pratik',
        en: 'Practice',
      },
      body: {
        tr: 'Kâşif’e PRO üyeliğin neleri içerdiğini sor.',
        en: 'Ask Kâşif what PRO membership includes.',
      },
      cta: {
        tr: 'Kâşif ile sohbet et',
        en: 'Chat with Kâşif',
      },
      href: '/kasif',
    },
  },
  {
    id: 'wizard',
    durationMin: 5,
    title: {
      tr: '3. Katalogdan araç seç',
      en: '3. Choose a catalog tool',
    },
    summary: {
      tr: 'Bir kategori seçip aynı işi yapan araçların ayrıntılarını incele. Katalog bir başlangıç noktasıdır; satın almadan önce aracın kendi güncel koşullarını kontrol et.',
      en: 'Choose a category and inspect tools that solve the same task. The catalog is a starting point; check the vendor’s current terms before buying.',
    },
    learn: [
      {
        tr: 'Hedefine uygun iki aracı not et.',
        en: 'Record two tools suited to your goal.',
      },
      {
        tr: 'Fiyat, platform ve kullanım koşullarını kontrol et.',
        en: 'Check pricing, platforms and usage terms.',
      },
    ],
    practice: {
      label: {
        tr: 'Pratik',
        en: 'Practice',
      },
      body: {
        tr: 'Bir kategoriye gir ve iki araç seç.',
        en: 'Open a category and select two tools.',
      },
      cta: {
        tr: 'Kategorileri keşfet',
        en: 'Explore categories',
      },
      href: '/kategori',
    },
  },
  {
    id: 'workmind',
    durationMin: 6,
    title: {
      tr: '4. WorkMind ile iş akışı planla · PRO',
      en: '4. Plan a workflow with WorkMind · PRO',
    },
    summary: {
      tr: 'WorkMind bir hedefi adımlara ayırır ve ilgili araçları önerir. İş akışı üretmek ve kaydetmek PRO üyelik gerektirir.',
      en: 'WorkMind splits a goal into steps and suggests relevant tools. Generating and saving workflows requires PRO membership.',
    },
    learn: [
      {
        tr: 'Hedefe kapsam ve çıktı ölçütü ekle.',
        en: 'Add scope and an output criterion to the goal.',
      },
      {
        tr: 'Üretilen planın adımlarını uygulamadan önce incele.',
        en: 'Review generated steps before carrying them out.',
      },
    ],
    practice: {
      label: {
        tr: 'Pratik',
        en: 'Practice',
      },
      body: {
        tr: 'PRO üyeysen küçük bir hedefle akış oluştur. Değilsen üyelik kapsamını incele.',
        en: 'If you have PRO, create a workflow for a small goal. Otherwise, review the membership features.',
      },
      cta: {
        tr: 'WorkMind’i aç',
        en: 'Open WorkMind',
      },
      href: '/workmind',
    },
  },
  {
    id: 'packs',
    durationMin: 8,
    title: {
      tr: '5. İş paketlerini kullan · PRO',
      en: '5. Use job packs · PRO',
    },
    summary: {
      tr: 'Tüm Kâşif iş paketleri PRO üyeliğe dahildir. Paket bir görev için yapılandırılmış çıktı üretir; doğruluğu ve uygunluğu sen kontrol edersin.',
      en: 'All Kâşif job packs are included in PRO. A pack produces structured output for a task; you review its accuracy and suitability.',
    },
    learn: [
      {
        tr: 'Paket briefine hedef kitle, kapsam ve beklenen çıktıyı ekle.',
        en: 'Include audience, scope and expected output in the brief.',
      },
      {
        tr: 'Üyelik kontrolü sunucuda uygulanır; ücretsiz deneme hakkı yoktur.',
        en: 'Membership is checked on the server; there is no free trial quota.',
      },
    ],
    practice: {
      label: {
        tr: 'Pratik',
        en: 'Practice',
      },
      body: {
        tr: 'PRO üyeysen araştırma paketiyle kısa bir brief dene.',
        en: 'If you have PRO, try a short brief with the research pack.',
      },
      cta: {
        tr: 'İş paketlerini aç',
        en: 'Open job packs',
      },
      href: '/kasif',
      pack: 'research-brief',
      runner: true,
    },
  },
  {
    id: 'bridge',
    durationMin: 5,
    title: {
      tr: '6. Çıktıyı değerlendir ve not al',
      en: '6. Review the output and take notes',
    },
    summary: {
      tr: 'Bir yanıtın üretilmesi işin tamamlandığı anlamına gelmez. Kaynakları, kısıtları ve çıktının gerçek hedefini karşılayıp karşılamadığını kontrol et.',
      en: 'Generating an answer does not finish the task. Check sources, constraints and whether the output meets the actual goal.',
    },
    learn: [
      {
        tr: 'Önemli iddiaları özgün kaynakla doğrula.',
        en: 'Verify important claims against original sources.',
      },
      {
        tr: 'Öğrendiğin bir şeyi ve sonraki denemeyi not et.',
        en: 'Record one lesson learned and your next experiment.',
      },
    ],
    practice: {
      label: {
        tr: 'Pratik',
        en: 'Practice',
      },
      body: {
        tr: 'Öğrenme rotasında kontrol dersini bitir ve notlarını indir.',
        en: 'Finish a route’s review lesson and download your notes.',
      },
      cta: {
        tr: 'Alıştırmalara dön',
        en: 'Return to exercises',
      },
      href: '/ogren',
    },
  },
  {
    id: 'add-tool',
    durationMin: 4,
    title: {
      tr: '7. Topluluğa araç öner',
      en: '7. Suggest a tool to the community',
    },
    summary: {
      tr: 'Yararlı bulduğun bir aracı platforma önerebilirsin. Öneriler onay sürecinden geçer; göndermek otomatik yayımlanacağı anlamına gelmez.',
      en: 'Suggest a useful tool to the platform. Suggestions go through approval; submitting does not automatically publish them.',
    },
    learn: [
      {
        tr: 'Resmî araç bağlantısını ve açıklamasını hazırla.',
        en: 'Prepare the official URL and a description.',
      },
      {
        tr: 'Mevcut katalogda aynı aracın olup olmadığını kontrol et.',
        en: 'Check whether the catalog already contains the tool.',
      },
    ],
    practice: {
      label: {
        tr: 'Pratik',
        en: 'Practice',
      },
      body: {
        tr: 'Araç önerme formunu incele; gerçekten kullandığın bir ürün varsa öner.',
        en: 'Review the suggestion form and submit a product you have actually used.',
      },
      cta: {
        tr: 'Araç öner',
        en: 'Suggest a tool',
      },
      href: '/submit',
    },
  },
  {
    id: 'capstone',
    durationMin: 10,
    title: {
      tr: '8. Kendi mini projenle pekiştir',
      en: '8. Practice with your own mini project',
    },
    summary: {
      tr: 'Bir rotayı seç, küçük bir çıktı üret ve nasıl iyileştireceğini kaydet. PRO araçlar isteğe bağlıdır; öğrenme alıştırmalarını harici araçlarla da yapabilirsin.',
      en: 'Choose a route, produce a small output and record how to improve it. PRO features are optional; external tools can be used for learning exercises.',
    },
    learn: [
      {
        tr: 'Tek bir somut çıktı hedefle: özet, brief veya görev listesi.',
        en: 'Aim for one concrete output: a summary, brief or task list.',
      },
      {
        tr: 'Çıktıyı kontrol et ve bir sonraki deneme için not bırak.',
        en: 'Review the output and record your next experiment.',
      },
    ],
    practice: {
      label: {
        tr: 'Pratik',
        en: 'Practice',
      },
      body: {
        tr: 'Öğren merkezindeki bir rotanın üç dersini tamamla.',
        en: 'Complete all three lessons in a learning hub route.',
      },
      cta: {
        tr: 'Mini projeye başla',
        en: 'Start a mini project',
      },
      href: '/ogren',
    },
  },
];
export const KASIF_LEARN_OUTCOMES = [
  {
    tr: 'Kâşif ile sistem hakkında sohbet etmek',
    en: 'Chat with Kâşif about the platform',
  },
  {
    tr: 'Katalogdan araç seçip karşılaştırmak',
    en: 'Choose and compare catalog tools',
  },
  {
    tr: 'WorkMind ve iş paketlerinin PRO kapsamını anlamak',
    en: 'Understand PRO access to WorkMind and job packs',
  },
  {
    tr: 'Öğrenme alıştırmalarını tamamlayıp not almak',
    en: 'Complete learning exercises and take notes',
  },
];

export function pickLocale(value, locale = 'tr') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return locale === 'en' ? value.en || value.tr : value.tr || value.en;
}

/**
 * @param {string} href
 * @param {string} [locale]
 * @param {string|{ q?: string, pack?: string, runner?: boolean|string, [key: string]: unknown }} [queryOrParams]
 */
export function buildLearnHref(href, locale, queryOrParams) {
  const prefix = locale === 'en' ? '/en' : '';
  const base = `${prefix}${href.startsWith('/') ? href : `/${href}`}`;
  if (queryOrParams == null || queryOrParams === '') return base;

  const params = new URLSearchParams();
  if (typeof queryOrParams === 'string') {
    params.set('q', String(queryOrParams).slice(0, 800));
  } else if (typeof queryOrParams === 'object') {
    if (queryOrParams.q) params.set('q', String(queryOrParams.q).slice(0, 800));
    if (queryOrParams.pack) params.set('pack', String(queryOrParams.pack).trim());
    if (
      queryOrParams.runner === true ||
      queryOrParams.runner === '1' ||
      queryOrParams.runner === 1
    ) {
      params.set('runner', '1');
    }
    for (const [key, value] of Object.entries(queryOrParams)) {
      if (['q', 'pack', 'runner'].includes(key)) continue;
      if (value == null || value === '') continue;
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function getKasifLearnModuleIds() {
  return KASIF_LEARN_MODULES.map((m) => m.id);
}

export const KASIF_LEARN_STORAGE_KEY = 'learn-kasif-job-completion-v1';
