import type {Metadata} from 'next';
import {buildMetadata} from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Orders',
  description: 'Track payment verification and review your purchases at AnyKit Lab.',
  path: '/account/orders',
  noIndex: true,
});

export default function OrdersLayout({children}: {children: React.ReactNode}) {
  return children;
}