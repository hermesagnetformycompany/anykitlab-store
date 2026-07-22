export type CheckoutItem = {
  slug: string;
  qty: number;
};

export class CheckoutInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CheckoutInputError';
  }
}

export function parseCheckoutItems(value: unknown): CheckoutItem[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    throw new CheckoutInputError('The cart must contain between 1 and 20 products.');
  }

  const items = value.map(item => {
    if (!item || typeof item !== 'object') {
      throw new CheckoutInputError('The cart contains an invalid item.');
    }
    const slug = 'slug' in item && typeof item.slug === 'string' ? item.slug.trim() : '';
    const qty = 'qty' in item && typeof item.qty === 'number' ? item.qty : Number.NaN;
    if (!slug || slug.length > 160 || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new CheckoutInputError('The cart contains an invalid product or quantity.');
    }
    return {slug, qty};
  });

  if (new Set(items.map(item => item.slug)).size !== items.length) {
    throw new CheckoutInputError('Each product may appear only once in the cart.');
  }

  return items;
}

export function isValidUpiId(value: string) {
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(value.trim());
}

export function buildUpiPaymentUri({
  upiId,
  payeeName,
  amount,
  transactionReference,
  note,
}: {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionReference: string;
  note: string;
}) {
  const normalizedUpiId = upiId.trim();
  if (!isValidUpiId(normalizedUpiId)) throw new CheckoutInputError('The store UPI ID is not configured correctly.');
  if (!Number.isFinite(amount) || amount <= 0) throw new CheckoutInputError('The payment amount must be greater than zero.');
  if (!/^[A-Z0-9-]{6,35}$/.test(transactionReference)) throw new CheckoutInputError('The checkout reference is invalid.');

  const fields: [string, string][] = [
    ['pa', normalizedUpiId],
    ['pn', payeeName.trim() || 'AnyKit Lab'],
    ['am', amount.toFixed(2)],
    ['cu', 'INR'],
    ['tn', note.trim()],
    ['tr', transactionReference],
  ];
  return `upi://pay?${fields.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}`;
}
