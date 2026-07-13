'use client';

import Link from 'next/link';
import {FormEvent, useState} from 'react';
import {LockKeyhole, Mail} from 'lucide-react';
import {BrandLockup} from '@/components/site';
import {useStore} from '@/lib/store';

export default function Login() {
  const {signIn} = useStore();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const result = await signIn(String(form.get('email')), String(form.get('password')));
    if (!result.ok) {
      setError(result.error || 'The email or password is incorrect.');
      setSubmitting(false);
      return;
    }
    window.location.assign('/account');
  }

  return (
    <section className="auth customer-auth">
      <div className="auth-side"><BrandLockup variant="light" /><span className="eyebrow">CUSTOMER SIGN IN</span><h1>Your kits.<br /><em>One place.</em></h1><p>Return to your purchases, download access and order status.</p><div><b>Customer account only</b><small>Administrator access uses a separate protected sign-in.</small></div></div>
      <div className="auth-form"><div><span className="eyebrow">WELCOME BACK</span><h2>Sign in to your account</h2><p>Use your AnyKit Lab customer email and password.</p></div><form onSubmit={submit}><label className="field" htmlFor="login-email"><span>Email address</span><div><Mail aria-hidden="true" /><input id="login-email" name="email" type="email" autoComplete="email" required /></div></label><label className="field" htmlFor="login-password"><span>Password</span><div><LockKeyhole aria-hidden="true" /><input id="login-password" name="password" type="password" autoComplete="current-password" required minLength={8} /></div></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="btn" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in →'}</button></form><p>New here? <Link href="/register"><b>Create a customer account</b></Link></p></div>
    </section>
  );
}
