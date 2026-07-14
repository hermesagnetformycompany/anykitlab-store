import type {Metadata} from 'next';
import {buildMetadata} from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Create Account',
  description: 'Sign up for AnyKit Lab to track orders, save kits and access downloads.',
  path: '/register',
  noIndex: true,
});

export default function RegisterLayout({children}: {children: React.ReactNode}) {
  return children;
}