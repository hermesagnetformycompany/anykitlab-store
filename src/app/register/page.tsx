'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {FormEvent, useState} from 'react';
import {LockKeyhole, Mail, Phone, UserRound} from 'lucide-react';
import {BrandLockup} from '@/components/site';
import {useStore} from '@/lib/store';

export default function Register() {
  const router = useRouter();
  const {register} = useStore();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);
    const result = await register({name: String(form.get('name')), email: String(form.get('email')), phone: String(form.get('phone'))}, String(form.get('password')));
    if (!result.ok) {
      setError(result.error || 'Unable to create your account.');
      setSubmitting(false);
      return;
    }
    if (result.requiresConfirmation) {
      setMessage('Check your email to confirm the account, then return here to sign in.');
      setSubmitting(false);
      event.currentTarget.reset();
      return;
    }
    router.push('/account');
  }

  return (
    <section className="auth customer-auth">
      <div className="auth-side"><BrandLockup variant="light" /><span className="eyebrow">JOIN THE LAB</span><h1>Make good<br />design your<br /><em>default.</em></h1><p>Create a customer account for orders, saved kits and downloads.</p></div>
      <div className="auth-form"><div><span className="eyebrow">CUSTOMER REGISTRATION</span><h2>Create your account</h2><p>This account is for shopping and purchases only.</p></div><form onSubmit={submit}><label className="field" htmlFor="register-name"><span>Full name</span><div><UserRound aria-hidden="true" /><input id="register-name" name="name" autoComplete="name" required placeholder="Your name" /></div></label><label className="field" htmlFor="register-email"><span>Email address</span><div><Mail aria-hidden="true" /><input id="register-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></div></label><label className="field" htmlFor="register-phone"><span>Phone number</span><div><Phone aria-hidden="true" /><input id="register-phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" /></div></label><label className="field" htmlFor="register-password"><span>Password</span><div><LockKeyhole aria-hidden="true" /><input id="register-password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="8+ characters" /></div></label>{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="notice" role="status">{message}</p>}<button className="btn" type="submit" disabled={submitting}>{submitting ? 'Creating account…' : 'Create customer account →'}</button></form><p>Already a member? <Link href="/login"><b>Sign in</b></Link></p><div className="notice">Accounts, profiles and sessions are secured by Supabase.</div></div>
    </section>
  );
}
