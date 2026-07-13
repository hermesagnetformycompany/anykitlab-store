'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {
  Download,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  Package,
  UserRound,
} from 'lucide-react';
import {useEffect} from 'react';
import {useStore} from '@/lib/store';

const accountNavigation = [
  {label: 'Overview', href: '/account', icon: LayoutDashboard},
  {label: 'My Orders', href: '/account/orders', icon: Package},
  {label: 'My Kits', href: '/account/kits', icon: Download},
  {label: 'Downloads & Access', href: '/account/downloads', icon: Download},
  {label: 'Wishlist', href: '/account/wishlist', icon: Heart},
  {label: 'Profile Details', href: '/account/profile', icon: UserRound},
  {label: 'Password & Security', href: '/account/security', icon: LockKeyhole},
];

export function AccountShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();
  const {customer, ready, signOut} = useStore();

  useEffect(() => {
    if (ready && !customer) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [customer, pathname, ready, router]);

  if (!ready || !customer) {
    return (
      <section className="account-loading" aria-live="polite">
        <span />
        <p>Loading your account…</p>
      </section>
    );
  }

  return (
    <div className="customer-account">
      <header className="account-welcome">
        <div>
          <span>MY ANYKIT LAB</span>
          <h1>Welcome back, {customer.name.split(' ')[0]}.</h1>
          <p>Manage your orders, kit access and profile in one place.</p>
        </div>
        <div className="account-identity">
          <span>{customer.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</span>
          <div><b>{customer.name}</b><small>{customer.email}</small></div>
        </div>
      </header>
      <div className="customer-account-layout">
        <aside className="customer-account-nav">
          <nav aria-label="Account navigation">
            {accountNavigation.map(item => {
              const Icon = item.icon;
              const active = item.href === '/account' ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link className={active ? 'active' : ''} href={item.href} key={item.href} aria-current={active ? 'page' : undefined}>
                  <Icon aria-hidden="true" /><span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <Link className="account-help-link" href="/help#contact"><LifeBuoy aria-hidden="true" /><span><b>Need help?</b><small>Contact customer support</small></span></Link>
          <button
            className="account-logout"
            type="button"
            onClick={async () => {
              await signOut();
              router.push('/');
            }}
          >
            <LogOut aria-hidden="true" />Sign out
          </button>
        </aside>
        <section className="account-content">{children}</section>
      </div>
    </div>
  );
}
