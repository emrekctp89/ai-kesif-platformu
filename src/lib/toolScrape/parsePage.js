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

function normalizeJsonLdItems(value) {
  if (Array.isArray(value)) return value.flatMap(normalizeJsonLdItems);
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value['@graph'])) return normalizeJsonLdItems(value['@graph']);
  return [value];
}

function parseJsonLd($) {
  const items = [];
  $('script[type="application/ld+json"]').each((_index, element) => {
    try {
      items.push(...normalizeJsonLdItems(JSON.parse($(element).text())));
    } catch {
      // Invalid third-party structured data must not make the whole scrape fail.
    }
  });
  return items;
}

function schemaTypes(item) {
  return (Array.isArray(item?.['@type']) ? item['@type'] : [item?.['@type']])
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
}

function schemaText(value) {
  if (Array.isArray(value)) return value.map(schemaText).filter(Boolean).join(', ');
  if (value && typeof value === 'object') return schemaText(value.name || value.description);
  return cleanText(value, 500);
}

function extractSchemaData(items) {
  const software = items.find((item) =>
    schemaTypes(item).some((type) =>
      ['softwareapplication', 'webapplication', 'mobileapplication', 'product'].includes(type)
    )
  );
  if (!software) return null;

  const offer = Array.isArray(software.offers) ? software.offers[0] : software.offers;
  const features = Array.isArray(software.featureList)
    ? software.featureList
    : String(software.featureList || '').split(/[\n;]+/);

  return {
    type: schemaTypes(software),
    name: schemaText(software.name),
    description: schemaText(software.description),
    category: schemaText(software.applicationCategory || software.category),
    operatingSystem: schemaText(software.operatingSystem),
    price: cleanText(offer?.price, 80),
    priceCurrency: cleanText(offer?.priceCurrency, 20),
    features: features
      .map((value) => cleanText(value, 120))
      .filter(Boolean)
      .slice(0, 8),
  };
}

