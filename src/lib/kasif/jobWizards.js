/**
 * Goal-specific job wizards for Kâşif P1.
 * Checklist + copyable first-output prompts — no external API.
 */

/** @typedef {{ tr: string, en: string }} LocaleText */
/** @typedef {{ id: string, label: LocaleText, description?: LocaleText }} WizardStep */
/** @typedef {{ id: string, title: LocaleText, body: LocaleText }} WizardPrompt */
/**
 * @typedef {{
 *   id: string,
 *   title?: LocaleText,
 *   hint?: LocaleText,
 *   steps: WizardStep[],
 *   prompts?: WizardPrompt[],
 *   firstResultHint?: LocaleText,
 * }} JobWizardDef
 */

/** @type {JobWizardDef} */
export const DEFAULT_JOB_WIZARD = {
  id: 'default',
  title: {
    tr: 'Genel kurulum',
    en: 'General setup',
  },
  hint: {
    tr: 'Listede bırakmıyoruz — kısa checklist ile ilk sonucu hedefle.',
    en: 'We don’t leave you at a list — hit first result with a short checklist.',
  },
  steps: [
    {
      id: 'open',
      label: {
        tr: 'Aracı aç ve hesap oluştur / giriş yap',
        en: 'Open the tool and create an account / sign in',
      },
    },
    {
      id: 'configure',
      label: {
        tr: 'İlk kurulum veya şablonu tamamla',
        en: 'Finish first-time setup or pick a template',
      },
    },
    {
      id: 'first-output',
      label: {
        tr: 'İlk çıktıyı üret (taslak, görsel, özet…)',
        en: 'Produce a first output (draft, image, summary…)',
      },
    },
  ],
  prompts: [],
  firstResultHint: {
    tr: 'İlk somut çıktıyı aldığında işaretle.',
    en: 'Mark this when you have a concrete first output.',
  },
};

