'use client';

import {FormEvent, useState} from 'react';
import Link from 'next/link';
import {ProductArt} from '@/components/site';
import {money} from '@/lib/data';
import {cartTotal, type Order, useStore} from '@/lib/store';

export default function Checkout() {
  const {cart, products, place} = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const total = cartTotal(cart, products);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      setOrder(await place({
        total,
        items: cart,
        reference: String(form.get('reference')),
        name: String(form.get('name')),
        email: String(form.get('email')),
        phone: String(form.get('phone')),
      }));
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit the order.');
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <div className="confirmation-page">
        <div className="breadcrumbs"><span>Home</span><b>›</b><span>Checkout</span><b>›</b><span>Order Confirmed</span></div>
        <section className="confirmation-card">
          <div className="confirmation-check">✓</div>
          <h1>Order Submitted Successfully</h1>
          <p>Thank you for your order! We&apos;ve received your payment reference and it is now awaiting manual verification.</p>
          <div className="confirmation-order">
            <span>Order Number<strong>{order.id}</strong></span>
            <div className="confirmation-columns">
              <section><h2>Customer Details</h2><span>♙ {order.name}</span><span>✉ {order.email}</span><span>⌕ {order.phone}</span></section>
              <section><h2>Order Summary ({order.items.length} items)</h2>{order.items.map(item => {const product = products.find(candidate => candidate.slug === item.slug); if (!product) return null; return <div key={item.slug}><div className="confirmation-product-art"><ProductArt p={product} compact /></div><span>{product.title}<small>Canva Kit</small></span><b>{money(product.price * item.qty)}</b></div>;})}</section>
            </div>
            <div className="confirmation-details"><span>▧ Order Amount <b>{money(order.total)}</b></span><span>▤ Payment Method <b>UPI</b></span><span># Transaction / UPI Reference <b>{order.reference}</b></span><span>◷ Submitted On <b>{order.date}, 10:45 AM</b></span><span>◴ Payment Status <em>Awaiting verification</em></span><span>◷ Expected Processing Time <b>Within 12–24 hours</b></span></div>
          </div>
          <div className="confirmation-actions"><Link href="/account/orders">View My Orders</Link><Link href="/shop">Continue Shopping</Link></div>
          <small>◇ You will receive an email and SMS once your payment is verified.</small>
        </section>
        <section className="confirmation-assurances"><span>✉ <b>Manual Verification</b><small>We verify UPI payments manually within 12–24 hours.</small></span><span>◇ <b>Secure & Safe</b><small>Your payment details are safe and 100% secure.</small></span><span>▣ <b>Need Help?</b><small>Contact us anytime, we&apos;re here to help.</small></span><span>⇩ <b>Access After Approval</b><small>Get access immediately after payment is verified.</small></span></section>
      </div>
    );
  }

  if (!cart.length) {
    return <section className="empty-cart"><span>◇</span><h2>There&apos;s nothing to check out.</h2><p>Add a template kit to your cart first.</p><Link className="primary-action" href="/shop">Shop template kits →</Link></section>;
  }

  return (
    <div className="checkout-page">
      <div className="breadcrumbs"><span>Home</span><b>›</b><span>Checkout</span></div>
      <header className="checkout-title"><h1>Checkout</h1><p>Complete your order and we&apos;ll deliver your digital kit.</p><Link href="/cart">← Back to Cart</Link><span>PRACTICAL BY DESIGN.<br />BUILT FOR BUILDERS.</span></header>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-form-column">
          <section className="checkout-card">
            <h2><b>01</b> Customer Information</h2>
            <div className="checkout-fields"><label>Full Name *<input name="name" required placeholder="Enter your full name" /></label><label>Email Address *<input name="email" type="email" required placeholder="you@example.com" /><small>We&apos;ll send your order details and download links here.</small></label><label>Phone Number *<span><b>+91</b><input name="phone" type="tel" required placeholder="Enter your phone number" /></span></label></div>
            <div className="account-login-note"><span>Have an account? Log in for a faster checkout.<small>Your past orders and downloads will be available.</small></span><Link href="/login">Log In</Link></div>
          </section>
          <section className="checkout-card payment-card">
            <h2><b>02</b> Payment via UPI <strong>UPI</strong></h2>
            <p>Pay the exact amount using any UPI app. Scan the QR code or copy the UPI ID and pay the exact amount shown.</p>
            <div className="amount-due">Amount to Pay<strong>{money(total)}</strong></div>
            <div className="upi-payment"><div><span>Scan & Pay</span><div className="qr" aria-label="UPI QR code" /><small>UPI Transaction / Reference ID *</small></div><div><span>Or pay using UPI ID</span><label><b>anykitlab@upi</b><button type="button">Copy</button></label><ul><li>Open any UPI app</li><li>Scan the QR code or enter the UPI ID</li><li>Enter the exact amount: {money(total)}</li><li>Complete the payment</li></ul></div></div>
            <label className="reference-field">UPI Transaction / Reference ID *<input name="reference" required minLength={6} placeholder="Enter UTR / Reference ID" /></label>
            <label className="payment-upload">Payment Screenshot (Optional)<input name="screenshot" type="file" accept="image/*" /><span>Upload screenshot<small>PNG, JPG up to 5MB</small></span></label>
            <label className="checkout-consent"><input type="checkbox" required />I confirm that this is a digital product. I understand that all sales are final and non-refundable.</label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="submit-order" type="submit" disabled={submitting}>{submitting ? 'Submitting order…' : 'Submit Order　→'}</button>
            <small className="checkout-secure">▧ Secure Checkout · Your data is safe with us.</small>
          </section>
        </div>
        <aside className="checkout-summary">
          <div className="checkout-summary-title"><h2>Order Summary</h2><Link href="/cart">Edit Cart</Link></div>
          {cart.map(item => {const product = products.find(candidate => candidate.slug === item.slug); if (!product) return null; return <div className="checkout-summary-item" key={item.slug}><div className="checkout-item-art"><ProductArt p={product} compact /></div><span>{product.title}<small>Qty: {item.qty}</small></span><b>{money(product.price * item.qty)}</b></div>;})}
          <div className="checkout-totals"><span>Subtotal <b>{money(total)}</b></span><span>Discount <b>—</b></span><span>Total <b>{money(total)}</b></span><small>All prices are in INR and inclusive of applicable taxes.</small></div>
          <section><h3>What happens next?</h3><span><b>1</b> Order Received<small>We&apos;ll confirm your payment and verify your order.</small></span><span><b>2</b> Manual Verification<small>Our team will verify your payment manually.</small></span><span><b>3</b> Access & Download<small>You&apos;ll get access within 12–24 hours.</small></span></section>
          <section><h3>Important Notes</h3><p>○ This is a digital product. No physical items will be shipped.</p><p>○ Access links will be sent to your email after verification.</p><p>○ If you face any issue, contact us with your Order ID.</p></section>
          <section><h3>Need Help?</h3><p>✉ hello@anykitlab.com</p><p>⌕ +91 98765 43210</p><Link href="/help">Contact Support</Link></section>
        </aside>
      </form>
    </div>
  );
}
