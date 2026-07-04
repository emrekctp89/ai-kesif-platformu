import { getBlockedToolHost } from '@/lib/toolLinkPolicy';

const ENGLISH_HINT_REGEX =
  /\b(the|and|with|for|that|this|from|your|using|create|allows|users|tool|platform|powered)\b/gi;
const TURKISH_HINT_REGEX = /[çğıöşü]|\b(ve|ile|için|bir|bu|yapay|zeka|araç|kullanıcı)\b/gi;

const TRACKING_QUERY_PARAMS = new Set([
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
  'utm_campaign',
  'utm_content',
  'utm_id',
  'utm_medium',
  'utm_source',
  'utm_term',
]);

export function normalizeToolLink(link) {
  try {
    const url = new URL(link);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return String(link || '')
      .trim()
      .toLowerCase();
  }
}

export function isLikelyEnglishDescription(description) {
  const text = String(description || '');
  const englishMatches = text.match(ENGLISH_HINT_REGEX) || [];
  const turkishMatches = text.match(TURKISH_HINT_REGEX) || [];

  return englishMatches.length >= 3 && englishMatches.length > turkishMatches.length * 1.5;
}

export function getToolQualityIssues(
  tool,
  duplicateNames,
  duplicateLinks,
  { iconFetchIssue = false } = {}
) {
  const issues = [];
  const description = String(tool.description || '').trim();
  const normalizedName = String(tool.name || '')
    .trim()
    .toLocaleLowerCase('tr-TR');
  const normalizedLink = normalizeToolLink(tool.link);
  const normalizedUrl = normalizeToolUrl(tool.link);
  const blockedHost = getBlockedToolHost(tool.link);

  if (description.length < 80) issues.push({ key: 'short', label: 'Kısa açıklama' });
  if (isLikelyEnglishDescription(description)) {
    issues.push({ key: 'english', label: 'İngilizce açıklama' });
  }
  if (blockedHost) {
    issues.push({ key: 'source', label: `Dizin linki (${blockedHost})` });
  }
  if (!normalizedUrl) {
    issues.push({ key: 'icon', label: 'İkon alınamıyor (bağlantı hatalı)' });
  } else if (iconFetchIssue) {
    issues.push({ key: 'icon', label: 'İkon alınamıyor (erişim hatası)' });
  }
  if (!tool.pricing_model) issues.push({ key: 'metadata', label: 'Fiyat bilgisi yok' });
  if (!Array.isArray(tool.platforms) || tool.platforms.length === 0) {
    issues.push({ key: 'metadata', label: 'Platform bilgisi yok' });
  }
  if ((duplicateNames.get(normalizedName) || 0) > 1) {
    issues.push({ key: 'duplicate', label: 'Tekrarlanan ad' });
  }
  if (normalizedLink && (duplicateLinks.get(normalizedLink) || 0) > 1) {
    issues.push({ key: 'duplicate', label: 'Tekrarlanan bağlantı' });
  }

  return issues;
}

export function normalizeTextField(value, { preserveNewLines = false } = {}) {
  const text = String(value || '').trim();
  if (!text) return '';

  if (!preserveNewLines) {
    return text.replace(/\s+/g, ' ');
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeToolUrl(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) return null;

  const hasProtocol = /^https?:\/\//i.test(rawValue);
  const candidate = hasProtocol ? rawValue : `https://${rawValue}`;

  let parsedUrl;
  try {
    parsedUrl = new URL(candidate);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) return null;

  parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
  if (parsedUrl.pathname !== '/') {
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/, '');
  }
  parsedUrl.hash = '';

  const keys = [...parsedUrl.searchParams.keys()];
  for (const key of keys) {
    const normalizedKey = key.toLowerCase();
    if (TRACKING_QUERY_PARAMS.has(normalizedKey) || normalizedKey.startsWith('utm_')) {
      parsedUrl.searchParams.delete(key);
    }
  }

  return parsedUrl.toString();
}

export function inferPlatformsFromLink(link) {
  if (!link) return null;
  return ['Web'];
}

export function inferPricingModel(description, link = '') {
  const text = `${String(description || '')} ${String(link || '')}`.toLocaleLowerCase('tr-TR');

  if (text.includes('freemium')) return 'Freemium';
  if (/(one[- ]time|tek sefer|lifetime|ömür boyu)/i.test(text)) {
    return 'Tek Seferlik Ödeme';
  }
  if (/(subscription|abonelik|monthly|yearly|aylık|yıllık)/i.test(text)) {
    return 'Abonelik';
  }
  if (/(ücretsiz|free)\b/i.test(text)) {
    if (/(pro|premium|paid|ücretli)/i.test(text)) return 'Freemium';
    return 'Ücretsiz';
  }

  return null;
}
