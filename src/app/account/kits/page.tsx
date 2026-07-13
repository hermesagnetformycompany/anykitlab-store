'use client';

import Link from 'next/link';
import {Download, ExternalLink, FileText, PackageSearch} from 'lucide-react';
import {ProductArt} from '@/components/site';
import {useStore} from '@/lib/store';

export default function MyKits() {
  const {customer, orders, products} = useStore();
  const customerOrders = customer
    ? orders.filter(order => order.email.toLowerCase() === customer.email.toLowerCase())
    : [];
  const verifiedOrders = customerOrders.filter(order => order.status === 'Verified' || order.status === 'Access sent');
  const kitSlugs = new Set(verifiedOrders.flatMap(order => order.items.map(item => item.slug)));
  const kits = products.filter(product => kitSlugs.has(product.slug));
  const pendingOrders = customerOrders.filter(order => order.status === 'Pending verification').length;

  return (
    <>
      <div className="account-page-heading"><div><span>MY LIBRARY</span><h2>My Kits</h2><p>Access purchased templates and their setup instructions.</p></div></div>
      <div className="kits-stats"><span><Download aria-hidden="true" /><b>Total Kits</b><strong>{kits.length}</strong><small>Available in your library</small></span><span><ExternalLink aria-hidden="true" /><b>Active Access</b><strong>{kits.length}</strong><small>Verified purchases</small></span><span><FileText aria-hidden="true" /><b>Pending Access</b><strong>{pendingOrders}</strong><small>Orders being reviewed</small></span></div>
      <div className="kits-filter"><div><button type="button" className="active">All Kits</button><button type="button">Canva Templates</button><button type="button">Downloadable</button></div><label>Sort by <select><option>Last Updated</option><option>Newest</option></select></label></div>
      {kits.length ? <div className="kit-library">
        {kits.map(product => {
          const sourceOrder = verifiedOrders.find(order => order.items.some(item => item.slug === product.slug));
          return (
            <article key={product.slug}>
              <div className="kit-library-image"><ProductArt p={product} compact /></div>
              <div className="kit-library-main"><span>Active Access · Order: {sourceOrder?.id}</span><h2>{product.title}<em>Canva Template</em></h2><p>{product.description}</p><div><button type="button"><ExternalLink aria-hidden="true" />Open in Canva</button><button type="button"><Download aria-hidden="true" />Download</button><button type="button"><FileText aria-hidden="true" />Instructions</button></div></div>
              <aside><b>License</b><p>Personal and commercial use. No resale or redistribution.</p><Link href="/help">View License →</Link><b>Last Updated</b><p>{product.updatedAt}</p></aside>
            </article>
          );
        })}
      </div> : <section className="account-panel account-empty-state account-empty-large"><PackageSearch aria-hidden="true" /><div><h3>No active kits yet</h3><p>Verified purchases will appear here with their access links and instructions.</p></div><Link href="/shop">Browse kits</Link></section>}
    </>
  );
}
