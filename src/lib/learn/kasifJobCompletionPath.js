/**
 * Kâşif “iş bitirme” öğrenme yolu — içerik tanımı (TR/EN).
 * UI: /ogren/kasif
 */

/** @typedef {{ tr: string, en: string }} LocaleText */

/**
 * @typedef {{
 *   id: string,
 *   durationMin: number,
 *   title: LocaleText,
 *   summary: LocaleText,
 *   learn: LocaleText[],
 *   practice: {
 *     label: LocaleText,
 *     body: LocaleText,
 *     cta: LocaleText,
 *     href: string,
 *     query?: string,
 *   },
 *   tip?: LocaleText,
 * }} LearnModule
 */

/** @type {LearnModule[]} */
export const KASIF_LEARN_MODULES = [
  {
    id: 'mindset',
    durationMin: 3,
    title: {
      tr: '1. Zihin modeli: tıklama değil, iş bitirme',
      en: '1. Mindset: job done, not just clicks',
    },
    summary: {
      tr: 'Kâşif bir dizin araması değil; “şu işi bitirmek istiyorum” diyerek araç seçip ilk somut çıktıya giden bir yol.',
      en: 'Kâşif is not just directory search — you state a job, pick a tool, and aim for a concrete first result.',
    },
    learn: [
      {
        tr: 'Eski model: araç listesi → tık → abonelik labirenti.',
        en: 'Old model: tool list → click → subscription maze.',
      },
      {
        tr: 'Yeni model: görev → öneri → kurulum → ilk sonuç → iş bitti.',
        en: 'New model: job → recommend → setup → first result → done.',
      },
      {
        tr: 'North Star hunisi: job_stated → tool_recommended → first_result → job_done.',
        en: 'North-star funnel: job_stated → tool_recommended → first_result → job_done.',
      },
    ],
    practice: {
      label: { tr: 'Pratik', en: 'Practice' },
      body: {
        tr: 'Kendi cümlenle bir iş yaz: “Ücretsiz sunum taslağı istiyorum” gibi. Sonraki adımda Kâşif’e soracağız.',
        en: 'Write one job in your words: e.g. “I need a free presentation draft.” You’ll ask Kâşif next.',
      },
      cta: { tr: 'Kâşif’i aç', en: 'Open Kâşif' },
      href: '/kasif',
    },
    tip: {
      tr: 'İpucu: “en iyi AI” yerine somut iş + kısıt (ücretsiz, 10 slayt, B2B) yaz.',
      en: 'Tip: prefer a concrete job + constraints (free, 10 slides, B2B) over “best AI”.',
    },
  },
  {
    id: 'ask',
    durationMin: 5,
    title: {
      tr: '2. Kâşif’e görevi sor',
      en: '2. Ask Kâşif for the job',
    },
    summary: {
      tr: 'Kâşif yalnızca platformdaki onaylı araçlardan sıralar; serbest sohbet modeli değil. Takip sorularında bağlamı taşır.',
      en: 'Kâşif ranks only verified catalog tools — not a free-form chatbot. Follow-ups keep conversation context.',
    },
    learn: [
      {
        tr: 'Açık görev: sunum, görsel, SEO, e-posta, destek…',
        en: 'Clear jobs: presentation, image, SEO, email, support…',
      },
      {
        tr: 'Fiyat daraltması: “bunlardan ücretsiz olanlar?” geçmiş hedefi korur.',
        en: 'Price refinements: “which of these are free?” keep the prior goal.',
      },
      {
        tr: 'Konu değişimi: “Hayır, görsel istiyorum” eski hedefi sıfırlar.',
        en: 'Topic switch: “No, I want images” clears the old goal.',
      },
      {
        tr: 'Geçmişsiz “bunlardan hangileri?” soft-landing ile görevi yeniden ister.',
        en: 'Context-less “which of those?” soft-lands and asks you to restate the job.',
      },
    ],
    practice: {
      label: { tr: 'Deneme sorusu', en: 'Try this prompt' },
      body: {
        tr: 'Aşağıdaki soruyu Kâşif’e gönder; ardından “Peki ücretsiz olanlar hangileri?” diye sor.',
        en: 'Send the prompt below, then follow with “Which of these are free?”',
      },
      cta: { tr: 'Soruyla aç', en: 'Open with prompt' },
      href: '/kasif',
      query: 'Ücretsiz sunum hazırlamak için hangi araçları kullanabilirim?',
    },
    tip: {
      tr: 'İngilizce de çalışır: “Recommend a free presentation tool”.',
      en: 'Turkish works too: “Ücretsiz sunum aracı öner”.',
    },
  },
  {
    id: 'wizard',
    durationMin: 5,
    title: {
      tr: '3. Sihirbaz: checklist + ilk çıktı şablonu',
      en: '3. Wizard: checklist + first-output template',
    },
    summary: {
      tr: '22 hedef için goal sihirbazı var: adımlar, kopyalanabilir prompt ve “ilk sonuç” tanımı. Listede kalma — üret.',
      en: '22 goals have wizards: steps, copyable prompts, and a first-result definition. Don’t stop at the list — produce.',
    },
    learn: [
      {
        tr: 'Öneri sonrası JobFunnel paneli checklist gösterir.',
        en: 'After a recommendation, JobFunnel shows a checklist.',
      },
      {
        tr: 'Prompt şablonunu kopyala → araca yapıştır → ilk çıktıyı al.',
        en: 'Copy the prompt template → paste into the tool → get a first output.',
      },
      {
        tr: 'Self-report: “kuruluma başladım / ilk sonuç / iş bitti”.',
        en: 'Self-report: setup started / first result / job done.',
      },
    ],
    practice: {
      label: { tr: 'Pratik', en: 'Practice' },
      body: {
        tr: 'Bir hedef sor (ör. e-posta yazımı). Checklist’i aç, şablonu kopyala, en az bir adımı işaretle.',
        en: 'Ask for a job (e.g. email writing). Open the checklist, copy a template, mark at least one step.',
      },
      cta: { tr: 'E-posta görevi sor', en: 'Ask email job' },
      href: '/kasif',
      query: 'Soğuk e-posta yazmak için araç öner',
    },
  },
  {
    id: 'workmind',
    durationMin: 6,
    title: {
      tr: '4. Workmind görev oturumu',
      en: '4. Workmind job session',
    },
    summary: {
      tr: 'Kâşif → Workmind handoff ile aynı görevi adım adım plana dök. Her adımda araç önerisi ve ilerleme hunisi güncellenir.',
      en: 'Hand off from Kâşif to Workmind to plan the same job step by step. Tool picks and funnel progress update per step.',
    },
    learn: [
      {
        tr: '“Workmind’de adım adım planla” bağlantısı oturumu başlatır.',
        en: '“Plan step by step in Workmind” starts a session.',
      },
      {
        tr: 'Adım tamamla + araç seç → funnel stage ilerler.',
        en: 'Complete a step + pick a tool → funnel stages advance.',
      },
      {
        tr: 'Gemini kapalıysa yerel Kâşif planlayıcı yedek üretir.',
        en: 'If Gemini is off, the local Kâşif planner still builds a workflow.',
      },
    ],
    practice: {
      label: { tr: 'Pratik', en: 'Practice' },
      body: {
        tr: 'Kâşif’te bir paket veya görev seçip Workmind’e geç. En az 1 adımı tamamla.',
        en: 'Pick a job or pack in Kâşif, open Workmind, complete at least one step.',
      },
      cta: { tr: 'Workmind’i aç', en: 'Open Workmind' },
      href: '/workmind',
    },
  },
  {
    id: 'packs',
    durationMin: 8,
    title: {
      tr: '5. İş paketleri ve platform runner’lar',
      en: '5. Job packs and on-platform runners',
    },
    summary: {
      tr: '10 iş paketi: brief yaz → platformda ilk çıktı üret (runner) → first_result kaydı. Bazı paketler Pro kota ile.',
      en: '10 job packs: write a brief → generate a first output on-platform (runner) → first_result is recorded. Some packs use Pro quota.',
    },
    learn: [
      {
        tr: 'Paketler: içerik, satış, toplantı, sosyal, pitch, SEO, destek, kod, hukuk, araştırma.',
        en: 'Packs: content, sales, meeting, social, pitch, SEO, support, code, legal, research.',
      },
      {
        tr: 'SEO / destek / kod / hukuk / araştırma paketleri çok adımlı (steps) çıktı üretir.',
        en: 'SEO, support, code, legal, and research packs produce multi-step (steps) artifacts.',
      },
      {
        tr: 'LLM zinciri: Partner API → Gemini → yerel şablon.',
        en: 'LLM chain: Partner API → Gemini → local template.',
      },
      {
        tr: 'Runner sonrası: katalog aracı seç → hesap bağla (araç sitesinde) → Workmind.',
        en: 'After a run: pick a catalog tool → sign in on the tool site → continue in Workmind.',
      },
    ],
    practice: {
      label: { tr: 'Pratik', en: 'Practice' },
      body: {
        tr: 'SEO brief runner’ını deep link ile aç, kısa brief yaz, çalıştır. Adımları oku ve kopyala.',
        en: 'Open the SEO brief runner via deep link, write a short brief, run it. Read and copy the steps.',
      },
      cta: { tr: 'SEO brief runner’ı aç', en: 'Open SEO brief runner' },
      href: '/kasif',
      pack: 'seo-brief',
      runner: true,
    },
    tip: {
      tr: 'Pro paketlerde ücretsiz deneme kotası vardır; giriş gerekebilir.',
      en: 'Pro packs may need sign-in and use a free trial quota.',
    },
  },
  {
    id: 'bridge',
    durationMin: 5,
    title: {
      tr: '6. Sonuç köprüsü: ilk çıktıyı kanıtla',
      en: '6. Result bridge: prove first output',
    },
    summary: {
      tr: 'Aracın ürettiği metni/URL’yi yapıştır → first_result stage. OAuth’sız kanıt; e-posta, içerik, sunum, görsel, otomasyon, toplantı.',
      en: 'Paste the tool’s text/URL → first_result stage. Proof without OAuth: email, content, slides, image, automation, meeting.',
    },
    learn: [
      {
        tr: 'Yapıştırma paneli JobFunnel içinde görünür.',
        en: 'The paste panel lives inside JobFunnel.',
      },
      {
        tr: 'Çok kısa veya anlamsız metin reddedilir; gerçek taslak yapıştır.',
        en: 'Too-short or empty paste is rejected; paste a real draft.',
      },
      {
        tr: 'İstersen aynı anda “iş bitti” işaretleyebilirsin.',
        en: 'You can optionally mark job_done in the same action.',
      },
    ],
    practice: {
      label: { tr: 'Pratik', en: 'Practice' },
      body: {
        tr: 'Bir e-posta veya blog taslağını (en az birkaç cümle) köprüye yapıştır ve kaydı doğrula.',
        en: 'Paste an email or blog draft (a few sentences) into the bridge and confirm it saves.',
      },
      cta: { tr: 'Kâşif’te dene', en: 'Try on Kâşif' },
      href: '/kasif',
      query: 'Blog yazısı için araç öner',
    },
  },
  {
    id: 'add-tool',
    durationMin: 4,
    title: {
      tr: '7. Kataloğa araç öner (admin onayı)',
      en: '7. Suggest a catalog tool (admin gate)',
    },
    summary: {
      tr: '“Bu aracı ekle https://…” ile resmî ürün URL’si scrape edilir; kayıt onaysız kuyruğa düşer. Otomatik yayın yok.',
      en: '“Add this tool https://…” scrapes an official product URL into an unapproved queue. No auto-publish.',
    },
    learn: [
      {
        tr: 'Yalnızca resmî ürün siteleri; dizin/aggregator engelli.',
        en: 'Official product sites only; directories/aggregators blocked.',
      },
      {
        tr: 'Dedupe: isim / link / host çakışması yeni kayıt açmaz.',
        en: 'Dedupe: name/link/host matches skip new inserts.',
      },
      {
        tr: 'Admin bekleyen araçlardan onaylayınca Kâşif önerebilir.',
        en: 'After admin approval, Kâşif can recommend the tool.',
      },
    ],
    practice: {
      label: { tr: 'Örnek cümle', en: 'Example phrase' },
      body: {
        tr: 'Kâşif’e yaz: Bu aracı ekle https://ornek-urun.com — (gerçek bir ürün sitesi kullan). URL yoksa resmî URL ister.',
        en: 'Tell Kâşif: Add this tool https://example-product.com — (use a real product site). Without a URL it asks for one.',
      },
      cta: { tr: 'Add-tool denemesi', en: 'Try add-tool' },
      href: '/kasif',
      query: 'Bu aracı ekle ',
    },
    tip: {
      tr: 'Rate limit: saatlik birkaç istek. Spam için değil, kaliteli aday için.',
      en: 'Rate limited: a few requests per hour. For quality candidates, not spam.',
    },
  },
  {
    id: 'capstone',
    durationMin: 10,
    title: {
      tr: '8. Bitirme görevi (capstone)',
      en: '8. Capstone challenge',
    },
    summary: {
      tr: 'Uçtan uca bir iş bitir: sor → seç → runner veya araç → köprü → (isteğe) Workmind.',
      en: 'Finish one job end-to-end: ask → pick → runner or tool → bridge → (optional) Workmind.',
    },
    learn: [
      {
        tr: 'Senaryo A: SEO brief runner → adımları kopyala → first_result.',
        en: 'Scenario A: SEO brief runner → copy steps → first_result.',
      },
      {
        tr: 'Senaryo B: Satış e-postası sor → sihirbaz şablonu → yapıştırma köprüsü.',
        en: 'Scenario B: Ask sales email → wizard template → paste bridge.',
      },
      {
        tr: 'Senaryo C: Sosyal lansman paketi → Workmind planı → 1 adım tamamla.',
        en: 'Scenario C: Social launch pack → Workmind plan → complete 1 step.',
      },
    ],
    practice: {
      label: { tr: 'Capstone', en: 'Capstone' },
      body: {
        tr: 'Üç senaryodan birini seç ve 15 dakikada first_result’a ulaş. Bu sayfadaki tüm adımları tamamlandı işaretle.',
        en: 'Pick one scenario and reach first_result in ~15 minutes. Mark every module complete on this page.',
      },
      cta: { tr: 'Araştırma brief runner ile bitir', en: 'Finish with research brief runner' },
      href: '/kasif',
      pack: 'research-brief',
      runner: true,
      query: 'Küçük ekip için AI araç seçimi blog yazısı ve SEO brief istiyorum',
    },
  },
];

export const KASIF_LEARN_OUTCOMES = [
  {
    tr: 'Görevi net yazıp Kâşif’ten kaynaklı öneri almak',
    en: 'State a job and get catalog-grounded recommendations',
  },
  {
    tr: 'Sihirbaz / paket / runner ile ilk çıktı üretmek',
    en: 'Produce a first output via wizard, pack, or runner',
  },
  {
    tr: 'first_result’ı köprü veya runner ile kaydetmek',
    en: 'Record first_result via paste bridge or runner',
  },
  {
    tr: 'Katalog adayı önermeyi (admin gate) bilmek',
    en: 'Know how to suggest catalog candidates (admin gate)',
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
