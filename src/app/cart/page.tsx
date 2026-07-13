'use client';

import Link from 'next/link';
import {ShoppingCart} from 'lucide-react';
import {ProductArt} from '@/components/site';
import {money} from '@/lib/data';
import {cartTotal, useStore} from '@/lib/store';

export default function Cart() {
  const {cart, products, setQty, remove} = useStore();
  const subtotal = cartTotal(cart, products);
  const discount = cart.length >= 3 ? 299 : 0;
  const total = subtotal - discount;

  return (
    <div className="cart-page">
      <div className="breadcrumbs"><span>Home</span><b>›</b><span>Cart</span></div>
      <header className="simple-page-title"><h1>Your Cart</h1><p>Review your selected template kits before checkout.</p></header>
      {!cart.length ? (
        <section className="empty-cart"><ShoppingCart aria-hidden="true" /><h2>Your cart is waiting.</h2><p>Choose a ready-made kit and come back when you&apos;re ready.</p><Link className="primary-action" href="/shop">Explore template kits →</Link></section>
      ) : (
        <>
          <div className="cart-grid">
            <section className="cart-items-card">
              <h2>{cart.reduce((sum, item) => sum + item.qty, 0)} Items in Cart</h2>
              {cart.map(item => {
                const product = products.find(candidate => candidate.slug === item.slug);
                if (!product) return null;
                return (
                  <article className="cart-line" key={item.slug}>
                    <Link href={`/products/${product.slug}`} className="cart-line-image"><ProductArt p={product} compact /></Link>
                    <div className="cart-line-copy"><h3>{product.title}</h3><span>▧ {product.category}</span><button type="button" onClick={() => remove(item.slug)}>♧ Remove</button></div>
                    <div className="cart-line-price"><strong>{money(product.price)}</strong><div><button type="button" onClick={() => setQty(item.slug, item.qty - 1)}>−</button><b>{item.qty}</b><button type="button" onClick={() => setQty(item.slug, item.qty + 1)}>+</button></div><strong>{money(product.price * item.qty)}</strong></div>
                  </article>
                );
              })}
              <div className="coupon-row"><span>◇ Have a coupon code?</span><label><input placeholder="Enter coupon code" /><button type="button">Apply Coupon</button></label></div>
            </section>
            <aside className="cart-summary">
              <h2>Order Summary</h2>
              <div><span>Subtotal ({cart.reduce((sum, item) => sum + item.qty, 0)} items)</span><b>{money(subtotal)}</b></div>
              {discount > 0 && <div className="discount"><span>Discount</span><b>−{money(discount)}</b></div>}
              <div className="cart-total"><span>Total</span><b>{money(total)}</b></div>
              <small>Inclusive of all taxes</small>
              <Link className="checkout-button" href="/checkout">▣ Proceed to Checkout</Link>
              <span className="secure-note">▧ Secure UPI payment</span>
              <Link className="continue-shopping" href="/shop">← Continue Shopping</Link>
            </aside>
          </div>
          <section className="cart-assurances"><span>◎ <b>Secure UPI Payment</b><small>Pay safely with UPI.</small></span><span>♙ <b>Manual Verification</b><small>Usually within 12–24 hours.</small></span><span>▤ <b>Access After Approval</b><small>Get your files after verification.</small></span></section>
          <section className="digital-order-note"><span>✓ <b>All template kits are digital products.</b><small>No physical items will be shipped.</small></span><span>◇ <b>For personal & commercial use.</b><small>Please read the licence details for each kit.</small></span><span>♧ <b>Need help?</b><small>Our support team is here for you. <Link href="/help">Contact Us →</Link></small></span></section>
        </>
      )}
    </div>
  );
}
