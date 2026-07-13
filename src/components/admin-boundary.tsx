'use client';

import {usePathname, useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';
import {toAdminRole} from '@/lib/admin-auth';
import {getSupabaseBrowserClient} from '@/lib/supabase/client';

function ProtectedAdmin({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(async ({data}) => {
      if (!data.user?.email) {
        router.replace('/admin/login');
        return;
      }
      const {data: profile} = await supabase.from('akl_profiles').select('full_name,role,status').eq('id', data.user.id).maybeSingle();
      const role = profile ? toAdminRole(profile.role) : null;
      if (!profile || !role || profile.status !== 'active') {
        await supabase.auth.signOut();
        router.replace('/admin/login');
        return;
      }
      sessionStorage.setItem('ak-admin-session', JSON.stringify({name: profile.full_name || data.user.email, email: data.user.email, role}));
      if (active) setAllowed(true);
    });
    return () => { active = false; };
  }, [router]);

  if (!allowed) return <section className="admin-loading" aria-live="polite">Checking administrator access…</section>;
  return children;
}
export function AdminBoundary({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  if (pathname === '/admin/login') return children;
  return <ProtectedAdmin>{children}</ProtectedAdmin>;
}
