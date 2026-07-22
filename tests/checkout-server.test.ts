import {beforeEach, describe, expect, it, vi} from 'vitest';

const {eqQuery, inQuery} = vi.hoisted(() => ({eqQuery: vi.fn(), inQuery: vi.fn()}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: () => ({
    from: () => ({
      select: () => ({in: inQuery}),
    }),
  }),
}));

inQuery.mockImplementation(() => ({eq: eqQuery}));

import {CheckoutAvailabilityError, createCheckoutQuote} from '../src/lib/checkout-server';

describe('server checkout quote', () => {
  beforeEach(() => {
    inQuery.mockClear();
    eqQuery.mockReset();
  });

  it('ignores client-supplied prices and uses the canonical published catalog price', async () => {
    eqQuery.mockResolvedValue({
      data: [{id: 'product-1', slug: 'fitness-kit', title: 'Fitness Kit', price: 399, status: 'Published'}],
      error: null,
    });

    const quote = await createCheckoutQuote([{slug: 'fitness-kit', qty: 2, price: 1}]);

    expect(quote.total).toBe(798);
    expect(quote.items).toEqual([{
      id: 'product-1',
      slug: 'fitness-kit',
      title: 'Fitness Kit',
      price: 399,
      qty: 2,
    }]);
  });

  it('rejects products that are not currently published', async () => {
    eqQuery.mockResolvedValue({
      data: [{id: 'product-1', slug: 'fitness-kit', title: 'Fitness Kit', price: 399, status: 'Draft'}],
      error: null,
    });

    await expect(createCheckoutQuote([{slug: 'fitness-kit', qty: 1}])).rejects.toBeInstanceOf(CheckoutAvailabilityError);
  });

  it('rejects when a canonical cart item is missing', async () => {
    eqQuery.mockResolvedValue({data: [], error: null});

    await expect(createCheckoutQuote([{slug: 'missing-kit', qty: 1}])).rejects.toThrow('no longer available');
  });
});
