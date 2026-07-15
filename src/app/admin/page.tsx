import {AdminDashboard} from '@/components/admin-dashboard';
import {AdminCatalogTools} from '@/components/admin-catalog-tools';
import {redirect} from 'next/navigation';
import {getSupabaseServerClient} from '@/lib/supabase/server';
import {toAdminRole} from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');
  const {data: profile} = await supabase.from('akl_profiles').select('role,status').eq('id', user.id).maybeSingle();
  const role = profile ? toAdminRole(profile.role) : null;
  if (!profile || profile.status !== 'active' || !role) redirect('/admin/login');
  return <><AdminDashboard />{(role === 'Owner' || role === 'Catalog manager') && <AdminCatalogTools />}</>;
}
