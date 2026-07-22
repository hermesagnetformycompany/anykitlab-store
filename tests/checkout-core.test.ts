import {describe, expect, it} from 'vitest';
import {
  buildUpiPaymentUri,
  CheckoutInputError,
  isValidUpiId,
  parseCheckoutItems,
} from '../src/lib/checkout-core';

describe('parseCheckoutItems', () => {
  it('accepts a valid unique cart', () => {
    expect(parseCheckoutItems([{slug: 'fitness-kit', qty: 2}])).toEqual([{slug: 'fitness-kit', qty: 2}]);
  });

  const invalidCarts: [string, unknown][] = [
    ['empty cart', []],
    ['blank slug', [{slug: '', qty: 1}]],
    ['zero quantity', [{slug: 'fitness-kit', qty: 0}]],
    ['fractional quantity', [{slug: 'fitness-kit', qty: 1.5}]],
    ['duplicate product', [{slug: 'fitness-kit', qty: 1}, {slug: 'fitness-kit', qty: 2}]],
  ];

  it.each(invalidCarts)('rejects %s', (_label, value) => {
    expect(() => parseCheckoutItems(value)).toThrow(CheckoutInputError);
  });
});

describe('UPI payment URI', () => {
  it('contains the exact payee, amount, currency, note and transaction reference', () => {
    const uri = buildUpiPaymentUri({
      upiId: 'merchant@upi',
      payeeName: 'AnyKit Lab',
      amount: 399,
      transactionReference: 'AKLQ-1234567890ABCDEF',
      note: 'AnyKit Lab checkout AKLQ-1234567890ABCDEF',
    });
    const parsed = new URL(uri);

    expect(parsed.protocol).toBe('upi:');
    expect(parsed.hostname).toBe('pay');
    expect(parsed.searchParams.get('pa')).toBe('merchant@upi');
    expect(parsed.searchParams.get('pn')).toBe('AnyKit Lab');
    expect(parsed.searchParams.get('am')).toBe('399.00');
    expect(parsed.searchParams.get('cu')).toBe('INR');
    expect(parsed.searchParams.get('tr')).toBe('AKLQ-1234567890ABCDEF');
    expect(parsed.searchParams.get('tn')).toBe('AnyKit Lab checkout AKLQ-1234567890ABCDEF');
  });

  it('encodes special characters without corrupting the URI', () => {
    const uri = buildUpiPaymentUri({
      upiId: 'merchant@upi',
      payeeName: 'AnyKit Lab & Co',
      amount: 1299.5,
      transactionReference: 'AKLQ-ABCDEF1234567890',
      note: 'Kit #1 / launch',
    });
    const parsed = new URL(uri);
    expect(parsed.searchParams.get('pn')).toBe('AnyKit Lab & Co');
    expect(parsed.searchParams.get('tn')).toBe('Kit #1 / launch');
    expect(parsed.searchParams.get('am')).toBe('1299.50');
  });

  it('rejects invalid UPI IDs, zero amounts, and weak references', () => {
    expect(isValidUpiId('merchant@upi')).toBe(true);
    expect(isValidUpiId('not-a-upi-id')).toBe(false);
    expect(() => buildUpiPaymentUri({
      upiId: 'not-a-upi-id',
      payeeName: 'AnyKit Lab',
      amount: 399,
      transactionReference: 'AKLQ-1234567890ABCDEF',
      note: 'Checkout',
    })).toThrow(CheckoutInputError);
    expect(() => buildUpiPaymentUri({
      upiId: 'merchant@upi',
      payeeName: 'AnyKit Lab',
      amount: 0,
      transactionReference: 'SHORT',
      note: 'Checkout',
    })).toThrow(CheckoutInputError);
  });
});
