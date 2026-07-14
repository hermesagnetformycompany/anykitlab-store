import type {Metadata} from 'next';
import {buildMetadata} from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Sign In',
  description: 'Access your AnyKit Lab account to view orders, downloads and wishlist.',
  path: '/login',
  noIndex: true,
});

export default function LoginLayout({children}: {children: React.ReactNode}) {
  return children;
}