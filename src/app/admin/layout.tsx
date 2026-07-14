import type {Metadata} from 'next';
import {AdminBoundary} from '@/components/admin-boundary';

export const metadata: Metadata = {
  title: 'Admin',
  robots: {index: false, follow: false},
};

export default function AdminLayout({children}: {children: React.ReactNode}) {
  return <AdminBoundary>{children}</AdminBoundary>;
}