/** @type {Record<string, JobWizardDef>} */
export const JOB_WIZARDS = {
  'presentation-creation': {
    id: 'presentation-creation',
    title: {
      tr: 'Sunum kurulum sihirbazı',
      en: 'Presentation setup wizard',
    },
    hint: {
      tr: 'Amaç: 5–10 slaytlık ilk taslağı aynı oturumda çıkar.',
      en: 'Goal: produce a 5–10 slide first draft in one session.',
    },
    steps: [
      {
        id: 'open',
        label: {
          tr: 'Aracı aç, ücretsiz plan / denemeyi başlat',
          en: 'Open the tool and start free plan / trial',
        },
      },
      {
        id: 'brief',
        label: {
          tr: 'Konu, kitle ve süre (dk) bilgisini gir',
          en: 'Enter topic, audience, and duration (min)',
        },
        description: {
          tr: 'Örn. “Yatırımcı sunumu, 8 dk, SaaS ürünü”',
          en: 'e.g. “Investor pitch, 8 min, SaaS product”',
        },
      },
      {
        id: 'outline',
        label: {
          tr: 'Anahat / slayt iskeletini oluştur',
          en: 'Generate outline / slide skeleton',
        },
      },
      {
        id: 'first-deck',
        label: {
          tr: 'İlk tam taslağı üret ve indir / kopyala',
          en: 'Generate full first draft and export / copy',
        },
      },
    ],
    prompts: [
      {
        id: 'pitch-outline',
        title: { tr: 'Sunum brief şablonu', en: 'Presentation brief template' },
        body: {
          tr: `Konu: [ürün / proje]
Hedef kitle: [yatırımcı / ekip / müşteri]
Süre: [X] dakika
Amaç: [bilgilendir / ikna et / eğitim]
Ton: [profesyonel / samimi]
Slayt yapısı: problem → çözüm → kanıt → çağrı
Her slaytta en fazla 1 ana mesaj olsun.`,
          en: `Topic: [product / project]
Audience: [investor / team / customer]
Duration: [X] minutes
Goal: [inform / persuade / train]
Tone: [professional / friendly]
Slide flow: problem → solution → proof → call to action
One main message per slide.`,
        },
      },
    ],
    firstResultHint: {
      tr: 'İlk sonuç: en az 5 slaytlık indirilebilir / paylaşılabilir taslak.',
      en: 'First result: an exportable draft of at least 5 slides.',
    },
  },

  'image-generation': {
    id: 'image-generation',
    title: {
      tr: 'Görsel üretim sihirbazı',
      en: 'Image generation wizard',
    },
    hint: {
      tr: 'Amaç: en az 1 kullanılabilir görsel + 2 varyasyon.',
      en: 'Goal: at least 1 usable image + 2 variations.',
    },
    steps: [
      {
        id: 'open',
        label: {
          tr: 'Aracı aç ve üretim kotasını kontrol et',
          en: 'Open the tool and check generation quota',
        },
      },
      {
        id: 'brief',
        label: {
          tr: 'Konu, stil, en-boy ve kullanım yerini yaz',
          en: 'Write subject, style, aspect ratio, and use case',
        },
      },
      {
        id: 'generate',
        label: {
          tr: 'İlk prompt ile 2–4 görsel üret',
          en: 'Generate 2–4 images with the first prompt',
        },
      },
      {
        id: 'select',
        label: {
          tr: 'En iyiyi seç, bir varyasyon dene, indir',
          en: 'Pick the best, try one variation, download',
        },
      },
    ],
    prompts: [
      {
        id: 'social-visual',
        title: { tr: 'Sosyal görsel promptu', en: 'Social visual prompt' },
        body: {
          tr: `Konu: [ürün / sahne]
Stil: [minimal / sinematik / illüstrasyon / foto-gerçekçi]
Renk paleti: [ana renkler]
Kompozisyon: [orta plan / üstten / yakın çekim]
En-boy: 1:1 (Instagram) veya 9:16 (story)
Metin yok, yüksek detay, temiz arka plan
Negatif: bulanık, filigran, bozuk el`,
          en: `Subject: [product / scene]
Style: [minimal / cinematic / illustration / photoreal]
Palette: [main colors]
Composition: [medium shot / top-down / close-up]
Aspect: 1:1 (Instagram) or 9:16 (story)
No text, high detail, clean background
Negative: blurry, watermark, deformed hands`,
        },
      },
    ],
    firstResultHint: {
      tr: 'İlk sonuç: indirdiğin en az bir görsel dosyası.',
      en: 'First result: at least one downloaded image file.',
    },
  },

  'coding-assistant': {
    id: 'coding-assistant',
    title: {
      tr: 'Kod asistanı sihirbazı',
      en: 'Coding assistant wizard',
    },
    hint: {
      tr: 'Amaç: çalışan bir iskelet veya hata düzeltmesi.',
      en: 'Goal: a working scaffold or a fixed bug.',
    },
    steps: [
      {
        id: 'open',
        label: {
          tr: 'Aracı aç (web veya editör eklentisi)',
          en: 'Open the tool (web or editor plugin)',
        },
      },
      {
        id: 'context',
        label: {
          tr: 'Dil, framework ve hedefi tek paragrafta yaz',
          en: 'State language, framework, and goal in one paragraph',
        },
      },
      {
        id: 'scaffold',
        label: {
          tr: 'İskelet kod / fonksiyon üret veya hata yapıştır',
          en: 'Generate scaffold code / function or paste an error',
        },
      },
      {
        id: 'run',
        label: {
          tr: 'Çalıştır veya derle; ilk yeşil sonucu al',
          en: 'Run or compile; get the first green result',
        },
      },
    ],
    prompts: [
      {
        id: 'feature-spec',
        title: { tr: 'Özellik istek şablonu', en: 'Feature request template' },
        body: {
          tr: `Dil/stack: [örn. Next.js + Supabase]
Görev: [ne yapmalı]
Girdiler: [...]
Çıktı: [...]
Kısıtlar: [auth yok / ücretsiz plan / edge function]
Lütfen: 1) kısa plan 2) dosya isimleri 3) çalışan kod 4) test adımları
Açıklamayı Türkçe, kodu İngilizce yaz.`,
          en: `Language/stack: [e.g. Next.js + Supabase]
Task: [what it should do]
Inputs: [...]
Output: [...]
Constraints: [no auth / free tier / edge function]
Please provide: 1) short plan 2) file names 3) working code 4) test steps
Explanations in English unless asked otherwise.`,
        },
      },
    ],
    firstResultHint: {
      tr: 'İlk sonuç: çalışan kod parçası veya düzeltilmiş hata.',
      en: 'First result: working code snippet or a fixed error.',
    },
  },

  'seo-optimization': {
    id: 'seo-optimization',
    title: {
      tr: 'SEO sihirbazı',
      en: 'SEO wizard',
    },
    hint: {
      tr: 'Amaç: site/URL için ilk anahtar kelime + aksiyon listesi.',
      en: 'Goal: first keyword set + action list for a site/URL.',
    },
    steps: [
      {
        id: 'open',
        label: {
          tr: 'Aracı aç ve proje / site ekle',
          en: 'Open the tool and add project / site',
        },
      },
      {
        id: 'target',
        label: {
          tr: 'Hedef URL veya sektörü gir',
          en: 'Enter target URL or niche',
        },
      },
      {
        id: 'keywords',
        label: {
          tr: 'İlk anahtar kelime / rakip taramasını çalıştır',
          en: 'Run first keyword / competitor scan',
        },
      },
      {
        id: 'actions',
        label: {
          tr: 'En az 3 aksiyon maddesini kaydet',
          en: 'Save at least 3 action items',
        },
      },
    ],
    prompts: [
      {
        id: 'seo-brief',
        title: { tr: 'SEO brief', en: 'SEO brief' },
        body: {
          tr: `Site: [URL]
Ülke/dil: Türkiye / Türkçe
Hedef: [organik trafik / lead / e-ticaret]
Ana ürün/hizmet: [...]
Rakipler: [2–3 site]
İstediğim çıktı: birincil KW, uzun kuyruk KW, title/meta önerisi, içerik boşlukları`,
          en: `Site: [URL]
Country/language: [market]
Goal: [organic traffic / leads / ecommerce]
Main product/service: [...]
Competitors: [2–3 sites]
Desired output: primary KW, long-tail KW, title/meta ideas, content gaps`,
        },
      },
    ],
    firstResultHint: {
      tr: 'İlk sonuç: kaydettiğin anahtar kelime veya denetim özeti.',
      en: 'First result: a saved keyword list or audit summary.',
    },
  },

  'email-writing': {
    id: 'email-writing',
    title: {
      tr: 'E-posta yazım sihirbazı',
      en: 'Email writing wizard',
    },
    hint: {
      tr: 'Amaç: gönderime hazır 1 e-posta (konu + gövde).',
      en: 'Goal: one send-ready email (subject + body).',
    },
    steps: [
      {
        id: 'open',
        label: {
          tr: 'Aracı aç ve yeni taslak başlat',
          en: 'Open the tool and start a new draft',
        },
      },
      {
        id: 'audience',
        label: {
          tr: 'Alıcı, amaç ve tonu tanımla',
          en: 'Define recipient, goal, and tone',
        },
      },
      {
        id: 'draft',
        label: {
          tr: 'Konu satırı + gövde taslağını üret',
          en: 'Generate subject line + body draft',
        },
      },
      {
        id: 'polish',
        label: {
          tr: 'Kısalt, CTA ekle, panoya kopyala',
          en: 'Tighten, add CTA, copy to clipboard',
        },
      },
    ],
    prompts: [
      {
        id: 'cold-email',
        title: { tr: 'Soğuk e-posta şablonu', en: 'Cold email template' },
        body: {
          tr: `Alıcı rolü: [pazarlama müdürü / kurucu]
Ürünümüz: [tek cümle değer]
Kanıt: [sayı / referans]
İstek: [15 dk görüşme / demo]
Ton: kısa, samimi, spam hissi yok
Çıktı: 3 konu satırı + 120 kelimelik gövde + net CTA`,
          en: `Recipient role: [marketing lead / founder]
Our product: [one-line value]
Proof: [metric / reference]
Ask: [15 min call / demo]
Tone: short, human, not spammy
Output: 3 subject lines + ~120 word body + clear CTA`,
        },
      },
    ],
    firstResultHint: {
      tr: 'İlk sonuç: kopyalanmış konu + gövde metni.',
      en: 'First result: copied subject + body text.',
    },
  },

  'chatbot-assistant': {
    id: 'chatbot-assistant',
    title: {
      tr: 'Sohbet asistanı sihirbazı',
      en: 'Chat assistant wizard',
    },
    hint: {
      tr: 'Amaç: günlük işine yarayan ilk sohbet çıktısı.',
      en: 'Goal: a first chat output you can use today.',
    },
    steps: [
      {
        id: 'open',
        label: {
          tr: 'Aracı aç ve (gerekirse) model seç',
          en: 'Open the tool and pick a model if needed',
        },
      },
      {
        id: 'task',
        label: {
          tr: 'Gerçek bir görevi tek cümlede yaz',
          en: 'Write a real task in one sentence',
        },
      },
      {
        id: 'iterate',
        label: {
          tr: 'Yanıtı al; bir daraltma sorusu sor',
          en: 'Get a reply; ask one refinement question',
        },
      },
      {
        id: 'save',
        label: {
          tr: 'Kullanacağın çıktıyı kaydet / kopyala',
          en: 'Save / copy the output you will use',
        },
      },
    ],
    prompts: [
      {
        id: 'daily-helper',
        title: { tr: 'Günlük asistan promptu', en: 'Daily helper prompt' },
        body: {
          tr: `Sen pratik bir asistanısın. Görevim: […].
Kısıtlar: [süre / dil / format]
Önce 3 maddelik plan ver, sonra nihai çıktıyı üret.
Gereksiz giriş yapma.`,
          en: `You are a practical assistant. My task: […].
Constraints: [time / language / format]
First give a 3-bullet plan, then the final deliverable.
No fluff.`,
        },
      },
    ],
    firstResultHint: {
      tr: 'İlk sonuç: kaydettiğin / kullandığın asistan cevabı.',
      en: 'First result: an assistant answer you saved or used.',
    },
  },

  'content-writing': {
    id: 'content-writing',
    title: {
      tr: 'İçerik yazım sihirbazı',
      en: 'Content writing wizard',
    },
    hint: {
      tr: 'Amaç: yayınlanabilir ilk taslak (en az 400 kelime veya outline).',
      en: 'Goal: publishable first draft (400+ words or solid outline).',
    },
    steps: [
      {
        id: 'open',
        label: {
          tr: 'Aracı aç ve yeni belge başlat',
          en: 'Open the tool and start a new document',
        },
      },
      {
        id: 'brief',
        label: {
          tr: 'Konu, kitle, anahtar kelime ve formatı gir',
          en: 'Enter topic, audience, keyword, and format',
        },
      },
      {
        id: 'outline',
        label: {
          tr: 'Başlık + alt başlık anahatını üret',
          en: 'Generate title + H2 outline',
        },
      },
      {
        id: 'draft',
        label: {
          tr: 'Tam taslağı yazdır ve panoya al',
          en: 'Generate full draft and copy it',
        },
      },
    ],
    prompts: [
      {
        id: 'blog-brief',
        title: { tr: 'Blog brief', en: 'Blog brief' },
        body: {
          tr: `Konu: [...]
Kitle: [seviye]
Ana KW: [...]
Format: blog / LinkedIn / bülten
Uzunluk: [kelime]
Ton: [bilgi verici / ikna edici]
Yapı: giriş → 3 bölüm → sonuç + CTA
Kaynak uydurma; emin değilsen belirt.`,
          en: `Topic: [...]
Audience: [level]
Primary KW: [...]
Format: blog / LinkedIn / newsletter
Length: [words]
Tone: [informative / persuasive]
Structure: intro → 3 sections → conclusion + CTA
Do not invent sources; say when unsure.`,
        },
      },
    ],
    firstResultHint: {
      tr: 'İlk sonuç: kopyalanmış taslak veya net anahat.',
      en: 'First result: a copied draft or clear outline.',
    },
  },

  'workflow-automation': {
    id: 'workflow-automation',
    title: {
      tr: 'Otomasyon sihirbazı',
      en: 'Automation wizard',
    },
    hint: {
      tr: 'Amaç: tetikleyici → eylem şeklinde ilk çalışan akış.',
      en: 'Goal: first working trigger → action flow.',
    },
    steps: [
      {
        id: 'open',
        label: {
          tr: 'Aracı aç ve yeni senaryo / workflow oluştur',
          en: 'Open the tool and create a new scenario / workflow',
        },
      },
      {
        id: 'map',
        label: {
          tr: 'Tetikleyici ve hedef uygulamayı seç',
          en: 'Pick trigger and destination app',
        },
      },
      {
        id: 'connect',
        label: {
          tr: 'Hesapları bağla (OAuth / API)',
          en: 'Connect accounts (OAuth / API)',
        },
      },
      {
        id: 'test',
        label: {
          tr: 'Test çalıştır; yeşil / başarılı sonucu gör',
          en: 'Run a test; see a successful result',
        },
      },
    ],
    prompts: [
      {
        id: 'automation-map',
        title: { tr: 'Otomasyon haritası', en: 'Automation map' },
        body: {
          tr: `Süreç adı: [ör. form → Slack]
Tetikleyici: [yeni form / e-posta / zamanlayıcı]
Veri alanları: [...]
Eylemler: 1) ... 2) ...
Hata durumunda: [bildirim]
Başarı kriteri: testte 1 gerçek kayıt aktarıldı`,
          en: `Process name: [e.g. form → Slack]
Trigger: [new form / email / schedule]
Data fields: [...]
Actions: 1) ... 2) ...
On error: [notify]
Success: one real record moved in a test run`,
        },
      },
    ],
    firstResultHint: {
      tr: 'İlk sonuç: test çalıştırması başarılı olan akış.',
      en: 'First result: a flow with a successful test run.',
    },
  },

  'meeting-notes': {
    id: 'meeting-notes',
    title: {
      tr: 'Toplantı notu sihirbazı',
      en: 'Meeting notes wizard',
    },
    hint: {
      tr: 'Amaç: aksiyon maddeli ilk özet.',
      en: 'Goal: first summary with action items.',
    },
    steps: [
      {
        id: 'open',
        label: {
          tr: 'Aracı aç ve kayıt / yükleme yolunu seç',
          en: 'Open the tool and choose record / upload path',
        },
      },
      {
        id: 'input',
        label: {
          tr: 'Ses/video yükle veya canlı kaydı başlat',
          en: 'Upload audio/video or start live recording',
        },
      },
      {
        id: 'transcript',
        label: {
          tr: 'Transkript + özeti üret',
          en: 'Generate transcript + summary',
        },
      },
      {
        id: 'actions',
        label: {
          tr: 'Aksiyon maddelerini kopyala / paylaş',
          en: 'Copy / share action items',
        },
      },
    ],
    prompts: [
      {
        id: 'summary-format',
        title: { tr: 'Özet formatı', en: 'Summary format' },
        body: {
          tr: `Toplantı: [başlık / tarih]
Katılımcılar: [...]
Özet (5 madde)
Kararlar
Aksiyonlar: sahip | iş | son tarih
Riskler / açık sorular`,
          en: `Meeting: [title / date]
Attendees: [...]
Summary (5 bullets)
Decisions
Actions: owner | task | due date
Risks / open questions`,
        },
      },
    ],
    firstResultHint: {
      tr: 'İlk sonuç: aksiyon maddeli özet metni.',
      en: 'First result: a summary with action items.',
    },
  },

  'logo-design': {
    id: 'logo-design',
    title: {
      tr: 'Logo tasarım sihirbazı',
      en: 'Logo design wizard',
    },
    hint: {
      tr: 'Amaç: en az 1 logo adayı dosyası.',
      en: 'Goal: at least one logo candidate file.',
    },
    steps: [
      {
        id: 'open',
        label: {
          tr: 'Aracı aç ve logo / marka şablonunu seç',
          en: 'Open the tool and pick logo / brand template',
        },
      },
      {
        id: 'brand',
        label: {
          tr: 'Marka adı, sektör ve stil anahtarlarını gir',
          en: 'Enter brand name, industry, and style keywords',
        },
      },
      {
        id: 'variants',
        label: {
          tr: '3–6 varyasyon üret',
          en: 'Generate 3–6 variants',
        },
      },
      {
        id: 'export',
        label: {
          tr: 'En iyiyi seç ve PNG/SVG indir',
          en: 'Pick the best and download PNG/SVG',
        },
      },
    ],
    prompts: [
      {
        id: 'logo-brief',
        title: { tr: 'Logo brief', en: 'Logo brief' },
        body: {
          tr: `Marka: [ad]
Sektör: [...]
Sembol: [somut nesne / soyut]
Stil: [minimal / geometrik / el çizimi]
Renkler: [1–2 ana renk]
Kullanım: app ikonu + web header
İstemediğim: klişe, aşırı detay, okunaksız yazı`,
          en: `Brand: [name]
Industry: [...]
Symbol: [concrete object / abstract]
Style: [minimal / geometric / hand-drawn]
Colors: [1–2 primary]
Use: app icon + web header
Avoid: clichés, excessive detail, unreadable type`,
        },
      },
    ],
    firstResultHint: {
      tr: 'İlk sonuç: indirdiğin logo dosyası.',
      en: 'First result: a downloaded logo file.',
    },
  },
};

