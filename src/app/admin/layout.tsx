import {AdminBoundary} from '@/components/admin-boundary';

export default function AdminLayout({children}: {children: React.ReactNode}) {
  return <AdminBoundary>{children}</AdminBoundary>;
}
