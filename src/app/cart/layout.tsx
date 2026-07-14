import type {Metadata} from 'next';
import {buildMetadata} from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Cart',
  description: 'Review your selected template kits before checkout.',
  path: '/cart',
  noIndex: true,
});

export default function CartLayout({children}: {children: React.ReactNode}) {
  return children;
}