import type {Metadata} from 'next';
import {buildMetadata} from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Downloads & Access',
  description: 'Access your approved Canva template kits and download instructions.',
  path: '/account/downloads',
  noIndex: true,
});

export default function DownloadsLayout({children}: {children: React.ReactNode}) {
  return children;
}