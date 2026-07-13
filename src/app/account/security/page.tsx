'use client';

import {FormEvent, useEffect, useRef, useState} from 'react';
import {Check, LockKeyhole} from 'lucide-react';
import {getSupabaseBrowserClient} from '@/lib/supabase/client';

export default function SecurityPage() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get('currentPassword'));
    const newPassword = String(form.get('newPassword'));
    const confirmation = String(form.get('confirmation'));
    if (newPassword !== confirmation) {
      setError('The new passwords do not match.');
      return;
    }
    const supabase = getSupabaseBrowserClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (!user?.email) {
      setError('Your session has expired. Please sign in again.');
      return;
    }
    const {error: verificationError} = await supabase.auth.signInWithPassword({email: user.email, password: currentPassword});
    if (verificationError) {
      setError('Your current password is incorrect.');
      return;
    }
    const {error: updateError} = await supabase.auth.updateUser({password: newPassword});
    if (updateError) {
      setError(updateError.message);
      return;
    }
    event.currentTarget.reset();
    setSaved(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <>
      <div className="account-page-heading"><div><span>ACCOUNT SECURITY</span><h2>Password & Security</h2><p>Keep your customer account protected.</p></div></div>
      <section className="account-panel profile-panel security-panel">
        <div className="profile-avatar"><LockKeyhole aria-hidden="true" /><span><b>Change password</b><small>Use at least eight characters and avoid reused passwords.</small></span></div>
        <form onSubmit={submit}>
          <label htmlFor="current-password">Current password<input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required /></label>
          <label htmlFor="new-password">New password<input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
          <label htmlFor="confirm-password">Confirm new password<input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit">{saved ? <><Check aria-hidden="true" />Updated</> : 'Update password'}</button>
        </form>
      </section>
    </>
  );
}
