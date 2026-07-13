'use client';

import Link from 'next/link';
import {ArrowRight, Clock3, Download, Heart, PackageCheck} from 'lucide-react';
import {money} from '@/lib/data';
import {useStore} from '@/lib/store';

export default function AccountOverview() {
  const {customer, orders, wishlist} = useStore();
  const customerOrders = customer
    ? orders.filter(order => order.email.toLowerCase() === customer.email.toLowerCase())
    : [];
  const latestOrder = customerOrders[0];
  const activeKits = new Set(
    customerOrders
      .filter(order => order.status === 'Verified' || order.status === 'Access sent')
      .flatMap(order => order.items.map(item => item.slug)),
  ).size;

  return (
    <>
      <div className="account-page-heading"><div><span>ACCOUNT OVERVIEW</span><h2>Your customer dashboard</h2><p>Quick access to everything connected to your purchases.</p></div></div>
      <section className="account-summary-grid">
        <article><PackageCheck aria-hidden="true" /><span><small>Total orders</small><b>{customerOrders.length}</b></span><Link href="/account/orders">View orders <ArrowRight aria-hidden="true" /></Link></article>
        <article><Download aria-hidden="true" /><span><small>Active kits</small><b>{activeKits}</b></span><Link href="/account/kits">Open library <ArrowRight aria-hidden="true" /></Link></article>
        <article><Clock3 aria-hidden="true" /><span><small>Awaiting verification</small><b>{customerOrders.filter(order => order.status === 'Pending verification').length}</b></span><Link href="/account/orders">Track status <ArrowRight aria-hidden="true" /></Link></article>
        <article><Heart aria-hidden="true" /><span><small>Saved kits</small><b>{wishlist.length}</b></span><Link href="/account/wishlist">View wishlist <ArrowRight aria-hidden="true" /></Link></article>
      </section>
      <section className="account-panel account-latest-order">
        <header><div><span>RECENT ACTIVITY</span><h2>Latest order</h2></div><Link href="/account/orders">View all orders <ArrowRight aria-hidden="true" /></Link></header>
        {latestOrder ? (
          <div className="latest-order-row">
            <span><small>Order</small><b>{latestOrder.id}</b></span>
            <span><small>Date</small><b>{latestOrder.date}</b></span>
            <span><small>Total</small><b>{money(latestOrder.total)}</b></span>
            <span><small>Status</small><em>{latestOrder.status}</em></span>
          </div>
        ) : (
          <div className="account-empty-state"><PackageCheck aria-hidden="true" /><div><h3>No recent orders yet</h3><p>Your order history and verification updates will appear here.</p></div><Link href="/shop">Browse kits</Link></div>
        )}
      </section>
      <section className="account-panel account-next-steps">
        <header><div><span>QUICK LINKS</span><h2>What would you like to do?</h2></div></header>
        <div><Link href="/account/profile"><b>Update profile details</b><small>Keep your delivery email and phone number current.</small><ArrowRight aria-hidden="true" /></Link><Link href="/account/downloads"><b>Check template access</b><small>Open approved kits and download instructions.</small><ArrowRight aria-hidden="true" /></Link><Link href="/help#contact"><b>Get order support</b><small>Contact us about verification, access or a purchase.</small><ArrowRight aria-hidden="true" /></Link></div>
      </section>
    </>
  );
}
