import type {Metadata, Viewport} from 'next';
import {DM_Sans, Manrope} from 'next/font/google';
import './globals.css';
import './reference.css';
import './home-reference.css';
import './admin-v2.css';
import './scale.css';
import './polish.css';
import {AppShell} from '@/components/site';
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_LOGO,
  SITE_LOCALE,
} from '@/lib/seo';

const display = DM_Sans({subsets: ['latin'], variable: '--font-display', weight: ['500', '600', '700']});
const body = Manrope({subsets: ['latin'], variable: '--font-body'});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e95717',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Canva templates',
    'editable templates',
    'Instagram templates',
    'template kits',
    'small business templates',
    'social media templates',
    'Canva kits',
    'digital products',
  ],
  authors: [{name: SITE_NAME, url: SITE_URL}],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: SITE_LOCALE,
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ['/og-default.png'],
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  category: 'shopping',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}${SITE_LOGO}`,
    description: SITE_DESCRIPTION,
  };
  const siteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/shop?q={search_term_string}`,
      'query-input': 'required name={search_term_string}',
    },
  };

  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${display.variable} ${body.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(orgLd)}} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(siteLd)}} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
