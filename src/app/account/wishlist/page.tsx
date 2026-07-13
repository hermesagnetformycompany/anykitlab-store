'use client';

import Link from 'next/link';
import {Heart} from 'lucide-react';
import {ProductCard} from '@/components/site';
import {useStore} from '@/lib/store';

export default function WishlistPage() {
  const {products, wishlist} = useStore();
  const savedProducts = products.filter(product => wishlist.includes(product.slug));

  return (
    <>
      <div className="account-page-heading"><div><span>SAVED FOR LATER</span><h2>Wishlist</h2><p>Keep promising kits close until you are ready to purchase.</p></div></div>
      {savedProducts.length ? <div className="catalog-products">{savedProducts.map((product, index) => <ProductCard key={product.slug} p={product} index={index} />)}</div> : <section className="account-panel account-empty-state account-empty-large"><Heart aria-hidden="true" /><div><h3>Your wishlist is empty</h3><p>Use the save button on a product page to build your shortlist.</p></div><Link href="/shop">Explore all kits</Link></section>}
    </>
  );
}
