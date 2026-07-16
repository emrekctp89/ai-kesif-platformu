import { getSiteOrigin } from './siteUrl';

/**
 * SEO metadata utilities.
 */

const siteOrigin = getSiteOrigin();

export const siteConfig = {
  name: 'AI Keşif Platformu',
  description:
    'Yapay zeka araçlarını keşfet, karşılaştır, test et ve toplulukla paylaş. 1000+ AI aracının kapsamlı kütüphanesi.',
  url: siteOrigin,
  ogImage: `${siteOrigin}/og-image.png`,
  twitterHandle: '@AIKesifPlatformu',
  language: 'tr',
};

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
}) {
  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const fullDescription = description || siteConfig.description;
  const fullUrl = `${siteConfig.url}${path}`;

  return {
    metadataBase: new URL(siteConfig.url),
    title: fullTitle,
    description: fullDescription,
    keywords: ['AI araçları', 'yapay zeka', 'AI keşfi', 'AI platformu', 'araç karşılaştırma'],
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
        en: `${siteConfig.url}/en${path}`,
        tr: fullUrl,
      },
    },
    openGraph: {
      title: fullTitle,
      description: fullDescription,
      url: fullUrl,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: fullTitle,
          type: 'image/png',
        },
        {
          url: image,
          width: 800,
          height: 800,
          alt: fullTitle,
          type: 'image/png',
        },
      ],
      locale: 'tr_TR',
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [image],
      creator: siteConfig.twitterHandle,
      site: siteConfig.twitterHandle,
    },
  };
}

export function generateToolMetadata({ name, description, image }) {
  return generatePageMetadata({
    title: `${name} - AI Aracı`,
    description:
      description || `${name} hakkında bilgi edinin, puanları görün ve karşılaştırma yapın.`,
    path: `/tool/${name.toLowerCase().replace(/\s+/g, '-')}`,
    image,
    type: 'product',
    author: 'AI Keşif Platformu',
  });
}

export function generateCollectionMetadata({ name, description, itemCount }) {
  return generatePageMetadata({
    title: name,
    description: description || `${itemCount} araçtan oluşan koleksiyon`,
    path: `/koleksiyonlar/${name.toLowerCase().replace(/\s+/g, '-')}`,
    type: 'collection',
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
  });
}

export function generateStructuredData(type, data) {
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  switch (type) {
    case 'Organization':
      return {
        ...baseSchema,
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.url,
        logo: `${siteConfig.url}/logo.png`,
        sameAs: ['https://twitter.com/AIKesifPlatformu', 'https://instagram.com/aikesifplatformu'],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'Customer Support',
          email: 'support@ai-kesif-platformu.com',
        },
      };

    case 'Product':
      return {
        ...baseSchema,
        name: data.name,
        description: data.description,
        image: data.image,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: data.rating,
          reviewCount: data.reviewCount,
        },
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: data.minPrice,
          highPrice: data.maxPrice,
        },
      };

    case 'Article':
      return {
        ...baseSchema,
        headline: data.title,
        description: data.description,
        image: data.image,
        author: {
          '@type': 'Person',
          name: data.author,
        },
        datePublished: data.publishedDate,
        dateModified: data.modifiedDate,
      };

    case 'BreadcrumbList':
      return {
        ...baseSchema,
        itemListElement: data.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: `${siteConfig.url}${item.url}`,
        })),
      };

    case 'WebSite':
      return {
        ...baseSchema,
        name: siteConfig.name,
        url: siteConfig.url,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${siteConfig.url}/ara?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      };

    default:
      return baseSchema;
  }
}

export function generateSitemapEntry({
  url,
  lastModified = new Date(),
  changeFrequency = 'weekly',
  priority = 0.5,
}) {
  return {
    url: `${siteConfig.url}${url}`,
    lastModified: lastModified.toISOString(),
    changeFrequency,
    priority,
  };
}

const seoUtils = {
  siteConfig,
  generatePageMetadata,
  generateToolMetadata,
  generateCollectionMetadata,
  generateBlogMetadata,
  generateStructuredData,
  generateSitemapEntry,
};

export default seoUtils;
