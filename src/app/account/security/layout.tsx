import type {Metadata} from 'next';
import {buildMetadata} from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Password & Security',
  description: 'Keep your AnyKit Lab customer account protected. Update your password and security settings.',
  path: '/account/security',
  noIndex: true,
});

export default function SecurityLayout({children}: {children: React.ReactNode}) {
  return children;
}