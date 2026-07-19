import { getSiteOrigin } from './siteUrl';

/**
 * SEO metadata and JSON-LD utilities.
 */

const siteOrigin = getSiteOrigin();

export const siteConfig = {
  name: 'AI Keşif Platformu',
  shortName: 'AI Keşif',
  description:
    'Yapay zeka araçlarını keşfet, karşılaştır, test et ve toplulukla paylaş. 1000+ AI aracının kapsamlı kütüphanesi.',
  url: siteOrigin,
  ogImage: `${siteOrigin}/opengraph-image`,
  twitterHandle: '@AIKesifPlatformu',
  language: 'tr',
  email: 'support@ai-kesif-platformu.com',
};

/**
 * Normalize a path and optionally prefix the English locale segment.
 * Existing callers often pass already-localized paths (`/en/karsilastir`).
 * @param {string} path
 * @param {'tr'|'en'|string} [locale='tr']
 */
export function buildLocalePath(path = '', locale = 'tr') {
  let normalized = String(path || '').trim();
  if (!normalized || normalized === '/') {
    return locale === 'en' ? '/en' : '/';
  }
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+$/, '') || '/';

  const alreadyEn = normalized === '/en' || normalized.startsWith('/en/');

  if (locale === 'en') {
    if (alreadyEn) return normalized;
    return normalized === '/' ? '/en' : `/en${normalized}`;
  }

  // Turkish default: keep caller path as-is (do not strip an explicit /en prefix).
  return normalized;
}

/** Strip optional `/en` prefix so hreflang alternates can be rebuilt. */
export function stripLocalePrefix(path = '') {
  let normalized = String(path || '').trim();
  if (!normalized) return '/';
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+$/, '') || '/';
  if (normalized === '/en') return '/';
  if (normalized.startsWith('/en/')) return normalized.slice(3) || '/';
  return normalized;
}

