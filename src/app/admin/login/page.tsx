'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {FormEvent, useState} from 'react';
import {BrandLockup} from '@/components/site';
import {toAdminRole} from '@/lib/admin-auth';
import {getSupabaseBrowserClient} from '@/lib/supabase/client';

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim().toLowerCase();
    const password = String(form.get('password'));
    const supabase = getSupabaseBrowserClient();
    const {data, error: authError} = await supabase.auth.signInWithPassword({email, password});

    if (authError || !data.user) {
      setError('That user ID or password is incorrect.');
      setSubmitting(false);
      return;
    }

    const {data: profile, error: profileError} = await supabase
      .from('akl_profiles')
      .select('full_name,role,status')
      .eq('id', data.user.id)
      .maybeSingle();
    const role = profile ? toAdminRole(profile.role) : null;
    if (profileError || !profile || !role || profile.status !== 'active') {
      await supabase.auth.signOut();
      setError('This account does not have active AnyKit Lab administrator access.');
      setSubmitting(false);
      return;
    }

    sessionStorage.setItem('ak-admin-session', JSON.stringify({name: profile.full_name || email, email, role}));
    router.replace('/admin');
    router.refresh();
  }

  return (
    <section className="admin-login">
      <div className="form-card">
        <Link href="/" aria-label="Return to AnyKit Lab storefront"><BrandLockup /></Link>
        <span className="eyebrow">MULTI-USER ADMIN ACCESS</span>
        <h2>Operations sign in</h2>
        <p>Each team member receives a secure, role-specific Supabase account.</p>
        <form onSubmit={submit}>
          <div className="field"><label htmlFor="admin-email">User ID</label><input id="admin-email" name="email" type="email" autoComplete="username" required placeholder="you@company.com" /></div>
          <div className="field"><label htmlFor="admin-password">Password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required minLength={8} /></div>
          {error && <p role="alert">{error}</p>}
          <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Checking access…' : 'Enter operations dashboard →'}</button>
        </form>
        <div className="admin-access-note"><b>Protected administrator access</b><p>Staff accounts and roles are managed by the owner inside the Team workspace.</p></div>
      </div>
    </section>
  );
}