/**
 * @param {LocaleText|string|undefined} value
 * @param {string} locale
 */
function pickLocale(value, locale) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const lang = locale === 'en' ? 'en' : 'tr';
  return value[lang] || value.tr || value.en || '';
}

/**
 * @param {JobWizardDef} wizard
 * @param {string} locale
 */
export function localizeJobWizard(wizard, locale = 'tr') {
  const lang = locale === 'en' ? 'en' : 'tr';
  return {
    id: wizard.id,
    title: pickLocale(wizard.title, lang),
    hint: pickLocale(wizard.hint, lang),
    firstResultHint: pickLocale(wizard.firstResultHint, lang),
    steps: (wizard.steps || []).map((step) => ({
      id: step.id,
      label: pickLocale(step.label, lang),
      description: pickLocale(step.description, lang) || null,
    })),
    prompts: (wizard.prompts || []).map((prompt) => ({
      id: prompt.id,
      title: pickLocale(prompt.title, lang),
      body: pickLocale(prompt.body, lang),
    })),
  };
}

/**
 * @param {string[]|string|null|undefined} goals
 * @param {string} [locale]
 */
export function resolveJobWizard(goals = [], locale = 'tr') {
  const list = Array.isArray(goals) ? goals : typeof goals === 'string' && goals ? [goals] : [];

  for (const goal of list) {
    const key = String(goal || '').trim();
    if (key && JOB_WIZARDS[key]) {
      return localizeJobWizard(JOB_WIZARDS[key], locale);
    }
  }
  return localizeJobWizard(DEFAULT_JOB_WIZARD, locale);
}

export function listJobWizardGoalIds() {
  return Object.keys(JOB_WIZARDS);
}
