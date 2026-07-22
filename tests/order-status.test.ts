import {describe, expect, it} from 'vitest';
import {canManageOrderStatus} from '../src/lib/admin-auth';
import {canAdminTransitionOrder, isAdminTargetStatus, isOrderStatus} from '../src/lib/order-status';

describe('order status transition policy', () => {
  it.each([
    ['Awaiting payment', 'Rejected'],
    ['Pending verification', 'Verified'],
    ['Pending verification', 'Rejected'],
    ['Verified', 'Access sent'],
  ] as const)('allows %s → %s', (current, target) => {
    expect(canAdminTransitionOrder(current, target)).toBe(true);
  });

  it.each([
    ['Awaiting payment', 'Verified'],
    ['Awaiting payment', 'Access sent'],
    ['Pending verification', 'Access sent'],
    ['Access sent', 'Rejected'],
    ['Rejected', 'Verified'],
  ] as const)('blocks %s → %s', (current, target) => {
    expect(canAdminTransitionOrder(current, target)).toBe(false);
  });

  it('rejects client attempts to set internal pending states', () => {
    expect(isAdminTargetStatus('Awaiting payment')).toBe(false);
    expect(isAdminTargetStatus('Pending verification')).toBe(false);
    expect(isAdminTargetStatus('Verified')).toBe(true);
    expect(isOrderStatus('Access sent')).toBe(true);
    expect(isOrderStatus('Paid')).toBe(false);
  });

  it('limits payment and fulfillment mutations to owners and payment reviewers', () => {
    expect(canManageOrderStatus('Owner')).toBe(true);
    expect(canManageOrderStatus('Payment reviewer')).toBe(true);
    expect(canManageOrderStatus('Support')).toBe(false);
    expect(canManageOrderStatus('Catalog manager')).toBe(false);
  });
});
