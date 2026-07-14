import type {Metadata} from 'next';

export const SITE_URL = 'https://anykitlab-store.vercel.app';
export const SITE_NAME = 'AnyKit Lab';
export const SITE_TAGLINE = 'Templates for brands that move';
export const SITE_DESCRIPTION =
  'Editable Canva template kits for ambitious small brands, creators and service providers.';
export const SITE_LOGO = '/assets/logos/anykitlab-logo-light-background.svg';
export const SITE_LOCALE = 'en_US';

const DEFAULT_OG_IMAGE = '/og-default.png';

type BuildMetadataInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  keywords?: string[];
};

/**
 * Build a per-page Metadata object that inherits the root template/title
 * defaults while providing canonical, OG, Twitter and robots directives.
 */
export function buildMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noIndex = false,
  keywords,
}: BuildMetadataInput = {}): Metadata {
  const url = path.startsWith('/') ? `${SITE_URL}${path}` : `${SITE_URL}/${path}`;
  const ogImage = image.startsWith('http') ? image : `${SITE_URL}${image}`;

  return {
    title,
    description,
    keywords: keywords?.length ? keywords : undefined,
    alternates: {canonical: url},
    openGraph: {
      type: type === 'product' ? 'website' : type,
      url,
      siteName: SITE_NAME,
      title: title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — ${SITE_TAGLINE}`,
      description,
      images: [{url: ogImage, width: 1200, height: 630, alt: title || SITE_NAME}],
      locale: SITE_LOCALE,
    },
    twitter: {
      card: 'summary_large_image',
      title: title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — ${SITE_TAGLINE}`,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? {index: false, follow: false}
      : {index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1},
  };
}

type JsonLdInput = Record<string, unknown> | Record<string, unknown>[];

/**
 * Render a JSON-LD script tag for structured data.
 * Use in server components: <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(data)}} />
 */
export function jsonLdScript(data: JsonLdInput) {
  return {
    type: 'application/ld+json' as const,
    dangerouslySetInnerHTML: {__html: JSON.stringify(data)},
  };
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${SITE_LOGO}`,
    description: SITE_DESCRIPTION,
    sameAs: [] as string[],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/shop?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: {name: string; url: string}[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function productJsonLd(product: {
  title: string;
  description: string;
  price: number;
  mrp?: number;
  slug: string;
  category?: string;
  includes?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    category: product.category || 'Templates',
    url: `${SITE_URL}/products/${product.slug}`,
    brand: {'@type': 'Brand', name: SITE_NAME},
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price,
      ...(product.mrp ? {'@type': 'AggregateOffer', lowPrice: product.price, highPrice: product.mrp} : {}),
      availability: 'https://schema.org/InStock',
      seller: {'@type': 'Organization', name: SITE_NAME},
    },
  };
}

export function faqJsonLd(faqs: {question: string; answer: string}[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {'@type': 'Answer', text: faq.answer},
    })),
  };
}