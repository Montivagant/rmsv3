import { describe, it, expect } from 'vitest';
import {
  isSaleRecorded,
  isPaymentInitiated,
  isPaymentSucceeded,
  isPaymentFailed,
  isPaymentEvent,
  isPaymentTerminalEvent,
  isLoyaltyAccrued,
  isLoyaltyRedeemed,
  isLoyaltyEvent,
  isInventoryAdjusted
} from '../guards';
import type {
  SaleRecordedEvent,
  PaymentInitiatedEvent,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  LoyaltyAccruedEvent,
  LoyaltyRedeemedEvent,
  InventoryAdjustedEvent,
  Event
} from '../types';

describe('Event Type Guards', () => {
  const sampleEvents: Event[] = [
    {
      id: '1',
      seq: 1,
      type: 'sale.recorded',
      at: Date.now(),
      aggregate: { id: 'ticket-1', type: 'ticket' },
      payload: {
        ticketId: 'ticket-1',
        customerId: 'customer-1',
        lines: [{ name: 'Product 1', qty: 1, price: 100, taxRate: 0.1 }],
        totals: { subtotal: 100, discount: 0, tax: 10, total: 110 }
      }
    } satisfies SaleRecordedEvent,
    {
      id: '2',
      seq: 2,
      type: 'payment.initiated',
      at: Date.now(),
      aggregate: { id: 'ticket-1', type: 'ticket' },
      payload: {
        ticketId: 'ticket-1',
        provider: 'stripe',
        sessionId: 'session-1',
        amount: 100,
        currency: 'USD',
        redirectUrl: 'https://example.com/redirect'
      }
    } satisfies PaymentInitiatedEvent,
    {
      id: '3',
      seq: 3,
      type: 'payment.succeeded',
      at: Date.now(),
      aggregate: { id: 'ticket-1', type: 'ticket' },
      payload: {
        ticketId: 'ticket-1',
        provider: 'stripe',
        sessionId: 'session-1',
        amount: 100,
        currency: 'USD'
      }
    } satisfies PaymentSucceededEvent,
    {
      id: '4',
      seq: 4,
      type: 'payment.failed',
      at: Date.now(),
      aggregate: { id: 'ticket-1', type: 'ticket' },
      payload: {
        ticketId: 'ticket-1',
        provider: 'stripe',
        sessionId: 'session-1',
        amount: 100,
        currency: 'USD',
        reason: 'declined'
      }
    } satisfies PaymentFailedEvent,
    {
      id: '5',
      seq: 5,
      type: 'loyalty.accrued',
      at: Date.now(),
      aggregate: { id: 'customer-1', type: 'customer' },
      payload: {
        customerId: 'customer-1',
        ticketId: 'ticket-1',
        points: 10
      }
    } satisfies LoyaltyAccruedEvent,
    {
      id: '6',
      seq: 6,
      type: 'loyalty.redeemed',
      at: Date.now(),
      aggregate: { id: 'customer-1', type: 'customer' },
      payload: {
        customerId: 'customer-1',
        ticketId: 'ticket-1',
        points: 5,
        value: 0.50
      }
    } satisfies LoyaltyRedeemedEvent,
    {
      id: '7',
      seq: 7,
      type: 'inventory.adjusted',
      at: Date.now(),
      aggregate: { id: 'item-1', type: 'inventory' },
      payload: {
        sku: 'item-1',
        delta: -1,
        reason: 'sale'
      }
    } satisfies InventoryAdjustedEvent
  ];

  describe('Individual Type Guards', () => {
    it('should correctly identify sale.recorded events', () => {
      const saleEvent = sampleEvents.find(isSaleRecorded);
      expect(saleEvent).toBeDefined();
      expect(saleEvent?.type).toBe('sale.recorded');
      expect(saleEvent?.payload.ticketId).toBe('ticket-1');
    });

    it('should correctly identify payment.initiated events', () => {
      const paymentEvent = sampleEvents.find(isPaymentInitiated);
      expect(paymentEvent).toBeDefined();
      expect(paymentEvent?.type).toBe('payment.initiated');
      expect(paymentEvent?.payload.sessionId).toBe('session-1');
    });

    it('should correctly identify payment.succeeded events', () => {
      const paymentEvent = sampleEvents.find(isPaymentSucceeded);
      expect(paymentEvent).toBeDefined();
      expect(paymentEvent?.type).toBe('payment.succeeded');
      expect(paymentEvent?.payload.amount).toBe(100);
    });

    it('should correctly identify payment.failed events', () => {
      const paymentEvent = sampleEvents.find(isPaymentFailed);
      expect(paymentEvent).toBeDefined();
      expect(paymentEvent?.type).toBe('payment.failed');
      expect(paymentEvent?.payload.reason).toBe('declined');
    });

    it('should correctly identify loyalty.accrued events', () => {
      const loyaltyEvent = sampleEvents.find(isLoyaltyAccrued);
      expect(loyaltyEvent).toBeDefined();
      expect(loyaltyEvent?.type).toBe('loyalty.accrued');
      expect(loyaltyEvent?.payload.points).toBe(10);
    });

    it('should correctly identify loyalty.redeemed events', () => {
      const loyaltyEvent = sampleEvents.find(isLoyaltyRedeemed);
      expect(loyaltyEvent).toBeDefined();
      expect(loyaltyEvent?.type).toBe('loyalty.redeemed');
      expect(loyaltyEvent?.payload.points).toBe(5);
    });

    it('should correctly identify inventory.adjusted events', () => {
      const inventoryEvent = sampleEvents.find(isInventoryAdjusted);
      expect(inventoryEvent).toBeDefined();
      expect(inventoryEvent?.type).toBe('inventory.adjusted');
      expect(inventoryEvent?.payload.delta).toBe(-1);
    });
  });

  describe('Utility Type Guards', () => {
    it('should correctly identify payment events', () => {
      const paymentEvents = sampleEvents.filter(isPaymentEvent);
      expect(paymentEvents).toHaveLength(3);
      expect(paymentEvents.every(e => e.type.startsWith('payment.'))).toBe(true);
    });

    it('should correctly identify payment terminal events', () => {
      const terminalEvents = sampleEvents.filter(isPaymentTerminalEvent);
      expect(terminalEvents).toHaveLength(2);
      expect(terminalEvents.every(e => 
        e.type === 'payment.succeeded' || e.type === 'payment.failed'
      )).toBe(true);
    });

    it('should correctly identify loyalty events', () => {
      const loyaltyEvents = sampleEvents.filter(isLoyaltyEvent);
      expect(loyaltyEvents).toHaveLength(2);
      expect(loyaltyEvents.every(e => e.type.startsWith('loyalty.'))).toBe(true);
    });
  });

  describe('Type Narrowing', () => {
    it('should provide proper type narrowing for payment events', () => {
      const paymentEvent = sampleEvents.find(isPaymentInitiated);
      if (paymentEvent) {
        // TypeScript should know this is PaymentInitiatedEvent
        expect(paymentEvent.payload.sessionId).toBeDefined();
        expect(paymentEvent.payload.amount).toBeDefined();
      }
    });

    it('should provide proper type narrowing for loyalty events', () => {
      const loyaltyEvent = sampleEvents.find(isLoyaltyAccrued);
      if (loyaltyEvent) {
        // TypeScript should know this is LoyaltyAccruedEvent
        expect(loyaltyEvent.payload.customerId).toBeDefined();
        expect(loyaltyEvent.payload.points).toBeDefined();
      }
    });
  });
});