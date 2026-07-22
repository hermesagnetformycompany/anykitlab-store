import 'server-only';

import {parseCheckoutItems, type CheckoutItem} from '@/lib/checkout-core';
import {getSupabaseAdminClient} from '@/lib/supabase/admin';

export type CheckoutProductSnapshot = {
  id: string;
  slug: string;
  title: string;
  price: number;
  qty: number;
};

export type CheckoutQuote = {
  items: CheckoutProductSnapshot[];
  total: number;
};

export class CheckoutAvailabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutAvailabilityError';
  }
}

export async function createCheckoutQuote(value: unknown): Promise<CheckoutQuote> {
  const items = parseCheckoutItems(value);
  const admin = getSupabaseAdminClient();
  const slugs = items.map(item => item.slug);
  const {data: products, error} = await admin
    .from('akl_products')
    .select('id,slug,title,price,status')
    .in('slug', slugs)
    .eq('status', 'Published');

  if (error) throw error;
  if (!products || products.length !== slugs.length) {
    throw new CheckoutAvailabilityError('One or more products are no longer available. Refresh your cart before paying.');
  }

  const productsBySlug = new Map(products.map(product => [product.slug, product]));
  const snapshots = (items as CheckoutItem[]).map(item => {
    const product = productsBySlug.get(item.slug);
    if (!product || product.status !== 'Published') {
      throw new CheckoutAvailabilityError('One or more products are no longer available. Refresh your cart before paying.');
    }
    return {id: product.id, slug: product.slug, title: product.title, price: product.price, qty: item.qty};
  });
  const total = snapshots.reduce((sum, item) => sum + item.price * item.qty, 0);
  if (total <= 0) throw new CheckoutAvailabilityError('The cart total must be greater than zero.');

  return {items: snapshots, total};
}
