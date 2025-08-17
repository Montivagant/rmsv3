import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventStore } from '../../events/store';
import { IdempotencyConflictError } from '../../events/types';
import { handleWebhook, generatePaymentKeys } from '../webhook';
import { derivePaymentStatus } from '../status';
import { defaultProvider } from '../provider';

describe('Payments', () => {
  let store: InMemoryEventStore;

  beforeEach(() => {
    store = new InMemoryEventStore();
  });

  describe('Payment Provider', () => {
    it('should create checkout with redirectUrl and sessionId', async () => {
      const result = await defaultProvider.createCheckout({
        ticketId: 'ticket-123',
        amount: 2599, // $25.99
        currency: 'USD'
      });

      expect(result.redirectUrl).toContain('mock-payment-provider.com');
      expect(result.sessionId).toMatch(/^sess_/);
      expect(result.redirectUrl).toContain(result.sessionId);
      expect(result.redirectUrl).toContain('amount=2599');
      expect(result.redirectUrl).toContain('ticket-123');
    });
  });

  describe('Payment Key Generation', () => {
    it('should generate correct idempotency keys', () => {
      const keys = generatePaymentKeys('stripe', 'sess_123');
      
      expect(keys.initiated).toBe('pay:init:stripe:sess_123');
      expect(keys.webhook).toBe('pay:webhook:stripe:sess_123');
    });
  });

  describe('Payment Status Derivation', () => {
    it('should return null for no payment events', () => {
      const events = [
        {
          id: '1',
          seq: 1,
          type: 'sale.recorded' as const,
          payload: { ticketId: 'test' },
          timestamp: new Date().toISOString(),
          at: Date.now()
        }
      ];
      
      expect(derivePaymentStatus(events)).toBe(null);
    });

    it('should return pending for payment.initiated', () => {
      const events = [
        {
          id: '1',
          seq: 1,
          type: 'payment.initiated' as const,
          payload: { provider: 'stripe', sessionId: 'sess_123', ticketId: 'test', amount: 1000 },
          timestamp: new Date().toISOString(),
          at: Date.now()
        }
      ];
      
      expect(derivePaymentStatus(events)).toBe('pending');
    });

    it('should return paid for payment.succeeded', () => {
      const events = [
        {
          id: '1',
          seq: 1,
          type: 'payment.initiated' as const,
          payload: { provider: 'stripe', sessionId: 'sess_123', ticketId: 'test', amount: 1000 },
          timestamp: new Date(Date.now() - 1000).toISOString(),
          at: Date.now() - 1000
        },
        {
          id: '2',
          seq: 2,
          type: 'payment.succeeded' as const,
          payload: { provider: 'stripe', sessionId: 'sess_123', ticketId: 'test', amount: 1000 },
          timestamp: new Date().toISOString(),
          at: Date.now()
        }
      ];
      
      expect(derivePaymentStatus(events)).toBe('paid');
    });

    it('should return failed for payment.failed', () => {
      const events = [
        {
          id: '1',
          seq: 1,
          type: 'payment.initiated' as const,
          payload: { provider: 'stripe', sessionId: 'sess_123', ticketId: 'test', amount: 1000 },
          timestamp: new Date(Date.now() - 1000).toISOString(),
          at: Date.now() - 1000
        },
        {
          id: '2',
          seq: 2,
          type: 'payment.failed' as const,
          payload: { provider: 'stripe', sessionId: 'sess_123', ticketId: 'test', amount: 1000, reason: 'insufficient_funds' },
          timestamp: new Date().toISOString(),
          at: Date.now()
        }
      ];
      
      expect(derivePaymentStatus(events)).toBe('failed');
    });

    it('should handle out-of-order events (failed then succeeded -> paid)', () => {
      const baseTime = Date.now();
      const events = [
        {
          id: '1',
          seq: 1,
          type: 'payment.initiated' as const,
          payload: { provider: 'stripe', sessionId: 'sess_123', ticketId: 'test', amount: 1000 },
          timestamp: new Date(baseTime - 2000).toISOString(),
          at: baseTime - 2000
        },
        {
          id: '2',
          seq: 2,
          type: 'payment.failed' as const,
          payload: { provider: 'stripe', sessionId: 'sess_123', ticketId: 'test', amount: 1000, reason: 'network_error' },
          timestamp: new Date(baseTime - 1000).toISOString(),
          at: baseTime - 1000
        },
        {
          id: '3',
          seq: 3,
          type: 'payment.succeeded' as const,
          payload: { provider: 'stripe', sessionId: 'sess_123', ticketId: 'test', amount: 1000 },
          timestamp: new Date(baseTime).toISOString(),
          at: baseTime
        }
      ];
      
      expect(derivePaymentStatus(events)).toBe('paid');
    });
  });

  describe('Webhook Handling', () => {
    it('should handle successful payment webhook', () => {
      const result = handleWebhook(store, {
        provider: 'stripe',
        sessionId: 'sess_123',
        eventType: 'succeeded',
        ticketId: 'ticket-123',
        amount: 2599,
        currency: 'USD'
      });

      expect(result.success).toBe(true);
      expect(result.deduped).toBe(false);
      expect(result.error).toBeUndefined();

      const events = store.getAll();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('payment.succeeded');
      expect(events[0].payload).toEqual({
        provider: 'stripe',
        sessionId: 'sess_123',
        ticketId: 'ticket-123',
        amount: 2599,
        currency: 'USD'
      });
    });

    it('should handle failed payment webhook', () => {
      const result = handleWebhook(store, {
        provider: 'stripe',
        sessionId: 'sess_123',
        eventType: 'failed',
        ticketId: 'ticket-123',
        amount: 2599,
        currency: 'USD',
        reason: 'insufficient_funds'
      });

      expect(result.success).toBe(true);
      expect(result.deduped).toBe(false);
      expect(result.error).toBeUndefined();

      const events = store.getAll();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('payment.failed');
      expect(events[0].payload).toEqual({
        provider: 'stripe',
        sessionId: 'sess_123',
        ticketId: 'ticket-123',
        amount: 2599,
        currency: 'USD',
        reason: 'insufficient_funds'
      });
    });

    it('should deduplicate identical webhook calls', () => {
      const webhookParams = {
        provider: 'stripe',
        sessionId: 'sess_123',
        eventType: 'succeeded' as const,
        ticketId: 'ticket-123',
        amount: 2599,
        currency: 'USD'
      };

      const result1 = handleWebhook(store, webhookParams);
      const result2 = handleWebhook(store, webhookParams);

      expect(result1.success).toBe(true);
      expect(result1.deduped).toBe(false);
      expect(result2.success).toBe(true);
      expect(result2.deduped).toBe(true);

      const events = store.getAll();
      expect(events).toHaveLength(1); // Only one event should be stored
    });

    it('should throw idempotency mismatch for same sessionId with different amount', () => {
      handleWebhook(store, {
        provider: 'stripe',
        sessionId: 'sess_123',
        eventType: 'succeeded',
        ticketId: 'ticket-123',
        amount: 2599,
        currency: 'USD'
      });

      expect(() => {
        handleWebhook(store, {
          provider: 'stripe',
          sessionId: 'sess_123',
          eventType: 'succeeded',
          ticketId: 'ticket-123',
          amount: 3599, // Different amount
          currency: 'USD'
        });
      }).toThrow(IdempotencyConflictError);
    });

    it('should handle unknown event types gracefully', () => {
      const result = handleWebhook(store, {
        provider: 'stripe',
        sessionId: 'sess_123',
        eventType: 'unknown' as any,
        ticketId: 'ticket-123',
        amount: 2599,
        currency: 'USD'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown event type: unknown');
      expect(store.getAll()).toHaveLength(0);
    });
  });
});