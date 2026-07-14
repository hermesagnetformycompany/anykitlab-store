import type {Metadata} from 'next';
import {buildMetadata} from '@/lib/seo';
import {AccountShell} from '@/components/account-shell';

export const metadata: Metadata = buildMetadata({
  title: 'My Account',
  description: 'Manage your AnyKit Lab account, orders, kits and profile.',
  path: '/account',
  noIndex: true,
});

export default function AccountLayout({children}: {children: React.ReactNode}) {
  return <AccountShell>{children}</AccountShell>;
}