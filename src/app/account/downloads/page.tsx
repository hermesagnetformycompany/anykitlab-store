'use client';

import Link from 'next/link';
import {Download, ExternalLink, FileCheck2, PackageSearch} from 'lucide-react';
import {useStore} from '@/lib/store';

export default function DownloadsPage() {
  const {customer, orders, products} = useStore();
  const verifiedSlugs = new Set(
    customer
      ? orders
          .filter(order => order.email.toLowerCase() === customer.email.toLowerCase() && (order.status === 'Verified' || order.status === 'Access sent'))
          .flatMap(order => order.items.map(item => item.slug))
      : [],
  );
  const availableProducts = products.filter(product => verifiedSlugs.has(product.slug));

  return (
    <>
      <div className="account-page-heading"><div><span>ACCESS CENTRE</span><h2>Downloads & Access</h2><p>Approved files, Canva links and setup guides live here.</p></div></div>
      <section className="account-panel access-list">
        {availableProducts.length ? availableProducts.map(product => (
          <article key={product.slug}><FileCheck2 aria-hidden="true" /><div><h3>{product.title}</h3><p>Access active · Updated {product.updatedAt}</p></div><span><button type="button"><ExternalLink aria-hidden="true" />Open Canva</button><button type="button"><Download aria-hidden="true" />Download guide</button></span></article>
        )) : <div className="account-empty-state account-empty-large"><PackageSearch aria-hidden="true" /><div><h3>No downloads available yet</h3><p>Access links will appear after a purchase has been verified.</p></div><Link href="/shop">Browse kits</Link></div>}
      </section>
      <p className="account-footnote">Missing a purchase? <Link href="/help#contact">Contact support with your order number.</Link></p>
    </>
  );
}
