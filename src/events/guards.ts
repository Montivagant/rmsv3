import type { Event, SaleRecordedEvent, InventoryAdjustedEvent, LoyaltyAccruedEvent, LoyaltyRedeemedEvent, PaymentInitiatedEvent, PaymentSucceededEvent, PaymentFailedEvent } from './types';

/**
 * Type guard functions for discriminated union narrowing of events
 * These enable proper TypeScript type narrowing after filter/map operations
 */

export const isSaleRecorded = (e: Event): e is SaleRecordedEvent =>
  e.type === 'sale.recorded';

export const isInventoryAdjusted = (e: Event): e is InventoryAdjustedEvent =>
  e.type === 'inventory.adjusted';

export const isLoyaltyAccrued = (e: Event): e is LoyaltyAccruedEvent =>
  e.type === 'loyalty.accrued';

export const isLoyaltyRedeemed = (e: Event): e is LoyaltyRedeemedEvent =>
  e.type === 'loyalty.redeemed';

export const isPaymentInitiated = (e: Event): e is PaymentInitiatedEvent =>
  e.type === 'payment.initiated';

export const isPaymentSucceeded = (e: Event): e is PaymentSucceededEvent =>
  e.type === 'payment.succeeded';

export const isPaymentFailed = (e: Event): e is PaymentFailedEvent =>
  e.type === 'payment.failed';

// Utility type guards for payment events
export const isPaymentEvent = (e: Event): e is PaymentInitiatedEvent | PaymentSucceededEvent | PaymentFailedEvent =>
  e.type.startsWith('payment.');

export const isPaymentTerminalEvent = (e: Event): e is PaymentSucceededEvent | PaymentFailedEvent =>
  e.type === 'payment.succeeded' || e.type === 'payment.failed';

// Utility type guards for loyalty events
export const isLoyaltyEvent = (e: Event): e is LoyaltyAccruedEvent | LoyaltyRedeemedEvent =>
  e.type.startsWith('loyalty.');