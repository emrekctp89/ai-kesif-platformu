const FALLBACK_PAGE_SIZE = 12;

const FALLBACK_CATEGORIES = [
  { id: 'cat-productivity', name: 'Verimlilik', slug: 'verimlilik' },
  { id: 'cat-assistant', name: 'AI Asistanları', slug: 'ai-asistanlari' },
  { id: 'cat-automation', name: 'Otomasyon & Ajan', slug: 'otomasyon-ajan' },
  { id: 'cat-visual', name: 'Görsel & Video', slug: 'gorsel-video' },
];

const FALLBACK_TAGS = [
  { id: 1, name: 'İletişim' },
  { id: 2, name: 'Üretkenlik' },
  { id: 3, name: 'Otomasyon' },
  { id: 4, name: 'Yazma' },
  { id: 5, name: 'Görsel Üretim' },
];

function categoryBySlug(slug) {
  return FALLBACK_CATEGORIES.find((category) => category.slug === slug) || FALLBACK_CATEGORIES[0];
}

function tagById(id) {
  return FALLBACK_TAGS.find((tag) => tag.id === id);
}

function buildTool(tool) {
  const category = categoryBySlug(tool.category_slug);
  const tags = (tool.tagIds || []).map(tagById).filter(Boolean);

  return {
    id: tool.id,
    name: tool.name,
    name_en: tool.name_en,
    slug: tool.slug,
    description: tool.description,
    description_en: tool.description_en,
    link: tool.link,
    tier: tool.tier || 'default',
    pricing_model: tool.pricing_model,
    platforms: tool.platforms,
    category_id: category.id,
    category_name: category.name,
    category_slug: category.slug,
    tags,
    is_featured: Boolean(tool.is_featured),
    popularity_score: tool.popularity_score ?? 0,
    favorite_count: tool.favorite_count ?? 0,
    average_rating: tool.average_rating ?? 0,
    total_ratings: tool.total_ratings ?? 0,
    created_at: tool.created_at,
    updated_at: tool.updated_at || tool.created_at,
    technical_details: tool.technical_details || null,
    link_check_status: 'valid',
    link_check_error: null,
    link_check_http_status: 200,
    link_checked_at: tool.updated_at || tool.created_at,
  };
}

const FALLBACK_TOOLS = [
  buildTool({
    id: 'tool-chatgpt',
    name: 'ChatGPT',
    name_en: 'ChatGPT',
    slug: 'chatgpt',
    description:
      'Metin üretimi, araştırma, özetleme ve günlük iş akışları için çok yönlü yapay zeka asistanı.',
    description_en:
      'A versatile AI assistant for writing, research, summarization, and everyday workflows.',
    link: 'https://chat.openai.com/',
    category_slug: 'ai-asistanlari',
    tagIds: [2, 4],
    pricing_model: 'Freemium',
    platforms: ['Web', 'iOS', 'Android'],
    favorite_count: 148,
    popularity_score: 95,
    average_rating: 4.8,
    total_ratings: 320,
    is_featured: true,
    created_at: '2026-01-05T10:00:00.000Z',
    updated_at: '2026-09-01T10:00:00.000Z',
    technical_details: 'GPT tabanlı sohbet, belge özetleme ve çok dilli üretim yetenekleri sunar.',
  }),
  buildTool({
    id: 'tool-slack',
    name: 'Slack',
    name_en: 'Slack',
    slug: 'slack',
    description:
      'Takım iletişimi, kanal bazlı iş birliği ve uygulama entegrasyonları için güçlü çalışma alanı.',
    description_en:
      'A team workspace for messaging, channel-based collaboration, and app integrations.',
    link: 'https://slack.com/',
    category_slug: 'verimlilik',
    tagIds: [1, 2],
    pricing_model: 'Freemium',
    platforms: ['Web', 'iOS', 'Android', 'Windows', 'macOS'],
    favorite_count: 109,
    popularity_score: 88,
    average_rating: 4.6,
    total_ratings: 214,
    is_featured: true,
    created_at: '2026-01-12T10:00:00.000Z',
    updated_at: '2026-09-05T10:00:00.000Z',
    technical_details:
      'Kanallar, huddle görüşmeleri, dosya paylaşımı ve yüzlerce entegrasyon içerir.',
  }),
  buildTool({
    id: 'tool-notion-ai',
    name: 'Notion AI',
    name_en: 'Notion AI',
    slug: 'notion-ai',
    description:
      'Doküman yazımı, toplantı özetleri ve proje notları için çalışma alanına gömülü yapay zeka.',
    description_en:
      'Workspace-native AI for drafting docs, summarizing meetings, and organizing project notes.',
    link: 'https://www.notion.so/product/ai',
    category_slug: 'verimlilik',
    tagIds: [2, 4],
    pricing_model: 'Paid',
    platforms: ['Web', 'Windows', 'macOS', 'iOS', 'Android'],
    favorite_count: 73,
    popularity_score: 72,
    average_rating: 4.4,
    total_ratings: 98,
    created_at: '2026-02-03T10:00:00.000Z',
    updated_at: '2026-08-21T10:00:00.000Z',
  }),
  buildTool({
    id: 'tool-zapier',
    name: 'Zapier',
    name_en: 'Zapier',
    slug: 'zapier',
    description:
      'Kod yazmadan uygulamalar arasında otomasyon kurmak ve tekrarlayan işleri hızlandırmak için entegrasyon platformu.',
    description_en:
      'An integration platform for no-code automation across apps and repetitive workflows.',
    link: 'https://zapier.com/',
    category_slug: 'otomasyon-ajan',
    tagIds: [2, 3],
    pricing_model: 'Freemium',
    platforms: ['Web'],
    favorite_count: 81,
    popularity_score: 78,
    average_rating: 4.5,
    total_ratings: 140,
    is_featured: true,
    created_at: '2026-02-18T10:00:00.000Z',
    updated_at: '2026-08-28T10:00:00.000Z',
  }),
  buildTool({
    id: 'tool-midjourney',
    name: 'Midjourney',
    name_en: 'Midjourney',
    slug: 'midjourney',
    description:
      'Prompt tabanlı yüksek kaliteli görsel üretimi ve konsept geliştirme için popüler üretken görsel aracı.',
    description_en:
      'A popular generative image tool for prompt-based visual creation and concept exploration.',
    link: 'https://www.midjourney.com/',
    category_slug: 'gorsel-video',
    tagIds: [5],
    pricing_model: 'Paid',
    platforms: ['Web'],
    favorite_count: 96,
    popularity_score: 83,
    average_rating: 4.7,
    total_ratings: 188,
    created_at: '2026-03-08T10:00:00.000Z',
    updated_at: '2026-09-03T10:00:00.000Z',
  }),
  buildTool({
    id: 'tool-grammarly',
    name: 'Grammarly',
    name_en: 'Grammarly',
    slug: 'grammarly',
    description:
      'Yazım denetimi, ton önerileri ve yapay zeka destekli düzenleme ile metin kalitesini artırır.',
    description_en:
      'Improves writing quality with grammar checks, tone suggestions, and AI-assisted editing.',
    link: 'https://www.grammarly.com/',
    category_slug: 'ai-asistanlari',
    tagIds: [2, 4],
    pricing_model: 'Freemium',
    platforms: ['Web', 'Windows', 'macOS'],
    favorite_count: 64,
    popularity_score: 68,
    average_rating: 4.3,
    total_ratings: 76,
    created_at: '2026-03-20T10:00:00.000Z',
    updated_at: '2026-08-25T10:00:00.000Z',
  }),
];

