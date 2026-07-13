import {toAdminRole, type AdminRole} from './admin-auth';
import {getSupabaseServerClient} from './supabase/server';

export type VerifiedAdmin = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

export async function getVerifiedAdmin(): Promise<VerifiedAdmin | null> {
  const supabase = await getSupabaseServerClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user?.email) return null;
  const {data: profile, error: profileError} = await supabase
    .from('akl_profiles')
    .select('full_name,role,status')
    .eq('id', user.id)
    .maybeSingle();
  const role = profile ? toAdminRole(profile.role) : null;
  if (profileError || !profile || !role || profile.status !== 'active') return null;
  return {id: user.id, email: user.email, name: profile.full_name || user.email, role};
}
