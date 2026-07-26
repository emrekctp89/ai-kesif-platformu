/**
 * Soft-landing copy variants + starter chip catalog for conversion experiments.
 * Variant is sticky per client via localStorage; stamped on intent for analytics.
 */

/** @typedef {{ id: string, label: { tr: string, en: string }, question: { tr: string, en: string } }} SoftLandingStarter */

/** @type {SoftLandingStarter[]} */
export const SOFT_LANDING_STARTERS = [
  {
    id: 'presentation',
    label: { tr: 'Ücretsiz sunum', en: 'Free presentation' },
    question: {
      tr: 'Ücretsiz bir sunum hazırlamak için hangi araçları kullanabilirim?',
      en: 'Which free tools can I use to make a presentation?',
    },
  },
  {
    id: 'image',
    label: { tr: 'Görsel üret', en: 'Generate image' },
    question: {
      tr: 'Sosyal medya için gerçekçi görseller üreten araçları karşılaştır.',
      en: 'Compare tools that generate realistic social media images.',
    },
  },
  {
    id: 'seo',
    label: { tr: 'SEO brief', en: 'SEO brief' },
    question: {
      tr: 'SEO odaklı blog için anahtar kelime ve meta üreten araç öner.',
      en: 'Recommend tools for SEO keywords and meta for a blog post.',
    },
  },
  {
    id: 'email',
    label: { tr: 'Soğuk e-posta', en: 'Cold email' },
    question: {
      tr: 'Soğuk e-posta kampanyası yazmak için araç öner.',
      en: 'Recommend tools for writing a cold email campaign.',
    },
  },
  {
    id: 'code',
    label: { tr: 'Kod asistanı', en: 'Coding help' },
    question: {
      tr: 'Kodlama öğrenirken bana yardımcı olacak ücretsiz AI araçları öner.',
      en: 'Recommend free AI coding assistants for learning to code.',
    },
  },
  {
    id: 'meeting',
    label: { tr: 'Toplantı özeti', en: 'Meeting notes' },
    question: {
      tr: 'Toplantı kaydından özet ve aksiyon maddeleri çıkaran araç öner.',
      en: 'Recommend tools to turn meeting recordings into summaries and action items.',
    },
  },
  {
    id: 'support',
    label: { tr: 'Destek yanıtı', en: 'Support reply' },
    question: {
      tr: 'Müşteri destek e-postası makro şablonları için araç öner.',
      en: 'Recommend tools for customer support email macros.',
    },
  },
  {
    id: 'chatbot',
    label: { tr: 'Sohbet asistanı', en: 'Chat assistant' },
    question: {
      tr: 'Gündelik sorular için sohbet asistanı öner.',
      en: 'Recommend a chat assistant for everyday questions.',
    },
  },
];

export const SOFT_LANDING_VARIANTS = ['A', 'B'];

/**
 * Env-driven soft-landing default (feature flag).
 *
 * - KASIF_SOFT_LANDING_FORCE_VARIANT / NEXT_PUBLIC_… = A|B → always use for new assign
 * - KASIF_SOFT_LANDING_DEFAULT_VARIANT / NEXT_PUBLIC_… = A|B|ab
 *   - A or B: pin new users to that variant (after admin declares a winner)
 *   - ab (default): 50/50 hash split
 *
 * @param {{ force?: string, defaultVariant?: string }|null} [envOverride] test injection
 * @returns {{ force: 'A'|'B'|null, defaultVariant: 'A'|'B'|'ab', mode: string }}
 */
export function getSoftLandingVariantConfig(envOverride = null) {
  const read = (key) => {
    if (envOverride && Object.prototype.hasOwnProperty.call(envOverride, key)) {
      return envOverride[key];
    }
    if (typeof process === 'undefined' || !process.env) return '';
    return process.env[key] || process.env[`NEXT_PUBLIC_${key}`] || '';
  };

  const forceRaw = String(envOverride?.force ?? read('KASIF_SOFT_LANDING_FORCE_VARIANT'))
    .trim()
    .toUpperCase();
  const force = forceRaw === 'A' || forceRaw === 'B' ? forceRaw : null;

  const defRaw = String(envOverride?.defaultVariant ?? read('KASIF_SOFT_LANDING_DEFAULT_VARIANT'))
    .trim()
    .toUpperCase();
  const defaultVariant =
    defRaw === 'A' || defRaw === 'B' ? defRaw : defRaw === 'AB' || defRaw === '' ? 'ab' : 'ab';

  return {
    force,
    defaultVariant: force || defaultVariant,
    mode: force ? `force_${force}` : defaultVariant === 'ab' ? 'ab_split' : `pin_${defaultVariant}`,
  };
}

