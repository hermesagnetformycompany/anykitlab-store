export const orderStatuses = ['Awaiting payment', 'Pending verification', 'Verified', 'Access sent', 'Rejected'] as const;
export type OrderStatus = typeof orderStatuses[number];

export const adminTargetStatuses = ['Verified', 'Access sent', 'Rejected'] as const;
export type AdminTargetStatus = typeof adminTargetStatuses[number];

const allowedAdminTransitions: Record<OrderStatus, readonly AdminTargetStatus[]> = {
  'Awaiting payment': ['Rejected'],
  'Pending verification': ['Verified', 'Rejected'],
  'Verified': ['Access sent'],
  'Access sent': [],
  'Rejected': [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && orderStatuses.some(status => status === value);
}

export function isAdminTargetStatus(value: unknown): value is AdminTargetStatus {
  return typeof value === 'string' && adminTargetStatuses.some(status => status === value);
}

export function canAdminTransitionOrder(current: OrderStatus, target: AdminTargetStatus) {
  return allowedAdminTransitions[current].includes(target);
}
