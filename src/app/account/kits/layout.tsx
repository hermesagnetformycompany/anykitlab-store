import type {Metadata} from 'next';
import {buildMetadata} from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'My Kits',
  description: 'Access your purchased Canva template kits and their setup instructions.',
  path: '/account/kits',
  noIndex: true,
});

export default function KitsLayout({children}: {children: React.ReactNode}) {
  return children;
}