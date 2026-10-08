import { resolvePrimarySlug } from './categoryTaxonomy';

export const ENGLISH_CATEGORIES = {
  'gorsel-uretim': {
    name: 'Image Generation',
    description: 'Create images, illustrations and visual concepts from text.',
  },
  'video-uretim': {
    name: 'Video & Animation',
    description: 'Generate and edit videos, animations and motion graphics.',
  },
  'ses-muzik': {
    name: 'Audio & Music',
    description: 'Create music, clone voices and produce podcasts and audio.',
  },
  '3d-modelleme': {
    name: '3D & Avatars',
    description: 'Build 3D models, digital avatars and virtual scenes.',
  },
  tasarim: {
    name: 'Design',
    description: 'Explore AI tools for UI/UX, logos and graphic design.',
  },
  'metin-yazarligi': {
    name: 'Writing & Content',
    description: 'Write and edit articles, copy, scripts and translations.',
  },
  pazarlama: {
    name: 'Marketing & SEO',
    description: 'Optimize search rankings, advertising and marketing campaigns.',
  },
  'kod-yazilim': {
    name: 'Coding & Development',
    description: 'Find coding assistants, testing tools and API solutions.',
  },
  'no-code-low-code': {
    name: 'No-Code / Low-Code',
    description: 'Build applications, forms and workflows with less code.',
  },
  'veri-analiz': {
    name: 'Data & Analytics',
    description: 'Analyze data with AI, business intelligence and forecasting tools.',
  },
  'otomasyon-ajan': {
    name: 'Automation & Agents',
    description: 'Automate workflows and processes with AI agents.',
  },
  chatbotlar: {
    name: 'Chatbots & Assistants',
    description: 'Discover chatbots, personal assistants and multimodal AI interfaces.',
  },
  uretkenlik: {
    name: 'Productivity',
    description: 'Manage notes, meetings, tasks and everyday work.',
  },
  'satis-crm': {
    name: 'Sales & CRM',
    description: 'Manage leads, sales pipelines and customer relationships.',
  },
  'e-ticaret': {
    name: 'E-Commerce',
    description: 'Improve product listings, online stores and shopping experiences.',
  },
  'musteri-destek': {
    name: 'Customer Support',
    description: 'Automate support tickets, help desks and live chat.',
  },
  'is-dunyasi': {
    name: 'Business & Finance',
    description: 'Explore AI for finance, accounting, operations and planning.',
  },
  'insan-kaynaklari': {
    name: 'Human Resources',
    description: 'Improve hiring, resume screening and HR workflows.',
  },
  'hukuk-uyumluluk': {
    name: 'Legal & Compliance',
    description: 'Review contracts, research legal topics and manage compliance.',
  },
  'guvenlik-siber': {
    name: 'Security & Cybersecurity',
    description: 'Detect threats and fraud with AI security tools.',
  },
  egitim: {
    name: 'Education',
    description: 'Learn, prepare for exams and practice languages with AI.',
  },
  'arastirma-akademik': {
    name: 'Research & Academia',
    description: 'Find academic papers and tools for scientific research.',
  },
  'saglik-yasam': {
    name: 'Health & Lifestyle',
    description: 'Explore tools for health, fitness, nutrition and wellbeing.',
  },
  'oyun-eglence': {
    name: 'Gaming & Entertainment',
    description: 'Create game assets and explore AI entertainment tools.',
  },
  diger: {
    name: 'Other',
    description: 'Discover innovative AI tools across emerging categories.',
  },
};

export function getEnglishCategory(slugOrName) {
  if (!slugOrName) return null;
  const slug = resolvePrimarySlug(slugOrName);
  if (slug === 'diger' && !['diger', 'Diğer', 'Other'].includes(slugOrName)) return null;
  return ENGLISH_CATEGORIES[slug] || null;
}

export function getCategoryLabel(category, locale = 'tr') {
  const isTool = category && Object.prototype.hasOwnProperty.call(category, 'category_name');
  const name = (isTool ? category.category_name : category?.name) || '';
  if (locale !== 'en') return name;
  const translated =
    getEnglishCategory(isTool ? category.category_slug : category?.slug) ||
    getEnglishCategory(name);
  return (isTool ? category.category_name_en : category?.name_en) || translated?.name || name;
}