const SECTION_PATTERNS = {
  features: /feature|capabilit|what (?:it|you) can|özellik|yetenek/i,
  useCases: /use cases?|solutions?|workflows?|kullanım|senaryo|çözümler/i,
  targetUsers: /who (?:is|it's|it is) for|for teams?|audience|kimler için|hedef kullanıcı/i,
  limitations: /limitations?|considerations?|requirements?|sınırlama|gereksinim/i,
};

function extractSectionLists($) {
  const sections = { features: [], useCases: [], targetUsers: [], limitations: [] };
  $('h1, h2, h3, h4').each((_index, heading) => {
    const title = cleanText($(heading).text(), 120);
    const key = Object.keys(SECTION_PATTERNS).find((name) => SECTION_PATTERNS[name].test(title));
    if (!key) return;
    $(heading)
      .nextUntil('h1, h2, h3, h4')
      .find('li')
      .addBack('li')
      .each((_itemIndex, item) => {
        const text = cleanText($(item).text(), 140);
        if (text.length >= 8 && text.length <= 140 && !sections[key].includes(text)) {
          sections[key].push(text);
        }
      });
  });
  return Object.fromEntries(
    Object.entries(sections).map(([key, values]) => [key, values.slice(0, 8)])
  );
}

function inferPlatformsFromEvidence(schema, pageText) {
  const source = `${schema?.operatingSystem || ''} ${pageText}`.toLowerCase();
  const platforms = ['Web'];
  if (/\bios\b|iphone|ipad|app store/.test(source)) platforms.push('iOS');
  if (/android|google play/.test(source)) platforms.push('Android');
  if (/windows/.test(source)) platforms.push('Windows');
  if (/macos|mac os|\bmac\b/.test(source)) platforms.push('macOS');
  if (/linux/.test(source)) platforms.push('Linux');
  if (/chrome extension|chrome web store/.test(source)) platforms.push('Chrome Uzantısı');
  return [...new Set(platforms)].slice(0, 5);
}

/**
 * HTML string → ham alanlar
 */
export function parseHtmlDocument(html, pageUrl) {
  const $ = cheerio.load(String(html || ''));
  const jsonLd = parseJsonLd($);
  const schema = extractSchemaData(jsonLd);
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
  const name = firstNonEmpty(schema?.name, ogTitle, h1, docTitle)
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

  const description = firstNonEmpty(schema?.description, ogDescription, paragraphBits.join(' '));

  const sectionLists = extractSectionLists($);
  const genericListItems = $('main li, article li, li')
    .toArray()
    .map((el) => cleanText($(el).text(), 120))
    .filter((text) => text.length >= 12 && text.length <= 120)
    .slice(0, 8);
  const featureCandidates = [
    ...new Set([...(schema?.features || []), ...sectionLists.features, ...genericListItems]),
  ].slice(0, 8);

  const siteName = metaContent($, 'meta[property="og:site_name"]');

  return {
    name: name || siteName || '',
    description,
    link: normalizeToolUrl(finalUrl) || finalUrl,
    siteName: siteName || '',
    features: featureCandidates,
    useCases: sectionLists.useCases,
    targetUsers: sectionLists.targetUsers,
    limitations: sectionLists.limitations,
    platforms: inferPlatformsFromEvidence(schema, $('body').text()),
    structuredData: schema,
    meta: {
      ogTitle,
      ogDescription,
      docTitle,
      h1,
      canonical: finalUrl,
      evidence: {
        jsonLd: Boolean(schema),
        semanticSections: Object.fromEntries(
          Object.entries(sectionLists).map(([key, values]) => [key, values.length])
        ),
      },
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

  const observedFeatures = (parsed.features || [])
    .map((item) => normalizeTextField(item))
    .filter((item) => item.length >= 8)
    .slice(0, 5);
  const features = [...observedFeatures];

  while (features.length < 2) {
    features.push(
      features.length === 0
        ? `${name} resmi web sitesinde ürün özellikleri sunar.`
        : `${name} için kullanım senaryoları ürün sayfasında açıklanır.`
    );
  }

  const observedUseCases = (parsed.useCases || [])
    .map((item) => normalizeTextField(item))
    .filter(Boolean)
    .slice(0, 5);
  const observedTargetUsers = (parsed.targetUsers || [])
    .map((item) => normalizeTextField(item))
    .filter(Boolean)
    .slice(0, 4);
  const useCases =
    observedUseCases.length >= 2
      ? observedUseCases
      : [
          `${name} ile ilgili iş akışlarını hızlandırmak.`,
          'Ekip içinde deneme ve değerlendirme yapmak.',
        ];
  const targetUsers = observedTargetUsers.length
    ? observedTargetUsers
    : ['AI araçlarını keşfeden profesyoneller', 'Ürün ve operasyon ekipleri'];

  const pricing_model = inferPricingModel(description, link) || 'Freemium';

  return {
    name: name.slice(0, 80),
    link,
    description,
    pricing_model,
    platforms: parsed.platforms?.length ? parsed.platforms : ['Web'],
    features,
    use_cases: useCases,
    target_users: targetUsers,
    limitations: (parsed.limitations || [])
      .map((item) => normalizeTextField(item))
      .filter(Boolean)
      .slice(0, 2)
      .concat(['Scrape ile alınan veri admin incelemesi gerektirir.'])
      .slice(0, 3),
    source_reason: `URL scrape (${provider}): ${sourceUrl}`,
    category: null,
    tier: 'Normal',
    provenance: {
      provider,
      observed: {
        description: Boolean(parsed.description),
        features: observedFeatures.length,
        use_cases: observedUseCases.length,
        target_users: observedTargetUsers.length,
        structured_data: Boolean(parsed.structuredData),
      },
      inferred: {
        description: !parsed.description || String(parsed.description).length < 60,
        features: Math.max(0, 2 - observedFeatures.length),
        use_cases: observedUseCases.length < 2,
        target_users: observedTargetUsers.length === 0,
      },
    },
  };
}
