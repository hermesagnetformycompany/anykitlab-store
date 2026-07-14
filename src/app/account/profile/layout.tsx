import type {Metadata} from 'next';
import {buildMetadata} from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Profile',
  description: 'Manage your personal details, delivery email and phone number at AnyKit Lab.',
  path: '/account/profile',
  noIndex: true,
});

export default function ProfileLayout({children}: {children: React.ReactNode}) {
  return children;
}