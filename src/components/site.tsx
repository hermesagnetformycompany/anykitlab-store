'use client';

import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {
  ChevronDown,
  Menu,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {Product, money} from '@/lib/data';
import {StoreProvider, useStore} from '@/lib/store';

type MenuName = 'categories' | 'collections' | 'help';

type NavItem = {
  label: string;
  href: string;
  description: string;
};

const navigation: Record<MenuName, {label: string; intro: string; items: NavItem[]}> = {
  categories: {
    label: 'Categories',
    intro: 'Browse by business',
    items: [
      {label: 'Fitness & Wellness', href: '/categories/fitness', description: 'Gyms, trainers and wellness brands'},
      {label: 'Beauty & Service', href: '/categories/beauty', description: 'Studios and appointment-led businesses'},
      {label: 'Auto Detailing', href: '/categories/automotive', description: 'Garages and detailing specialists'},
      {label: 'Food & Hospitality', href: '/categories/food', description: 'Cafes, restaurants and food brands'},
      {label: 'Real Estate', href: '/categories/real-estate', description: 'Agents, brokers and property teams'},
      {label: 'Coaches & Consultants', href: '/categories/coaching', description: 'Experts and service businesses'},
    ],
  },
  collections: {
    label: 'Collections',
    intro: 'Shop by goal',
    items: [
      {label: 'Bestsellers', href: '/shop?collection=bestsellers', description: 'The kits customers choose most'},
      {label: 'Instagram Growth Kits', href: '/collections/col-social', description: 'Posts, stories and carousel systems'},
      {label: 'Starter Kits', href: '/collections/col-launch', description: 'Everything needed to launch quickly'},
      {label: 'New Arrivals', href: '/shop?collection=new-arrivals', description: 'Recently added to the library'},
    ],
  },
  help: {
    label: 'Help',
    intro: 'Before and after purchase',
    items: [
      {label: 'How delivery works', href: '/help#delivery', description: 'From payment to template access'},
      {label: 'Payment & verification', href: '/help#payments', description: 'UPI references and approval times'},
      {label: 'Frequently asked questions', href: '/help#faqs', description: 'Quick answers about every kit'},
      {label: 'Contact support', href: '/help#contact', description: 'Get help with an order or download'},
    ],
  },
};

export function BrandLockup({showTagline = true, variant = 'dark', preload = false}: {showTagline?: boolean; variant?: 'dark' | 'light'; preload?: boolean}) {
  const wordmarkSrc = variant === 'light'
    ? '/assets/logos/anykitlab-wordmark-light.svg'
    : '/assets/logos/anykitlab-wordmark-dark.svg';
  const logoSrc = variant === 'light'
    ? '/assets/logos/anykitlab-logo-dark-background.svg'
    : '/assets/logos/anykitlab-logo-light-background.svg';

  return (
    <span className={`brand-lockup brand-lockup-${variant}`} aria-label="AnyKit Lab">
      <span className="brand-artwork">
        <span className="brand-symbol" aria-hidden="true">
          <Image className="brand-symbol-source" src={logoSrc} width={72} height={72} alt="" preload={preload} unoptimized />
        </span>
        <Image className="brand-logo" src={wordmarkSrc} width={220} height={48} alt="AnyKit Lab" preload={preload} unoptimized />
      </span>
      {showTagline && <small>TOOLS TO BUILD. KITS TO LAUNCH.</small>}
    </span>
  );
}

function FooterIcon({name}: {name: 'instagram' | 'youtube' | 'pinterest' | 'email'}) {
  return (
    <Image
      className="footer-social-icon"
      src={`/assets/footer-icons/${name}.svg`}
      width={20}
      height={20}
      alt=""
      aria-hidden="true"
      unoptimized
    />
  );
}

function Header() {
  const {cart, customer} = useStore();
  const path = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuName | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveMenu(null);
        setMobileOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (path.startsWith('/admin')) return null;
  const count = cart.reduce((total, item) => total + item.qty, 0);
  const customerName = customer?.name.trim() || customer?.email.split('@')[0] || '';
  const firstName = customerName.split(/\s+/)[0];
  const initials = customerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'AK';
  const closeNavigation = () => {
    setMobileOpen(false);
    setActiveMenu(null);
  };

  return (
    <header className="store-header" ref={headerRef}>
      <Link href="/" className="store-brand" aria-label="AnyKit Lab home" onClick={closeNavigation}>
        <BrandLockup preload />
      </Link>
      <nav className={mobileOpen ? 'open' : ''} aria-label="Main navigation">
        <Link className={path === '/shop' ? 'active' : ''} href="/shop" onClick={closeNavigation}>Shop All</Link>
        {(Object.keys(navigation) as MenuName[]).map(name => {
          const menu = navigation[name];
          const expanded = activeMenu === name;
          return (
            <div className={`store-nav-item ${expanded ? 'open' : ''}`} key={name}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`nav-${name}`}
                onClick={() => setActiveMenu(current => current === name ? null : name)}
              >
                {menu.label}<ChevronDown aria-hidden="true" />
              </button>
              <div className="store-dropdown" id={`nav-${name}`}>
                <small>{menu.intro}</small>
                <div>
                  {menu.items.map(item => (
                    <Link href={item.href} key={`${name}-${item.label}`} onClick={closeNavigation}>
                      <span>{item.label}</span>
                      <small>{item.description}</small>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      <form className="store-search" action="/shop">
        <input name="q" aria-label="Search products" placeholder="Search kits, categories..." />
        <button aria-label="Search" title="Search the template catalog"><Search aria-hidden="true" /></button>
      </form>
      <div className="store-actions">
        {customer ? (
          <Link className="customer-profile-link" href="/account/profile" aria-label={`View ${customerName}'s profile`} onClick={closeNavigation}>
            <span className="customer-avatar" aria-hidden="true">{initials}</span>
            <span className="customer-identity"><strong>{firstName}</strong><small>View profile</small></span>
          </Link>
        ) : (
          <Link className="guest-account-link" href="/login" aria-label="Sign in" onClick={closeNavigation}>
            <UserRound aria-hidden="true" /><span>Account</span>
          </Link>
        )}
        <Link href="/cart" aria-label={`Cart with ${count} items`} onClick={closeNavigation}>
          <ShoppingCart aria-hidden="true" /><span>Cart</span><b>{count}</b>
        </Link>
        <button
          className="store-menu"
          type="button"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => {
            setMobileOpen(value => !value);
            setActiveMenu(null);
          }}
        >
          {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}

const footerGroups = [
  ['Shop', [['Shop All Kits', '/shop'], ['Bestsellers', '/shop?collection=bestsellers'], ['New Arrivals', '/shop?collection=new-arrivals'], ['Starter Kits', '/collections/col-launch'], ['All Collections', '/shop']]],
  ['Categories', [['Fitness & Wellness', '/categories/fitness'], ['Beauty & Service', '/categories/beauty'], ['Auto Detailing', '/categories/automotive'], ['Food & Hospitality', '/categories/food'], ['Real Estate', '/categories/real-estate'], ['Coaches & Consultants', '/categories/coaching']]],
  ['Account', [['Account Overview', '/account'], ['My Orders', '/account/orders'], ['My Kits', '/account/kits'], ['Profile Details', '/account/profile']]],
  ['Delivery', [['How Delivery Works', '/help#delivery'], ['Payment & Verification', '/help#payments'], ['Access & Download', '/account/downloads']]],
  ['Support', [['Contact Us', '/help#contact'], ['FAQs', '/help#faqs'], ['How to Use', '/help'], ['Request a Kit', '/help#contact']]],
  ['Legal', [['Terms of Use', '/terms'], ['Privacy Policy', '/privacy'], ['Refund Policy', '/refunds']]],
] as const;

function Footer() {
  const path = usePathname();
  if (path.startsWith('/admin')) return null;

  return (
    <footer className="store-footer">
      <div className="store-footer-inner">
        <div className="footer-brand">
          <BrandLockup showTagline={false} />
          <p>Practical template kits and launch assets for small businesses, creators, founders and service providers.</p>
          <div className="social-links" aria-label="Social links">
            <a className="instagram" href="https://www.instagram.com/anykitlab" target="_blank" rel="noreferrer" aria-label="Instagram" title="Follow AnyKit Lab on Instagram"><FooterIcon name="instagram" /><span>Instagram</span></a>
            <a className="youtube" href="https://www.youtube.com/@anykitlab" target="_blank" rel="noreferrer" aria-label="YouTube" title="Watch AnyKit Lab on YouTube"><FooterIcon name="youtube" /><span>YouTube</span></a>
            <a className="pinterest" href="https://www.pinterest.com/anykitlab" target="_blank" rel="noreferrer" aria-label="Pinterest" title="Browse AnyKit Lab on Pinterest"><FooterIcon name="pinterest" /><span>Pinterest</span></a>
            <a className="email" href="mailto:support@anykitlab.com" aria-label="Email AnyKit Lab" title="Email AnyKit Lab"><FooterIcon name="email" /><span>Email</span></a>
          </div>
        </div>
        {footerGroups.map(([title, items]) => (
          <div className="footer-group" key={title}>
            <b>{title}</b>
            {items.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
          </div>
        ))}
      </div>
      <small className="footer-copy">© 2026 AnyKit Lab. All rights reserved.</small>
    </footer>
  );
}

export function AppShell({children}: {children: React.ReactNode}) {
  return <StoreProvider><a className="skip-link" href="#main-content">Skip to content</a><Header /><main id="main-content">{children}</main><Footer /></StoreProvider>;
}

export function ProductArt({p, large = false, compact = false}: {p: Product; large?: boolean; compact?: boolean}) {
  if (p.coverUrl) {
    return (
      <div
        className={`reference-art product-image ${large ? 'large' : ''} ${compact ? 'compact' : ''}`}
        style={{'--product-accent': p.accent, '--product-dark': p.dark} as React.CSSProperties}
      >
        <img
          src={p.coverUrl}
          alt={p.title}
          loading="lazy"
          style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit'}}
        />
      </div>
    );
  }
  return (
    <div
      className={`reference-art product-placeholder ${large ? 'large' : ''} ${compact ? 'compact' : ''}`}
      style={{'--product-accent': p.accent, '--product-dark': p.dark} as React.CSSProperties}
      role="img"
      aria-label={`${p.title} artwork coming soon`}
    >
      <span className="placeholder-kicker">{p.category}</span>
      <strong>{p.title}</strong>
      <span className="placeholder-status">COVER VISUAL COMING SOON</span>
      <span className="preview-note">{p.count}</span>
    </div>
  );
}

export function AddButton({slug, label = 'Add to Cart'}: {slug: string; label?: string}) {
  const {add} = useStore();
  const [done, setDone] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <button
      className="kit-btn"
      type="button"
      onClick={() => {
        add(slug);
        setDone(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? 'Added ✓' : label}
    </button>
  );
}

export function ProductCard({p, index = 0}: {p: Product; index?: number}) {
  return (
    <article className="reference-card" style={{'--delay': `${index * 55}ms`} as React.CSSProperties}>
      <Link className="card-image" href={`/products/${p.slug}`}>
        <ProductArt p={p} />
      </Link>
      <div className="card-info">
        <span className="card-category">{p.category}</span>
        <Link href={`/products/${p.slug}`}><h3>{p.title}</h3></Link>
        <p>{p.description}</p>
        <strong>{money(p.price)}</strong>
        <div className="card-meta"><span>{p.layoutCount}+ Layouts</span><span>Ready to edit</span></div>
        <div className="card-actions">
          <Link className="view-kit" href={`/products/${p.slug}`}>View Kit</Link>
          <AddButton slug={p.slug} />
        </div>
      </div>
    </article>
  );
}

export function PageHead({eyebrow, title, copy}: {eyebrow: string; title: string; copy?: string}) {
  return (
    <section className="reference-head">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      {copy && <p>{copy}</p>}
    </section>
  );
}