function toAbsoluteUrl(pathOrUrl = '') {
  if (!pathOrUrl) return siteConfig.url;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteConfig.url}${path}`;
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positiveInt(value) {
  const n = finiteNumber(value);
  if (n === null || n <= 0) return null;
  return Math.round(n);
}

/**
 * Escape JSON for safe embedding in <script type="application/ld+json">.
 */
export function safeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function generatePageMetadata({
  title,
  description,
  path = '',
  image = siteConfig.ogImage,
  type = 'website',
  author = 'AI Keşif Platformu',
  noindex = false,
  publishedTime = null,
  modifiedTime = null,
  locale,
}) {
  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const fullDescription = description || siteConfig.description;
  // Prefer explicit locale; otherwise infer from path when callers pass `/en/...`.
  const pathStr = String(path || '');
  const inferredLocale =
    locale === 'en' || locale === 'tr'
      ? locale
      : pathStr === '/en' || pathStr.startsWith('/en/')
        ? 'en'
        : 'tr';
  const basePath = stripLocalePrefix(path);
  const localizedPath = buildLocalePath(basePath, inferredLocale);
  const fullUrl = toAbsoluteUrl(localizedPath === '/' ? '' : localizedPath);
  const absoluteImage = toAbsoluteUrl(image);

  const trPath = buildLocalePath(basePath, 'tr');
  const enPath = buildLocalePath(basePath, 'en');

  return {
    metadataBase: new URL(siteConfig.url),
    title: fullTitle,
    description: fullDescription,
    keywords: [
      'AI araçları',
      'yapay zeka',
      'AI keşfi',
      'AI platformu',
      'araç karşılaştırma',
      'ChatGPT alternatifleri',
      'AI tools',
    ],
    authors: [{ name: author }],
    creator: author,
    publisher: siteConfig.name,
    robots: {
      index: !noindex,
      follow: true,
      googleBot: {
        index: !noindex,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: fullUrl,
      languages: {
        tr: toAbsoluteUrl(trPath === '/' ? '' : trPath),
        en: toAbsoluteUrl(enPath),
        'x-default': toAbsoluteUrl(trPath === '/' ? '' : trPath),
      },
    },
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: fullUrl,
      siteName: siteConfig.name,
      images: [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
          type: 'image/png',
        },
      ],
      locale: inferredLocale === 'en' ? 'en_US' : 'tr_TR',
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [absoluteImage],
      creator: siteConfig.twitterHandle,
      site: siteConfig.twitterHandle,
    },
  };
}

export function generateToolMetadata({ name, description, slug, image, locale = 'tr' }) {
  const toolSlug =
    slug ||
    String(name || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-');

  return generatePageMetadata({
    title: `${name} - AI Aracı`,
    description:
      description || `${name} hakkında bilgi edinin, puanları görün ve karşılaştırma yapın.`,
    path: `/tool/${toolSlug}`,
    image,
    type: 'website',
    author: 'AI Keşif Platformu',
    locale,
  });
}

export function generateCollectionMetadata({ name, description, itemCount, slug, locale = 'tr' }) {
  return generatePageMetadata({
    title: name,
    description: description || `${itemCount || 0} araçtan oluşan koleksiyon`,
    path: `/koleksiyonlar/${slug || String(name || '').toLowerCase().replace(/\s+/g, '-')}`,
    type: 'website',
    locale,
  });
}

export function generateBlogMetadata({
  title,
  description,
  slug,
  image,
  publishedDate,
  modifiedDate,
  author,
  locale = 'tr',
}) {
  return generatePageMetadata({
    title,
    description,
    path: `/blog/${slug}`,
    image,
    type: 'article',
    author,
    publishedTime: publishedDate,
    modifiedTime: modifiedDate,
    locale,
  });
}

/**
 * Build schema.org JSON-LD objects. Omits empty/invalid nested fields
 * so Google doesn't flag incomplete Product/Offer markup.
 */
export function generateStructuredData(type, data = {}) {
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  switch (type) {
    case 'Organization':
      return {
        ...baseSchema,
        name: siteConfig.name,
        alternateName: siteConfig.shortName,
        description: siteConfig.description,
        url: siteConfig.url,
        logo: `${siteConfig.url}/icon.svg`,
        sameAs: [
          'https://twitter.com/AIKesifPlatformu',
          'https://instagram.com/aikesifplatformu',
        ].filter(Boolean),
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: siteConfig.email,
          availableLanguage: ['Turkish', 'English'],
        },
      };

    case 'Product':
    case 'SoftwareApplication': {
      const schema = {
        ...baseSchema,
        '@type': type === 'Product' ? 'SoftwareApplication' : type,
        name: data.name,
        description: data.description,
        url: data.url ? toAbsoluteUrl(data.url) : undefined,
        applicationCategory: data.applicationCategory || 'BusinessApplication',
        operatingSystem: data.operatingSystem || data.platforms || 'Web',
      };

      if (data.image) {
        schema.image = toAbsoluteUrl(data.image);
      }

      const ratingValue = finiteNumber(data.rating);
      const reviewCount = positiveInt(data.reviewCount);
      if (ratingValue !== null && ratingValue > 0 && reviewCount) {
        schema.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: Number(ratingValue.toFixed(2)),
          reviewCount,
          bestRating: 5,
          worstRating: 1,
        };
      }

      if (data.offers || data.pricingModel || data.minPrice != null) {
        const lowPrice = finiteNumber(data.minPrice);
        const highPrice = finiteNumber(data.maxPrice);
        schema.offers = {
          '@type': highPrice != null && lowPrice != null ? 'AggregateOffer' : 'Offer',
          priceCurrency: data.priceCurrency || 'USD',
          ...(lowPrice != null ? { lowPrice, price: lowPrice } : {}),
          ...(highPrice != null ? { highPrice } : {}),
          ...(data.pricingModel ? { description: data.pricingModel } : {}),
          availability: 'https://schema.org/InStock',
        };
      }

      return schema;
    }

    case 'Article':
      return {
        ...baseSchema,
        headline: data.title,
        description: data.description,
        image: data.image ? toAbsoluteUrl(data.image) : undefined,
        author: {
          '@type': data.authorType || 'Person',
          name: data.author || siteConfig.name,
        },
        publisher: {
          '@type': 'Organization',
          name: siteConfig.name,
          logo: {
            '@type': 'ImageObject',
            url: `${siteConfig.url}/icon.svg`,
          },
        },
        datePublished: data.publishedDate,
        dateModified: data.modifiedDate || data.publishedDate,
        mainEntityOfPage: data.url ? toAbsoluteUrl(data.url) : undefined,
      };

    case 'BreadcrumbList': {
      const items = Array.isArray(data) ? data : data?.items || [];
      return {
        ...baseSchema,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: toAbsoluteUrl(item.url || item.path || ''),
        })),
      };
    }

    case 'ItemList': {
      const items = Array.isArray(data?.items) ? data.items : [];
      return {
        ...baseSchema,
        name: data.name,
        description: data.description,
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          url: item.url ? toAbsoluteUrl(item.url) : undefined,
          ...(item.image ? { image: toAbsoluteUrl(item.image) } : {}),
        })),
      };
    }

    case 'FAQPage': {
      const faqs = Array.isArray(data?.faqs) ? data.faqs : Array.isArray(data) ? data : [];
      return {
        ...baseSchema,
        mainEntity: faqs
          .filter((faq) => faq?.question && faq?.answer)
          .map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
      };
    }

    case 'WebSite':
      return {
        ...baseSchema,
        name: siteConfig.name,
        alternateName: siteConfig.shortName,
        url: siteConfig.url,
        inLanguage: ['tr-TR', 'en-US'],
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteConfig.url}/?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      };

    default:
      return { ...baseSchema, ...data };
  }
}

export function generateSitemapEntry({
  url,
  lastModified = new Date(),
  changeFrequency = 'weekly',
  priority = 0.5,
}) {
  const lastMod =
    lastModified instanceof Date
      ? lastModified.toISOString()
      : new Date(lastModified || Date.now()).toISOString();

  return {
    url: toAbsoluteUrl(url),
    lastModified: lastMod,
    changeFrequency,
    priority,
  };
}

const seoUtils = {
  siteConfig,
  buildLocalePath,
  stripLocalePrefix,
  safeJsonLd,
  generatePageMetadata,
  generateToolMetadata,
  generateCollectionMetadata,
  generateBlogMetadata,
  generateStructuredData,
  generateSitemapEntry,
};

export default seoUtils;
