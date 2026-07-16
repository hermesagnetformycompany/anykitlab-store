import {redirect} from 'next/navigation';
import {AdminDashboard} from '@/components/admin-dashboard';
import {getVerifiedAdmin} from '@/lib/admin-server';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await getVerifiedAdmin();
  if (!admin) redirect('/admin/login');
  return <AdminDashboard />;
}
