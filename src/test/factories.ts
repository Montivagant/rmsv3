import type { Event as AppEvent, SaleRecordedEvent, InventoryAdjustedEvent, PaymentInitiatedEvent, PaymentSucceededEvent, PaymentFailedEvent } from '../events/types';

/**
 * Test event factories for creating consistent test data
 */

export function createSaleRecordedEvent(overrides: Partial<AppEvent> = {}): SaleRecordedEvent {
  const baseEvent: SaleRecordedEvent = {
    id: `sale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    seq: 1,
    type: 'sale.recorded',
    at: Date.now(),
    payload: {
      ticketId: 'ticket-123',
      customerId: 'customer-456',
      lines: [
        { name: 'Product 1', qty: 2, price: 10.99, taxRate: 0.1 }
      ],
      totals: {
        subtotal: 21.98,
        discount: 0,
        tax: 2.20,
        total: 24.18
      }
    },
    aggregate: {
      id: 'sale-123',
      type: 'sale'
    }
  };
  return { ...baseEvent, ...overrides } as SaleRecordedEvent;
}

export function createInventoryAdjustedEvent(overrides: Partial<AppEvent> = {}): InventoryAdjustedEvent {
  const baseEvent: InventoryAdjustedEvent = {
    id: `inventory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    seq: 2,
    type: 'inventory.adjusted',
    at: Date.now(),
    payload: {
      sku: 'product-1',
      oldQty: 10,
      newQty: 8,
      reason: 'sale',
      delta: -2
    },
    aggregate: {
      id: 'inventory-123',
      type: 'inventory'
    }
  };
  return { ...baseEvent, ...overrides } as InventoryAdjustedEvent;
}

// Loyalty factories removed

export function createPaymentInitiatedEvent(overrides: Partial<AppEvent> = {}): PaymentInitiatedEvent {
  const baseEvent: PaymentInitiatedEvent = {
    id: 'evt_payment_initiated_123',
    seq: 1,
    type: 'payment.initiated',
    at: Date.now(),
    payload: {
      ticketId: 'ticket-123',
      provider: 'stripe',
      sessionId: 'session-456',
      amount: 100,
      currency: 'USD'
    },
    aggregate: {
      id: 'payment-123',
      type: 'payment'
    }
  };
  return { ...baseEvent, ...overrides } as PaymentInitiatedEvent;
}

export function createPaymentSucceededEvent(overrides: Partial<AppEvent> = {}): PaymentSucceededEvent {
  const baseEvent: PaymentSucceededEvent = {
    id: 'evt_payment_succeeded_123',
    seq: 2,
    type: 'payment.succeeded',
    at: Date.now(),
    payload: {
      ticketId: 'ticket-123',
      provider: 'stripe',
      sessionId: 'session-456',
      amount: 100,
      currency: 'USD'
    },
    aggregate: {
      id: 'payment-123',
      type: 'payment'
    }
  };
  return { ...baseEvent, ...overrides } as PaymentSucceededEvent;
}

export function createPaymentFailedEvent(overrides: Partial<AppEvent> = {}): PaymentFailedEvent {
  const baseEvent: PaymentFailedEvent = {
    id: 'evt_payment_failed_123',
    seq: 2,
    type: 'payment.failed',
    at: Date.now(),
    payload: {
      ticketId: 'ticket-123',
      provider: 'stripe',
      sessionId: 'session-456',
      amount: 100,
      currency: 'USD',
      reason: 'insufficient_funds'
    },
    aggregate: {
      id: 'payment-123',
      type: 'payment'
    }
  };
  return { ...baseEvent, ...overrides } as PaymentFailedEvent;
}

/**
 * Create a batch of test events for bulk operations
 */
export function createTestEventBatch(count: number = 5): AppEvent[] {
  const events: AppEvent[] = [];
  
  for (let i = 0; i < count; i++) {
    const eventType = i % 4;
    switch (eventType) {
      case 0:
        events.push(createSaleRecordedEvent({ seq: i + 1 }));
        break;
      case 1:
        events.push(createInventoryAdjustedEvent({ seq: i + 1 }));
        break;
      case 2:
        events.push(createPaymentSucceededEvent({ seq: i + 1 }));
        break;
      case 3:
        events.push(createPaymentSucceededEvent({ seq: i + 1 }));
        break;
    }
  }
  
  return events;
}