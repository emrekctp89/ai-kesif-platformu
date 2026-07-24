/**
 * HTML / markdown sayfa içeriğinden araç adayı alanları çıkarır.
 */

import * as cheerio from 'cheerio';
import { normalizeTextField, normalizeToolUrl, inferPricingModel } from '@/lib/toolQuality';

function cleanText(value, max = 800) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const cleaned = cleanText(value, 500);
    if (cleaned) return cleaned;
  }
  return '';
}

function metaContent($, ...selectors) {
  for (const selector of selectors) {
    const value = $(selector).attr('content');
    if (value && cleanText(value)) return cleanText(value, 500);
  }
  return '';
}

/**
 * HTML string → ham alanlar
 */
export function parseHtmlDocument(html, pageUrl) {
  const $ = cheerio.load(String(html || ''));
  $('script, style, noscript, svg').remove();

  const canonical =
    $('link[rel="canonical"]').attr('href') || metaContent($, 'meta[property="og:url"]') || pageUrl;

  let finalUrl = pageUrl;
  try {
    finalUrl = new URL(canonical, pageUrl).toString();
  } catch {
    finalUrl = pageUrl;
  }

  const ogTitle = metaContent($, 'meta[property="og:title"]', 'meta[name="twitter:title"]');
  const docTitle = cleanText($('title').first().text(), 200);
  const h1 = cleanText($('h1').first().text(), 200);
  const name = firstNonEmpty(ogTitle, h1, docTitle)
    .replace(/\s*[|\-–—].*$/, '')
    .trim();

  const ogDescription = metaContent(
    $,
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]'
  );

  const paragraphBits = $('main p, article p, p')
    .toArray()
    .map((el) => cleanText($(el).text(), 280))
    .filter((text) => text.length >= 40)
    .slice(0, 4);

  const description = firstNonEmpty(ogDescription, paragraphBits.join(' '));

  const featureCandidates = $('li')
    .toArray()
    .map((el) => cleanText($(el).text(), 120))
    .filter((text) => text.length >= 12 && text.length <= 120)
    .slice(0, 8);

  const siteName = metaContent($, 'meta[property="og:site_name"]');

  return {
    name: name || siteName || '',
    description,
    link: normalizeToolUrl(finalUrl) || finalUrl,
    siteName: siteName || '',
    features: featureCandidates,
    meta: {
      ogTitle,
      ogDescription,
      docTitle,
      h1,
      canonical: finalUrl,
    },
  };
}

/**
 * Jina / markdown benzeri düz metin → ham alanlar
 */
export function parseMarkdownDocument(markdown, pageUrl) {
  const text = String(markdown || '').replace(/\r/g, '');
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let name = '';
  const bodyLines = [];
  for (const line of lines) {
    if (!name && /^#\s+/.test(line)) {
      name = cleanText(line.replace(/^#+\s+/, ''), 120);
      continue;
    }
    if (!name && line.length >= 2 && line.length <= 80 && !/[.:]$/.test(line)) {
      name = cleanText(line, 120);
      continue;
    }
    if (line.startsWith('Title:')) {
      name = name || cleanText(line.slice(6), 120);
      continue;
    }
    if (line.startsWith('URL Source:') || line.startsWith('Markdown Content:')) continue;
    if (/^https?:\/\//i.test(line)) continue;
    bodyLines.push(line.replace(/^[-*#>]+\s*/, ''));
  }

  const description = cleanText(bodyLines.join(' '), 700);
  const features = bodyLines.filter((line) => line.length >= 12 && line.length <= 120).slice(0, 8);

  return {
    name: name || '',
    description,
    link: normalizeToolUrl(pageUrl) || pageUrl,
    siteName: '',
    features,
    meta: {
      source: 'markdown',
      lineCount: lines.length,
    },
  };
}

/**
 * Ham parse çıktısını discovery aday şemasına yaklaştırır.
 */
export function toToolCandidate(parsed, { provider, sourceUrl }) {
  const link = normalizeToolUrl(parsed.link || sourceUrl) || sourceUrl;
  let name = normalizeTextField(parsed.name || '');
  if (name.length < 2) {
    try {
      name = new URL(link).hostname.replace(/^www\./, '');
    } catch {
      name = 'Bilinmeyen araç';
    }
  }

  let description = normalizeTextField(parsed.description || '');
  if (description.length < 60) {
    const pad = [
      `${name}, resmi ürün sitesinden otomatik derlenen bir AI aracıdır.`,
      'Özellikleri ve fiyat modeli siteden doğrulanmalıdır.',
      parsed.siteName ? `Site: ${parsed.siteName}.` : '',
    ]
      .filter(Boolean)
      .join(' ');
    description = normalizeTextField(`${description} ${pad}`.trim());
  }
  description = description.slice(0, 600);

  const features = (parsed.features || [])
    .map((item) => normalizeTextField(item))
    .filter((item) => item.length >= 8)
    .slice(0, 5);

  while (features.length < 2) {
    features.push(
      features.length === 0
        ? `${name} resmi web sitesinde ürün özellikleri sunar.`
        : `${name} için kullanım senaryoları ürün sayfasında açıklanır.`
    );
  }

  const useCases = [
    `${name} ile ilgili iş akışlarını hızlandırmak.`,
    'Ekip içinde deneme ve değerlendirme yapmak.',
  ];
  const targetUsers = ['AI araçlarını keşfeden profesyoneller', 'Ürün ve operasyon ekipleri'];

  const pricing_model = inferPricingModel(description, link) || 'Freemium';

  return {
    name: name.slice(0, 80),
    link,
    description,
    pricing_model,
    platforms: ['Web'],
    features,
    use_cases: useCases,
    target_users: targetUsers,
    limitations: ['Scrape ile alınan veri admin incelemesi gerektirir.'],
    source_reason: `URL scrape (${provider}): ${sourceUrl}`,
    category: null,
    tier: 'Normal',
  };
}
