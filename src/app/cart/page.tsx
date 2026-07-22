'use client';

import Link from 'next/link';
import {ShoppingCart} from 'lucide-react';
import {ProductArt} from '@/components/site';
import {money} from '@/lib/data';
import {cartTotal, useStore} from '@/lib/store';

export default function Cart() {
  const {ready, cart, products, setQty, remove} = useStore();
  const subtotal = cartTotal(cart, products);
  const total = subtotal;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="cart-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><b aria-hidden="true">›</b><span aria-current="page">Cart</span></nav>
      <header className="simple-page-title"><h1>Your Cart</h1><p>Review your selected template kits before checkout.</p></header>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{ready ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'} in your cart.` : 'Loading your cart.'}</p>
      {!ready ? (
        <section className="empty-cart" aria-busy="true"><ShoppingCart aria-hidden="true" /><h2>Loading your cart…</h2><p>Restoring your saved template kits.</p></section>
      ) : !cart.length ? (
        <section className="empty-cart"><ShoppingCart aria-hidden="true" /><h2>Your cart is waiting.</h2><p>Choose a ready-made kit and come back when you&apos;re ready.</p><Link className="primary-action" href="/shop">Explore template kits →</Link></section>
      ) : (
        <>
          <div className="cart-grid">
            <section className="cart-items-card">
              <h2>{itemCount} {itemCount === 1 ? 'Item' : 'Items'} in Cart</h2>
              {cart.map(item => {
                const product = products.find(candidate => candidate.slug === item.slug);
                if (!product) return null;
                return (
                  <article className="cart-line" key={item.slug}>
                    <Link href={`/products/${product.slug}`} className="cart-line-image"><ProductArt p={product} compact /></Link>
                    <div className="cart-line-copy"><h3>{product.title}</h3><span>▧ {product.category}</span><button type="button" aria-label={`Remove ${product.title} from cart`} onClick={() => remove(item.slug)}>♧ Remove</button></div>
                    <div className="cart-line-price"><strong>{money(product.price)}</strong><div><button type="button" aria-label={`Decrease quantity of ${product.title}`} onClick={() => setQty(item.slug, item.qty - 1)}>−</button><b aria-live="polite" aria-atomic="true">{item.qty}</b><button type="button" aria-label={`Increase quantity of ${product.title}`} onClick={() => setQty(item.slug, item.qty + 1)}>+</button></div><strong>{money(product.price * item.qty)}</strong></div>
                  </article>
                );
              })}
            </section>
            <aside className="cart-summary">
              <h2>Order Summary</h2>
              <div><span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span><b>{money(subtotal)}</b></div>
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
