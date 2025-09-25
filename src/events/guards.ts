import type { Event, SaleRecordedEvent, InventoryAdjustedEvent, PaymentInitiatedEvent, PaymentSucceededEvent, PaymentFailedEvent, AuditLoggedEvent, ZReportFinalizedEvent, OrderCreatedEvent, OrderStatusUpdatedEvent, ShiftStartedEvent, ShiftEndedEvent } from './types';

/**
 * Type guard functions for discriminated union narrowing of events
 * These enable proper TypeScript type narrowing after filter/map operations
 */

export const isSaleRecorded = (e: Event): e is SaleRecordedEvent =>
  e.type === 'sale.recorded';

export const isInventoryAdjusted = (e: Event): e is InventoryAdjustedEvent =>
  e.type === 'inventory.adjusted';

// Loyalty guards removed

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
// Loyalty guards removed

// Utility type guard for audit events
export const isAuditLogged = (e: Event): e is AuditLoggedEvent =>
  e.type === 'audit.logged';

// Utility type guard for Z-Report events
export const isZReportFinalized = (e: Event): e is ZReportFinalizedEvent =>
  e.type === 'z-report.finalized';

export const isOrderCreated = (e: Event): e is OrderCreatedEvent => e.type === 'order.created';
export const isOrderStatusUpdated = (e: Event): e is OrderStatusUpdatedEvent => e.type === 'order.status.updated';



export const isShiftStarted = (e: Event): e is ShiftStartedEvent => e.type === 'shift.started';
export const isShiftEnded = (e: Event): e is ShiftEndedEvent => e.type === 'shift.ended';

