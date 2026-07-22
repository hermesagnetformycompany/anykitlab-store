'use client';

import Link from 'next/link';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {ProductArt} from '@/components/site';
import {money} from '@/lib/data';
import {cartTotal, type Order, useStore} from '@/lib/store';

type PaymentIntent = {
  id: string;
  orderNumber: string;
  total: number;
  status: 'Awaiting payment';
  upiId: string;
  payeeName: string;
  reference: string;
  uri: string;
  qrDataUrl: string;
  createdAt: string;
  items: {slug: string; title: string; qty: number; unitPrice: number; lineTotal: number}[];
};

const paymentIntentStorageKey = 'ak-payment-intent';
const checkoutKeyStorageKey = 'ak-checkout-key';

function readPaymentIntent(): PaymentIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(paymentIntentStorageKey);
    return stored ? JSON.parse(stored) as PaymentIntent : null;
  } catch {
    return null;
  }
}

function readCheckoutKey() {
  if (typeof window === 'undefined') return '';
  const stored = sessionStorage.getItem(checkoutKeyStorageKey) || '';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)) return stored;
  const key = crypto.randomUUID();
  sessionStorage.setItem(checkoutKeyStorageKey, key);
  return key;
}

export default function Checkout() {
  const {cart, products, recordOrder, customer, ready} = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [intent, setIntent] = useState<PaymentIntent | null>(readPaymentIntent);
  const [checkoutKey, setCheckoutKey] = useState(readCheckoutKey);
  const [error, setError] = useState('');
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [submittingReference, setSubmittingReference] = useState(false);
  const [copied, setCopied] = useState(false);
  const paymentHeadingRef = useRef<HTMLHeadingElement>(null);
  const confirmationHeadingRef = useRef<HTMLHeadingElement>(null);
  const total = intent?.total ?? cartTotal(cart, products);

  useEffect(() => {
    if (ready && !customer) window.location.replace(`/login?next=${encodeURIComponent('/checkout')}`);
  }, [customer, ready]);

  useEffect(() => {
    if (intent) paymentHeadingRef.current?.focus();
  }, [intent]);

  useEffect(() => {
    if (order) confirmationHeadingRef.current?.focus();
  }, [order]);

  useEffect(() => {
    if (!ready || !intent) return;
    const currentItems = cart.map(item => `${item.slug}:${item.qty}`).sort();
    const intentItems = intent.items.map(item => `${item.slug}:${item.qty}`).sort();
    if (currentItems.length === intentItems.length && currentItems.every((item, index) => item === intentItems[index])) return;

    const resetTimer = window.setTimeout(() => {
      window.sessionStorage.removeItem(paymentIntentStorageKey);
      window.sessionStorage.removeItem(checkoutKeyStorageKey);
      setIntent(null);
      setCheckoutKey(readCheckoutKey());
      setError('Your cart changed, so the previous payment request was retired. Create a new request for the current cart.');
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [cart, intent, ready]);

  async function copyUpiId() {
    if (!intent) return;
    try {
      await navigator.clipboard.writeText(intent.upiId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Copy failed. Select the UPI ID manually.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer) {
      setError('Sign in before continuing to payment.');
      return;
    }

    const form = new FormData(event.currentTarget);
    setError('');

    if (!intent) {
      setCreatingIntent(true);
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            name: String(form.get('name') || '').trim(),
            email: customer.email,
            phone: String(form.get('phone') || '').trim(),
            items: cart,
            checkoutKey,
          }),
        });
        const payload = await response.json() as {paymentIntent?: PaymentIntent; error?: string; code?: string};
        if (!response.ok || !payload.paymentIntent) {
          if (payload.code === 'CHECKOUT_KEY_CLOSED') {
            window.sessionStorage.removeItem(paymentIntentStorageKey);
            window.sessionStorage.removeItem(checkoutKeyStorageKey);
            setIntent(null);
            setCheckoutKey(readCheckoutKey());
          }
          throw new Error(payload.error || 'Unable to create the payment request.');
        }
        setIntent(payload.paymentIntent);
        sessionStorage.setItem(paymentIntentStorageKey, JSON.stringify(payload.paymentIntent));
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Unable to create the payment request.');
      } finally {
        setCreatingIntent(false);
      }
      return;
    }

    const reference = String(form.get('reference') || '').trim();
    setSubmittingReference(true);
    try {
      const response = await fetch(`/api/orders/${intent.id}/payment-reference`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({reference}),
      });
      const payload = await response.json() as {order?: Order; error?: string};
      if (!response.ok || !payload.order) throw new Error(payload.error || 'Unable to submit the payment reference.');
      recordOrder(payload.order);
      setOrder(payload.order);
      sessionStorage.removeItem(paymentIntentStorageKey);
      sessionStorage.removeItem(checkoutKeyStorageKey);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit the payment reference.');
    } finally {
      setSubmittingReference(false);
    }
  }

  if (!ready || !customer) return <div className="auth-loading">Preparing secure checkout…</div>;

  if (order) {
    return (
      <div className="confirmation-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><b aria-hidden="true">›</b><Link href="/checkout">Checkout</Link><b aria-hidden="true">›</b><span aria-current="page">Order submitted</span></nav>
        <section className="confirmation-hero" role="status" aria-live="polite">
          <div className="confirmation-check">✓</div><span>Order submitted</span><h1 ref={confirmationHeadingRef} tabIndex={-1}>Thank you, {order.name.split(' ')[0]}.</h1><p>Your UPI reference has been submitted for manual verification. Access is not released until the payment is confirmed.</p><b>{order.id}</b>
        </section>
        <section className="confirmation-columns">
          <div>
            <h2>What happens next?</h2>
            <ol><li><b>We verify your payment.</b><span>The amount and UPI reference are checked manually.</span></li><li><b>Your status is updated.</b><span>Follow the order from your signed-in account.</span></li><li><b>Your access is released.</b><span>Verified digital kits appear in your library.</span></li></ol>
          </div>
          <div>
            <h2>Order Summary</h2>
            <div className="confirmation-details"><span>▧ Order Amount <b>{money(order.total)}</b></span><span>▤ Payment Method <b>UPI</b></span><span># Transaction Reference <b>{order.reference}</b></span><span>◷ Submitted On <b>{order.date}</b></span><span>◴ Payment Status <em>Awaiting verification</em></span></div>
          </div>
          <div className="confirmation-actions"><Link href="/account/orders">View My Orders</Link><Link href="/shop">Continue Shopping</Link></div>
          <small>Track verification and access from your signed-in customer account.</small>
        </section>
      </div>
    );
  }

  if (!cart.length && !intent) {
    return <section className="empty-cart"><span>◇</span><h2>There&apos;s nothing to check out.</h2><p>Add a template kit to your cart first.</p><Link className="primary-action" href="/shop">Shop template kits →</Link></section>;
  }

  const summaryItems = intent?.items ?? cart.flatMap(item => {
    const product = products.find(candidate => candidate.slug === item.slug);
    return product ? [{slug: item.slug, title: product.title, qty: item.qty, unitPrice: product.price, lineTotal: product.price * item.qty}] : [];
  });

  return (
    <div className="checkout-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><b aria-hidden="true">›</b><span aria-current="page">Checkout</span></nav>
      <header className="checkout-title"><h1>Checkout</h1><p>Create an order-specific UPI QR, pay the exact locked amount, then submit the completed transaction reference.</p>{intent ? <span>ORDER LOCKED<br />{intent.orderNumber}</span> : <Link href="/cart">← Back to Cart</Link>}</header>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{creatingIntent ? 'Creating your secure order and payment QR.' : submittingReference ? 'Submitting your payment reference for verification.' : copied ? 'UPI ID copied.' : intent ? `Secure payment QR created for order ${intent.orderNumber}.` : ''}</p>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-form-column">
          <section className="checkout-card">
            <h2><b>01</b> Customer Information</h2>
            <div className="checkout-fields"><label>Full Name *<input name="name" required disabled={Boolean(intent)} defaultValue={customer.name} autoComplete="name" /></label><label>Email Address *<input name="email" type="email" value={customer.email} readOnly /><small>This order is attached to your signed-in account.</small></label><label>Phone Number *<span><b>+91</b><input name="phone" type="tel" required disabled={Boolean(intent)} defaultValue={customer.phone} autoComplete="tel" placeholder="Enter your phone number" /></span></label></div>
          </section>
          <section className="checkout-card payment-card">
            <h2 ref={paymentHeadingRef} tabIndex={-1}><b>02</b> Pay securely with UPI <strong>UPI</strong></h2>
            <p>{intent ? 'This QR is tied to the immutable server-created order below.' : 'Create the secure payment request first. The server will verify products and lock the exact amount.'}</p>
            <div className="amount-due">{intent ? 'Exact locked amount' : 'Cart amount before server verification'}<strong>{money(total)}</strong></div>
            {intent ? <div className="upi-payment">
              <div className="upi-qr-panel">
                <span>Scan to pay</span>
                {/* A data URL from the trusted server is intentionally rendered directly; Next Image does not optimize QR data URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="qr" src={intent.qrDataUrl} alt={`UPI QR to pay ${money(intent.total)} to ${intent.payeeName}`} />
                <a className="upi-open-app" href={intent.uri}>Open UPI app</a>
                <small>On mobile, open a UPI app. On desktop, scan the QR. If no app opens, use the displayed UPI ID, amount, and order reference manually.</small>
              </div>
              <div className="upi-instructions">
                <span>Payee UPI ID</span>
                <label><b>{intent.upiId}</b><button type="button" onClick={copyUpiId}>{copied ? 'Copied' : 'Copy'}</button></label>
                <ul><li>Scan this QR with any UPI app</li><li>Confirm the amount is {money(intent.total)}</li><li>Verify the payee before approving</li><li>Copy the completed UTR or transaction reference</li></ul>
                <small className="upi-quote-reference">Order reference: {intent.orderNumber}</small>
              </div>
            </div> : <div className="payment-intent-callout"><b>No order has been created yet.</b><span>Use the button below to lock the payable amount and generate your order-specific QR.</span></div>}
            {intent && <><label className="reference-field">UPI Transaction / Reference ID *<input name="reference" required minLength={6} maxLength={40} pattern="[A-Za-z0-9-]+" autoComplete="off" placeholder="Enter UTR / Reference ID" /></label><label className="checkout-consent"><input type="checkbox" required />I confirm that this reference belongs to the payment for {intent.orderNumber}. I understand that access remains pending until verification.</label></>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="submit-order" type="submit" disabled={creatingIntent || submittingReference}>{creatingIntent ? 'Creating secure order…' : submittingReference ? 'Submitting reference…' : intent ? 'Submit for verification　→' : 'Create secure payment QR　→'}</button>
            <small className="checkout-secure">The amount and order item snapshots are computed on the server. A submitted UTR is not automatic proof of settlement.</small>
          </section>
        </div>
        <aside className="checkout-summary">
          <div className="checkout-summary-title"><h2>Order Summary</h2>{intent ? <span>Locked</span> : <Link href="/cart">Edit Cart</Link>}</div>
          {summaryItems.map(item => {const product = products.find(candidate => candidate.slug === item.slug); return <div className="checkout-summary-item" key={item.slug}><div className="checkout-item-art">{product ? <ProductArt p={product} compact /> : <span aria-hidden="true">AK</span>}</div><span>{item.title}<small>Qty: {item.qty}</small></span><b>{money(item.lineTotal)}</b></div>;})}
          <div className="checkout-totals"><span>Subtotal <b>{money(total)}</b></span><span>Total <b>{money(total)}</b></span><small>All displayed prices are in INR.</small></div>
          <section><h3>What happens next?</h3><span><b>1</b> Order and amount locked<small>The server snapshots the published products and total.</small></span><span><b>2</b> Manual verification<small>Your UTR and exact payment amount are checked.</small></span><span><b>3</b> Account access<small>Verified digital products appear in your account.</small></span></section>
          <section><h3>Important Notes</h3><p>○ This is a digital product. No physical items will be shipped.</p><p>○ Submit each UPI reference only once.</p><p>○ Keep your Order ID when contacting support.</p></section>
          <section><h3>Need Help?</h3><p>✉ support@anykitlab.com</p><Link href="/help#contact">Contact Support</Link></section>
        </aside>
      </form>
    </div>
  );
}
