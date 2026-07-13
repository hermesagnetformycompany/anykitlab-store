'use client';

import Link from 'next/link';
import {PackageSearch, Search} from 'lucide-react';
import {money} from '@/lib/data';
import {useStore} from '@/lib/store';

type OrderRow = readonly [string, string, number, string, string];

export default function OrdersPage() {
  const {customer, orders} = useStore();
  const rows: OrderRow[] = customer
    ? orders
        .filter(order => order.email.toLowerCase() === customer.email.toLowerCase())
        .map(order => [order.id, order.date, order.total, 'UPI', order.status])
    : [];

  return (
    <>
      <div className="account-page-heading"><div><span>ORDER HISTORY</span><h2>My Orders</h2><p>Track payment verification and review your purchases.</p></div></div>
      <div className="orders-tools"><label><span className="sr-only">Search orders</span><input placeholder="Search by order number" /><Search aria-hidden="true" /></label><select aria-label="Order date"><option>All Dates</option><option>Last 30 days</option></select><select aria-label="Order status"><option>All Statuses</option><option>Verified</option><option>Pending</option></select></div>
      {rows.length ? (
        <>
          <div className="orders-table-wrap"><table className="orders-table"><thead><tr><th>Order Number</th><th>Date</th><th>Amount</th><th>Payment Method</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map(([id, date, amount, method, status]) => <tr key={id}><td>{id}</td><td>{date}</td><td>{money(amount)}</td><td>{method}</td><td><span className={`order-status ${status.toLowerCase().includes('pending') ? 'pending' : ''}`}>{status}</span></td><td><button type="button">View details</button></td></tr>)}</tbody></table></div>
          <div className="orders-pagination"><span>Showing {rows.length} {rows.length === 1 ? 'order' : 'orders'}</span></div>
        </>
      ) : (
        <section className="account-panel account-empty-state account-empty-large"><PackageSearch aria-hidden="true" /><div><h3>No orders yet</h3><p>Your purchases and payment-verification updates will appear here.</p></div><Link href="/shop">Browse kits</Link></section>
      )}
    </>
  );
}