export function isPlaywrightCatalogFallbackEnabled() {
  return process.env.PLAYWRIGHT_TEST === '1';
}

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function includesText(haystack, needle) {
  return normalizeText(haystack).includes(normalizeText(needle));
}

export function getFallbackCategories() {
  return [...FALLBACK_CATEGORIES].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

export function getFallbackTags() {
  return [...FALLBACK_TAGS].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

export function getFallbackToolCount() {
  return FALLBACK_TOOLS.length;
}

export function getFallbackToolBySlug(slug, categoryFallback = 'AI Araçları') {
  const tool = FALLBACK_TOOLS.find((item) => item.slug === slug);
  if (!tool) return null;
  return {
    ...tool,
    category_name: tool.category_name || categoryFallback,
  };
}

export function getFallbackFeaturedTools() {
  return FALLBACK_TOOLS.filter((tool) => tool.is_featured).slice(0, 3);
}

export function getFallbackTrendingTools() {
  return [...FALLBACK_TOOLS]
    .sort((a, b) => (b.favorite_count || 0) - (a.favorite_count || 0))
    .slice(0, 5);
}

export function getFallbackToolOfTheDay() {
  return getFallbackToolBySlug('chatgpt');
}

export function getFallbackSimilarTools(currentTool, labels) {
  const sameCategory = FALLBACK_TOOLS.filter(
    (tool) => tool.slug !== currentTool.slug && tool.category_id === currentTool.category_id
  );
  const pool =
    sameCategory.length > 0
      ? sameCategory
      : FALLBACK_TOOLS.filter((tool) => tool.slug !== currentTool.slug);

  return pool.slice(0, 6).map((tool) => ({
    ...tool,
    reason: tool.category_id === currentTool.category_id ? labels.reasonSame : labels.reasonAlt,
  }));
}

export function getFallbackTools({
  page = 0,
  searchParams = {},
  pageSize = FALLBACK_PAGE_SIZE,
} = {}) {
  const searchText = searchParams.search || '';
  const categorySlug = searchParams.category || '';
  const pricingModel = searchParams.pricing || '';
  const tier = searchParams.tier || '';
  const sortBy = searchParams.sort || 'newest';
  const tags = String(searchParams.tags || '')
    .split(',')
    .filter(Boolean)
    .map((value) => Number(value))
    .filter(Number.isFinite);
  const platforms = String(searchParams.platforms || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  let tools = [...FALLBACK_TOOLS];

  if (searchText) {
    tools = tools.filter((tool) => {
      const searchable = [
        tool.name,
        tool.name_en,
        tool.description,
        tool.description_en,
        tool.category_name,
        ...(tool.tags || []).map((tag) => tag.name),
      ].join(' ');
      return includesText(searchable, searchText);
    });
  }

  if (categorySlug) {
    tools = tools.filter((tool) => tool.category_slug === categorySlug);
  }

  if (pricingModel) {
    tools = tools.filter((tool) => tool.pricing_model === pricingModel);
  }

  if (tier) {
    tools = tools.filter((tool) => tool.tier === tier);
  }

  if (tags.length > 0) {
    tools = tools.filter((tool) =>
      tags.every((tagId) => tool.tags.some((tag) => tag.id === tagId))
    );
  }

  if (platforms.length > 0) {
    tools = tools.filter((tool) =>
      platforms.every(
        (platform) => Array.isArray(tool.platforms) && tool.platforms.includes(platform)
      )
    );
  }

  if (sortBy === 'rating') {
    tools.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
  } else if (sortBy === 'popularity') {
    tools.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
  } else {
    tools.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const start = Math.max(0, page) * pageSize;
  return tools.slice(start, start + pageSize);
}
