import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {NextRequest} from 'next/server';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  quote: vi.fn(),
  orderInsert: vi.fn(),
  orderItemsInsert: vi.fn(),
  orderDeleteEq: vi.fn(),
  existingLookup: vi.fn(),
  rpc: vi.fn(),
  qr: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: async () => ({auth: {getUser: mocks.getUser}}),
}));

vi.mock('@/lib/checkout-server', () => ({
  CheckoutAvailabilityError: class CheckoutAvailabilityError extends Error {},
  createCheckoutQuote: mocks.quote,
}));

vi.mock('qrcode', () => ({default: {toDataURL: mocks.qr}}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: () => ({
    rpc: mocks.rpc,
    from: (table: string) => {
      if (table === 'akl_site_settings') {
        return {select: () => ({eq: () => ({maybeSingle: async () => ({data: {store_name: 'AnyKit Lab', upi_id: 'merchant@upi'}, error: null})})})};
      }
      if (table === 'akl_order_items') return {insert: mocks.orderItemsInsert};
      if (table === 'akl_orders') {
        return {
          select: () => ({eq: () => ({eq: () => ({maybeSingle: mocks.existingLookup})})}),
          insert: mocks.orderInsert,
          delete: () => ({eq: mocks.orderDeleteEq}),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  }),
}));

import {POST} from '../src/app/api/orders/route';

function request(body: unknown) {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe('POST /api/orders payment intent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({data: {user: {id: 'user-1', email: 'buyer@example.com'}}});
    mocks.quote.mockResolvedValue({
      items: [{id: 'product-1', slug: 'fitness-kit', title: 'Fitness Kit', price: 399, qty: 2}],
      total: 798,
    });
    mocks.orderInsert.mockImplementation((row: Record<string, unknown>) => ({
      select: () => ({single: async () => ({
        data: {...row, id: '11111111-1111-4111-8111-111111111111', order_number: 'AKL-260722-ABCD', created_at: '2026-07-22T12:00:00.000Z'},
        error: null,
      })}),
    }));
    mocks.orderItemsInsert.mockResolvedValue({error: null});
    mocks.existingLookup.mockResolvedValue({data: null, error: null});
    mocks.rpc.mockResolvedValue({
      data: [{
        id: '11111111-1111-4111-8111-111111111111',
        order_number: 'AKL-260722-ABCD',
        total: 798,
        status: 'Awaiting payment',
        created_at: '2026-07-22T12:00:00.000Z',
        created: true,
      }],
      error: null,
    });
    mocks.qr.mockResolvedValue('data:image/png;base64,verified');
  });

  it('ignores forged client totals and creates the stored intent from the canonical quote', async () => {
    const response = await POST(request({
      name: 'Sahil',
      email: 'buyer@example.com',
      phone: '9999999999',
      total: 1,
      items: [{slug: 'fitness-kit', qty: 2, price: 1}],
      checkoutKey: '22222222-2222-4222-8222-222222222222',
    }));
    const payload = await response.json();

    expect(response.status, JSON.stringify(payload)).toBe(201);
    expect(payload.paymentIntent.total).toBe(798);
    expect(payload.paymentIntent.uri).toContain('am=798.00');
    expect(payload.paymentIntent.uri).toContain('tr=AKL-260722-ABCD');
    expect(mocks.rpc).toHaveBeenCalledWith('akl_create_payment_intent', expect.objectContaining({
      p_total: 798,
      p_checkout_key: '22222222-2222-4222-8222-222222222222',
      p_user_id: 'user-1',
      p_items: [expect.objectContaining({unit_price: 399, quantity: 2})],
    }));
  });

  it('returns the stored intent for an idempotent retry without creating another order', async () => {
    mocks.existingLookup.mockResolvedValue({
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        order_number: 'AKL-260722-EXISTING',
        total: 399,
        status: 'Awaiting payment',
        created_at: '2026-07-22T12:00:00.000Z',
        akl_order_items: [{product_slug: 'fitness-kit', product_title: 'Fitness Kit', unit_price: 399, quantity: 1}],
      },
      error: null,
    });

    const response = await POST(request({
      name: 'Sahil',
      email: 'buyer@example.com',
      phone: '9999999999',
      items: [{slug: 'changed-cart', qty: 99}],
      checkoutKey: '22222222-2222-4222-8222-222222222222',
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.paymentIntent.orderNumber).toBe('AKL-260722-EXISTING');
    expect(payload.paymentIntent.total).toBe(399);
    expect(payload.paymentIntent.uri).toContain('am=399.00');
    expect(mocks.quote).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('refuses to reopen a checkout key whose order is no longer awaiting payment', async () => {
    mocks.existingLookup.mockResolvedValue({
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        order_number: 'AKL-260722-CLOSED',
        total: 399,
        status: 'Rejected',
        created_at: '2026-07-22T12:00:00.000Z',
        akl_order_items: [],
      },
      error: null,
    });

    const response = await POST(request({
      name: 'Sahil',
      email: 'buyer@example.com',
      phone: '9999999999',
      items: [{slug: 'fitness-kit', qty: 1}],
      checkoutKey: '22222222-2222-4222-8222-222222222222',
    }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.code).toBe('CHECKOUT_KEY_CLOSED');
    expect(mocks.quote).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects anonymous payment-intent creation', async () => {
    mocks.getUser.mockResolvedValue({data: {user: null}});
    const response = await POST(request({items: [{slug: 'fitness-kit', qty: 1}]}));
    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
