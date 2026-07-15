'use client';

import {FormEvent, useEffect, useState} from 'react';
import Link from 'next/link';
import {ProductArt} from '@/components/site';
import {money} from '@/lib/data';
import {cartTotal, type Order, useStore} from '@/lib/store';

const UPI_ID = 'anykitlab@upi';

export default function Checkout() {
  const {cart, products, place, customer, ready} = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const total = cartTotal(cart, products);

  useEffect(() => {
    if (ready && !customer) window.location.replace(`/login?next=${encodeURIComponent('/checkout')}`);
  }, [customer, ready]);

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(`Copy failed. Enter ${UPI_ID} manually in your UPI app.`);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer) {
      setError('Sign in before submitting your order.');
      return;
    }
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      setOrder(await place({
        total,
        items: cart,
        reference: String(form.get('reference')),
        name: String(form.get('name')),
        email: customer.email,
        phone: String(form.get('phone')),
      }));
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit the order.');
      setSubmitting(false);
    }
  }

  if (!ready || !customer) {
    return <section className="empty-cart"><span>◇</span><h2>Checking your account…</h2><p>Checkout requires a customer account so your purchase can be delivered securely.</p><Link className="primary-action" href="/login?next=%2Fcheckout">Sign in →</Link></section>;
  }

  if (order) {
    return (
      <div className="confirmation-page">
        <div className="breadcrumbs"><span>Home</span><b>›</b><span>Checkout</span><b>›</b><span>Order Submitted</span></div>
        <section className="confirmation-card">
          <div className="confirmation-check">✓</div>
          <h1>Order Submitted Successfully</h1>
          <p>We received your transaction reference. The payment is awaiting manual verification.</p>
          <div className="confirmation-order">
            <span>Order Number<strong>{order.id}</strong></span>
            <div className="confirmation-columns">
              <section><h2>Customer Details</h2><span>♙ {order.name}</span><span>✉ {order.email}</span><span>⌕ {order.phone}</span></section>
              <section><h2>Order Summary ({order.items.length} items)</h2>{order.items.map(item => {const product = products.find(candidate => candidate.slug === item.slug); if (!product) return null; return <div key={item.slug}><div className="confirmation-product-art"><ProductArt p={product} compact /></div><span>{product.title}<small>Digital kit · Qty {item.qty}</small></span><b>{money(product.price * item.qty)}</b></div>;})}</section>
            </div>
            <div className="confirmation-details"><span>▧ Order Amount <b>{money(order.total)}</b></span><span>▤ Payment Method <b>UPI</b></span><span># Transaction Reference <b>{order.reference}</b></span><span>◷ Submitted On <b>{order.date}</b></span><span>◴ Payment Status <em>Awaiting verification</em></span></div>
          </div>
          <div className="confirmation-actions"><Link href="/account/orders">View My Orders</Link><Link href="/shop">Continue Shopping</Link></div>
          <small>Track verification and access from your signed-in customer account.</small>
        </section>
      </div>
    );
  }

  if (!cart.length) {
    return <section className="empty-cart"><span>◇</span><h2>There&apos;s nothing to check out.</h2><p>Add a template kit to your cart first.</p><Link className="primary-action" href="/shop">Shop template kits →</Link></section>;
  }

  return (
    <div className="checkout-page">
      <div className="breadcrumbs"><span>Home</span><b>›</b><span>Checkout</span></div>
      <header className="checkout-title"><h1>Checkout</h1><p>Pay by UPI and submit the exact transaction reference for review.</p><Link href="/cart">← Back to Cart</Link><span>PRACTICAL BY DESIGN.<br />BUILT FOR BUILDERS.</span></header>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-form-column">
          <section className="checkout-card">
            <h2><b>01</b> Customer Information</h2>
            <div className="checkout-fields"><label>Full Name *<input name="name" required defaultValue={customer.name} autoComplete="name" /></label><label>Email Address *<input name="email" type="email" value={customer.email} readOnly /><small>This order will be attached to your signed-in account.</small></label><label>Phone Number *<span><b>+91</b><input name="phone" type="tel" required defaultValue={customer.phone} autoComplete="tel" placeholder="Enter your phone number" /></span></label></div>
          </section>
          <section className="checkout-card payment-card">
            <h2><b>02</b> Payment via UPI <strong>UPI</strong></h2>
            <p>Pay the exact amount in your preferred UPI app, then paste the completed transaction reference below.</p>
            <div className="amount-due">Amount to Pay<strong>{money(total)}</strong></div>
            <div className="upi-payment"><div><span>UPI payment</span><div className="qr" aria-label="UPI app payment instructions">Open your UPI app</div><small>Do not submit before payment succeeds.</small></div><div><span>Pay using this UPI ID</span><label><b>{UPI_ID}</b><button type="button" onClick={copyUpiId}>{copied ? 'Copied ✓' : 'Copy'}</button></label><ul><li>Open any trusted UPI app</li><li>Enter the UPI ID shown above</li><li>Pay exactly {money(total)}</li><li>Copy the completed transaction reference</li></ul></div></div>
            <label className="reference-field">UPI Transaction / Reference ID *<input name="reference" required minLength={6} maxLength={40} pattern="[A-Za-z0-9-]+" autoComplete="off" placeholder="Enter UTR / Reference ID" /></label>
            <label className="checkout-consent"><input type="checkbox" required />I confirm that this is a digital product and that the transaction reference belongs to the payment above.</label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="submit-order" type="submit" disabled={submitting}>{submitting ? 'Submitting order…' : 'Submit Order　→'}</button>
            <small className="checkout-secure">Your price is verified again on the server before the order is created.</small>
          </section>
        </div>
        <aside className="checkout-summary">
          <div className="checkout-summary-title"><h2>Order Summary</h2><Link href="/cart">Edit Cart</Link></div>
          {cart.map(item => {const product = products.find(candidate => candidate.slug === item.slug); if (!product) return null; return <div className="checkout-summary-item" key={item.slug}><div className="checkout-item-art"><ProductArt p={product} compact /></div><span>{product.title}<small>Qty: {item.qty}</small></span><b>{money(product.price * item.qty)}</b></div>;})}
          <div className="checkout-totals"><span>Subtotal <b>{money(total)}</b></span><span>Total <b>{money(total)}</b></span><small>All displayed prices are in INR.</small></div>
          <section><h3>What happens next?</h3><span><b>1</b> Order received<small>Your reference is saved with your account.</small></span><span><b>2</b> Manual verification<small>The payment and amount are checked.</small></span><span><b>3</b> Account access<small>Your order status and delivery details appear in your account.</small></span></section>
          <section><h3>Important Notes</h3><p>○ This is a digital product. No physical items will be shipped.</p><p>○ Submit each UPI reference only once.</p><p>○ Keep your Order ID when contacting support.</p></section>
          <section><h3>Need Help?</h3><p>✉ support@anykitlab.com</p><Link href="/help#contact">Contact Support</Link></section>
        </aside>
      </form>
    </div>
  );
}
