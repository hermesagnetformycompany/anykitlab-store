'use client';

import {FormEvent, useEffect, useRef, useState} from 'react';
import {Check, UserRound} from 'lucide-react';
import {useStore} from '@/lib/store';

export default function ProfilePage() {
  const {customer, updateCustomer} = useStore();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await updateCustomer({name: String(form.get('name')), email: String(form.get('email')), phone: String(form.get('phone'))});
    if (!result.ok) {
      setError(result.error || 'Unable to update your profile.');
      return;
    }
    setError('');
    setSaved(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <>
      <div className="account-page-heading"><div><span>PERSONAL DETAILS</span><h2>Profile Details</h2><p>These details are used for receipts, access and order support.</p></div></div>
      <section className="account-panel profile-panel">
        <div className="profile-avatar"><UserRound aria-hidden="true" /><span><b>{customer?.name}</b><small>AnyKit Lab customer</small></span></div>
        <form onSubmit={submit}>
          <label htmlFor="profile-name">Full name<input id="profile-name" name="name" required defaultValue={customer?.name} /></label>
          <label htmlFor="profile-email">Email address<input id="profile-email" name="email" type="email" required defaultValue={customer?.email} /></label>
          <label htmlFor="profile-phone">Phone number<input id="profile-phone" name="phone" type="tel" defaultValue={customer?.phone} placeholder="+91 98765 43210" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit">{saved ? <><Check aria-hidden="true" />Saved</> : 'Save profile changes'}</button>
        </form>
      </section>
    </>
  );
}
