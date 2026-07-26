/**
 * Job packs — orchestration layer over catalog tools (P4).
 * User says “I want this job done”; pack picks goal combination + plan handoff.
 */

/** @typedef {{ tr: string, en: string }} LocaleText */

/**
 * @typedef {{
 *   id: string,
 *   goals: string[],
 *   title: LocaleText,
 *   summary: LocaleText,
 *   starterQuestion: LocaleText,
 *   workmindPrompt: LocaleText,
 *   stepLabels: LocaleText[],
 *   bridgeGoals?: string[],
 *   proHint?: boolean,
 * }} JobPackDef
 */

/** Packs that support on-platform first_result runner. */
export const RUNNABLE_PACK_IDS = [
  'content-studio',
  'sales-outreach',
  'meeting-to-action',
  'social-launch',
  'pitch-deck',
  'seo-brief',
  'support-kit',
];

export function isRunnablePack(packId) {
  return RUNNABLE_PACK_IDS.includes(String(packId || '').trim());
}

/** @type {JobPackDef[]} */
export const JOB_PACKS = [
  {
    id: 'content-studio',
    goals: ['content-writing', 'image-generation', 'seo-optimization'],
    title: {
      tr: 'İçerik stüdyosu',
      en: 'Content studio pack',
    },
    summary: {
      tr: 'Yazı + görsel + SEO: tek işte üç araç katmanı.',
      en: 'Copy + image + SEO in one coordinated job.',
    },
    starterQuestion: {
      tr: 'Blog yazısı, kapak görseli ve SEO anahtar kelimeleri için araç seti öner.',
      en: 'Recommend a tool set for a blog post, cover image, and SEO keywords.',
    },
    workmindPrompt: {
      tr: 'Bir blog içeriği üretmek istiyorum: konu brief’i, metin taslağı, kapak görseli ve SEO başlık/meta. Adım adım planla ve her adım için araç öner.',
      en: 'I want to produce a blog asset: brief, draft, cover image, and SEO title/meta. Plan steps and suggest tools per step.',
    },
    stepLabels: [
      { tr: 'Brief & anahtar kelime', en: 'Brief & keywords' },
      { tr: 'Metin taslağı', en: 'Copy draft' },
      { tr: 'Kapak görseli', en: 'Cover image' },
      { tr: 'SEO & yayın', en: 'SEO & publish' },
    ],
    bridgeGoals: ['content-writing', 'image-generation'],
    proHint: true,
  },
  {
    id: 'meeting-to-action',
    goals: ['meeting-notes', 'workflow-automation'],
    title: {
      tr: 'Toplantıdan aksiyona',
      en: 'Meeting to action',
    },
    summary: {
      tr: 'Kayıt → özet → görev dağıtımı otomasyonu.',
      en: 'Record → summary → action automation.',
    },
    starterQuestion: {
      tr: 'Toplantı kaydından özet ve aksiyon maddeleri çıkarıp görevlere dağıtmak için araç öner.',
      en: 'Recommend tools to turn meeting recordings into summaries and action items.',
    },
    workmindPrompt: {
      tr: 'Toplantı kaydını metne dök, özet ve aksiyon çıkar, sonra görev listesine veya Slack’e otomatik aktar. Adım adım planla.',
      en: 'Transcribe a meeting, extract summary and actions, then push to tasks or Slack. Plan step by step.',
    },
    stepLabels: [
      { tr: 'Kayıt / yükle', en: 'Record / upload' },
      { tr: 'Özet & aksiyon', en: 'Summary & actions' },
      { tr: 'Otomasyon bağla', en: 'Connect automation' },
      { tr: 'Test çalıştır', en: 'Test run' },
    ],
    bridgeGoals: ['meeting-notes', 'workflow-automation'],
    proHint: true,
  },
  {
    id: 'social-launch',
    goals: ['content-writing', 'image-generation', 'workflow-automation'],
    title: {
      tr: 'Sosyal medya lansmanı',
      en: 'Social launch pack',
    },
    summary: {
      tr: 'Post metni + görsel + zamanlama/otomasyon.',
      en: 'Post copy + visual + scheduling automation.',
    },
    starterQuestion: {
      tr: 'Sosyal medya post metni, görsel ve otomatik paylaşım için araç kombinasyonu öner.',
      en: 'Recommend a combo for social post copy, visuals, and auto-publishing.',
    },
    workmindPrompt: {
      tr: 'Bir haftalık sosyal medya lansmanı: metinler, görseller ve otomatik zamanlama. Planla ve araç öner.',
      en: 'One-week social launch: posts, visuals, and auto-scheduling. Plan and suggest tools.',
    },
    stepLabels: [
      { tr: 'İçerik takvimi', en: 'Content calendar' },
      { tr: 'Post metinleri', en: 'Post copy' },
      { tr: 'Görseller', en: 'Visuals' },
      { tr: 'Zamanlama otomasyonu', en: 'Schedule automation' },
    ],
    bridgeGoals: ['content-writing', 'image-generation', 'workflow-automation'],
    proHint: true,
  },
  {
    id: 'sales-outreach',
    goals: ['email-writing', 'sales-crm'],
    title: {
      tr: 'Satış outreach',
      en: 'Sales outreach pack',
    },
    summary: {
      tr: 'Soğuk e-posta + CRM takip iskeleti.',
      en: 'Cold email + CRM follow-up skeleton.',
    },
    starterQuestion: {
      tr: 'Soğuk e-posta kampanyası yazmak ve CRM’de takip kurmak için araç öner.',
      en: 'Recommend tools for cold email campaigns and CRM follow-up.',
    },
    workmindPrompt: {
      tr: 'B2B soğuk e-posta serisi yaz, konu satırları üret, CRM pipeline’a bağla. Adım adım planla.',
      en: 'Write a B2B cold email sequence, subject lines, and CRM pipeline follow-up. Plan steps.',
    },
    stepLabels: [
      { tr: 'ICP & teklif', en: 'ICP & offer' },
      { tr: 'E-posta serisi', en: 'Email sequence' },
      { tr: 'CRM aşamaları', en: 'CRM stages' },
      { tr: 'Takip kuralları', en: 'Follow-up rules' },
    ],
    bridgeGoals: ['email-writing'],
    proHint: false,
  },
  {
    id: 'pitch-deck',
    goals: ['presentation-creation', 'image-generation'],
    title: {
      tr: 'Sunum / pitch deck',
      en: 'Pitch deck pack',
    },
    summary: {
      tr: 'Mesaj iskeleti + slayt + görsel destek.',
      en: 'Message outline + slides + visual support.',
    },
    starterQuestion: {
      tr: 'Yatırımcı sunumu için slayt aracı ve görsel üretim kombinasyonu öner.',
      en: 'Recommend slide and image tools for an investor pitch deck.',
    },
    workmindPrompt: {
      tr: '8–10 slaytlık pitch deck: mesaj, slayt metinleri, görseller. Planla ve araç öner.',
      en: '8–10 slide pitch deck: messaging, slide copy, visuals. Plan and suggest tools.',
    },
    stepLabels: [
      { tr: 'Mesaj & iskelet', en: 'Message & outline' },
      { tr: 'Slayt taslağı', en: 'Slide draft' },
      { tr: 'Görsel destek', en: 'Visual support' },
      { tr: 'Prova & export', en: 'Rehearse & export' },
    ],
    bridgeGoals: ['presentation-creation', 'image-generation'],
    proHint: false,
  },
  {
    id: 'seo-brief',
    goals: ['seo-optimization', 'content-writing'],
    title: {
      tr: 'SEO brief paketi',
      en: 'SEO brief pack',
    },
    summary: {
      tr: 'Anahtar kelime → iskelet → meta → içerik brief’i (çok adımlı).',
      en: 'Keywords → outline → meta → content brief (multi-step).',
    },
    starterQuestion: {
      tr: 'SEO odaklı blog için anahtar kelime, başlık ve meta üretmek istiyorum; araç seti öner.',
      en: 'Recommend tools to produce SEO keywords, titles, and meta for a blog.',
    },
    workmindPrompt: {
      tr: 'SEO brief üret: anahtar kelimeler, H2 iskeleti, title/meta, içerik brief’i. Adım adım planla ve araç öner.',
      en: 'Produce an SEO brief: keywords, H2 outline, title/meta, content brief. Plan steps and suggest tools.',
    },
    stepLabels: [
      { tr: 'Anahtar kelime', en: 'Keywords' },
      { tr: 'İskelet (H2)', en: 'Outline (H2)' },
      { tr: 'Title & meta', en: 'Title & meta' },
      { tr: 'İçerik brief', en: 'Content brief' },
    ],
    bridgeGoals: ['seo-optimization', 'content-writing'],
    proHint: false,
  },
  {
    id: 'support-kit',
    goals: ['customer-support', 'email-writing'],
    title: {
      tr: 'Destek yanıt kiti',
      en: 'Support reply kit',
    },
    summary: {
      tr: 'Makro + ton rehberi + escalation + FAQ (çok adımlı).',
      en: 'Macro + tone guide + escalation + FAQ (multi-step).',
    },
    starterQuestion: {
      tr: 'Müşteri destek e-postası ve makro şablonları için araç öner.',
      en: 'Recommend tools for customer support email macros and templates.',
    },
    workmindPrompt: {
      tr: 'Destek yanıt kiti: makrolar, ton, escalation, kısa FAQ. Planla ve araç öner.',
      en: 'Support reply kit: macros, tone, escalation, short FAQ. Plan and suggest tools.',
    },
    stepLabels: [
      { tr: 'Makro taslakları', en: 'Macro drafts' },
      { tr: 'Ton rehberi', en: 'Tone guide' },
      { tr: 'Escalation', en: 'Escalation' },
      { tr: 'FAQ', en: 'FAQ' },
    ],
    bridgeGoals: ['customer-support', 'email-writing'],
    proHint: false,
  },
];