/**
 * Assign variant for a new user/session.
 * @param {string} [seed]
 * @param {{ force?: string, defaultVariant?: string }|null} [envOverride]
 * @returns {'A'|'B'}
 */
export function pickSoftLandingVariant(seed, envOverride = null) {
  const config = getSoftLandingVariantConfig(envOverride);
  if (config.force === 'A' || config.force === 'B') return config.force;
  if (config.defaultVariant === 'A' || config.defaultVariant === 'B') {
    return config.defaultVariant;
  }

  const raw = String(seed || '');
  if (!raw) {
    return Date.now() % 2 === 0 ? 'A' : 'B';
  }
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? 'A' : 'B';
}

/**
 * Resolve variant for this request: explicit client value wins, else env/default/seed.
 * @param {string|null|undefined} clientVariant
 * @param {string} [seed]
 * @param {{ force?: string, defaultVariant?: string }|null} [envOverride]
 * @returns {'A'|'B'}
 */
export function resolveSoftLandingVariant(clientVariant, seed, envOverride = null) {
  const config = getSoftLandingVariantConfig(envOverride);
  // Force always wins (ops kill-switch / post-experiment pin).
  if (config.force === 'A' || config.force === 'B') return config.force;

  const client = String(clientVariant || '')
    .trim()
    .toUpperCase();
  if (client === 'A' || client === 'B') return client;

  return pickSoftLandingVariant(seed, envOverride);
}

/**
 * @param {string} [locale]
 * @param {{ limit?: number, preferIds?: string[] }} [options]
 */
export function listSoftLandingStarters(locale = 'tr', options = {}) {
  const lang = locale === 'en' ? 'en' : 'tr';
  const limit = Math.min(Math.max(Number(options.limit) || 6, 2), SOFT_LANDING_STARTERS.length);
  const prefer = Array.isArray(options.preferIds) ? options.preferIds : [];
  const ordered = [
    ...SOFT_LANDING_STARTERS.filter((s) => prefer.includes(s.id)),
    ...SOFT_LANDING_STARTERS.filter((s) => !prefer.includes(s.id)),
  ];
  return ordered.slice(0, limit).map((s) => ({
    id: s.id,
    label: s.label[lang] || s.label.tr,
    question: s.question[lang] || s.question.tr,
  }));
}

/**
 * Price-aware soft-landing body copy (A/B).
 * @param {{ wantsFree?: boolean, wantsPaid?: boolean }} intent
 * @param {string} [locale]
 * @param {'A'|'B'} [variant]
 */
export function buildSoftLandingAnswer(intent = {}, locale = 'tr', variant = 'A') {
  const lang = locale === 'en' ? 'en' : 'tr';
  const priceNote =
    lang === 'en'
      ? intent.wantsFree
        ? ' Once the job is clear, I can prefer free/freemium tools.'
        : intent.wantsPaid
          ? ' Once the job is clear, I can prefer paid tools.'
          : ''
      : intent.wantsFree
        ? ' Görevi netleştirince ücretsiz/freemium tercihine göre sıralayabilirim.'
        : intent.wantsPaid
          ? ' Görevi netleştirince ücretli tercihine göre sıralayabilirim.'
          : '';

  if (lang === 'en') {
    if (variant === 'B') {
      return `I can’t filter “those” tools — this message has no prior list.${priceNote}

**Do this next (15 seconds):**
1. Tap a starter chip below, or
2. Write one concrete job: “I need [outcome] with [constraint]”

Examples: free pitch deck · SEO keywords for a blog · cold email sequence`;
    }
    return `I don’t have the previous recommendation list in this message, so I can’t filter “those” tools yet.${priceNote}

Please restate the task in one sentence, for example:
• Free presentation tools
• SEO analysis tools
• Cold email writing assistants

Then I can rank verified platform tools for you.`;
  }

  if (variant === 'B') {
    return `“Bunlardan hangileri?” için önceki liste bu mesajda yok.${priceNote}

**15 saniyede netleştir:**
1. Aşağıdaki örnek görevlerden birine dokun, veya
2. Tek cümle yaz: “[sonuç] istiyorum, [kısıt]”

Örnek: ücretsiz sunum · SEO blog brief · soğuk e-posta serisi`;
  }

  return `Bu mesajda önceki öneri listesi yok; bu yüzden “bunlardan hangileri?” sorusunu güvenle daraltamıyorum.${priceNote}

Görevi tek cümlede yeniden yazman yeterli. Örnek:
• Ücretsiz sunum aracı öner
• SEO analizi araçları
• Soğuk e-posta yazma asistanı

Böylece platformdaki onaylı araçları senin için sıralayabilirim.`;
}

export const SOFT_LANDING_STORAGE_KEY = 'kasif-soft-landing-variant-v1';
