import {AdminDashboard} from '@/components/admin-dashboard';
import {redirect} from 'next/navigation';
import {getSupabaseServerClient} from '@/lib/supabase/server';
import {toAdminRole} from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');
  const {data: profile} = await supabase.from('akl_profiles').select('role,status').eq('id', user.id).maybeSingle();
  if (!profile || profile.status !== 'active' || !toAdminRole(profile.role)) redirect('/admin/login');
  return <AdminDashboard />;
}