function pickLocale(value, locale) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return locale === 'en' ? value.en || value.tr : value.tr || value.en;
}

/**
 * @param {JobPackDef} pack
 * @param {string} [locale]
 */
export function localizeJobPack(pack, locale = 'tr') {
  return {
    id: pack.id,
    goals: [...(pack.goals || [])],
    bridgeGoals: [...(pack.bridgeGoals || [])],
    proHint: Boolean(pack.proHint),
    title: pickLocale(pack.title, locale),
    summary: pickLocale(pack.summary, locale),
    starterQuestion: pickLocale(pack.starterQuestion, locale),
    workmindPrompt: pickLocale(pack.workmindPrompt, locale),
    stepLabels: (pack.stepLabels || []).map((label) => pickLocale(label, locale)),
  };
}

export function listJobPacks(locale = 'tr') {
  return JOB_PACKS.map((pack) => localizeJobPack(pack, locale));
}

export function getJobPackById(id, locale = 'tr') {
  const pack = JOB_PACKS.find((item) => item.id === String(id || '').trim());
  return pack ? localizeJobPack(pack, locale) : null;
}

/**
 * Best pack matching detected goals (score by overlap).
 * @param {string[]} goals
 * @param {string} [locale]
 */
export function matchJobPack(goals = [], locale = 'tr') {
  const set = new Set(
    (Array.isArray(goals) ? goals : []).map((g) => String(g || '').trim()).filter(Boolean)
  );
  if (!set.size) return null;

  let best = null;
  let bestScore = 0;
  for (const pack of JOB_PACKS) {
    const overlap = pack.goals.filter((g) => set.has(g)).length;
    if (overlap === 0) continue;
    const score = overlap + (pack.goals.every((g) => set.has(g)) ? 0.5 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = pack;
    }
  }
  return best && bestScore >= 1 ? localizeJobPack(best, locale) : null;
}

/**
 * Build Workmind handoff URL for a pack.
 */
export function buildPackWorkmindUrl(pack, options = {}) {
  const locale = options.locale === 'en' ? 'en' : 'tr';
  const base = locale === 'en' ? '/en/workmind' : '/workmind';
  const params = new URLSearchParams();
  const goal = String(pack?.workmindPrompt || pack?.starterQuestion || '')
    .trim()
    .slice(0, 800);
  if (goal) params.set('goal', goal);
  params.set('from', 'pack');
  params.set('pack', String(pack?.id || ''));
  params.set('auto', '1');
  if (Array.isArray(pack?.goals) && pack.goals.length) {
    params.set('goals', pack.goals.slice(0, 6).join(','));
  }
  if (options.interactionId) params.set('interactionId', String(options.interactionId));
  if (options.feedbackToken) params.set('feedbackToken', String(options.feedbackToken));
  return `${base}?${params.toString()}`;
}
