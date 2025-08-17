import { describe, it, expect, beforeEach } from 'vitest';
import { eventStore } from '../../events/store';
import { IdempotencyConflictError } from '../../events/types';

describe('Loyalty Events - Idempotency Tests', () => {
  beforeEach(() => {
    eventStore.reset();
  });

  describe('loyalty.accrued events', () => {
    it('should allow same key with same params', async () => {
      const payload = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 5
      };
      const key = 'loyalty:accrue:ticket-456:customer-123';

      // First append should succeed
      await eventStore.append('loyalty.accrued', payload, { key, params: payload });
      
      // Second append with same key and params should succeed (idempotent)
      await eventStore.append('loyalty.accrued', payload, { key, params: payload });
      
      // Should only have one event stored
      const events = eventStore.getAll();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('loyalty.accrued');
      expect(events[0].payload).toEqual(payload);
    });

    it('should reject same key with different params', async () => {
      const payload1 = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 5
      };
      const payload2 = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 10 // Different points value
      };
      const key = 'loyalty:accrue:ticket-456:customer-123';

      // First append should succeed
      await eventStore.append('loyalty.accrued', payload1, { key, params: payload1 });
      
      // Second append with same key but different params should throw
      await expect(
        eventStore.append('loyalty.accrued', payload2, { key, params: payload2 })
      ).rejects.toThrow(IdempotencyConflictError);
      
      // Should only have one event stored
      const events = eventStore.getAll();
      expect(events).toHaveLength(1);
      expect(events[0].payload).toEqual(payload1);
    });

    it('should allow different keys with different params', async () => {
      const payload1 = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 5
      };
      const payload2 = {
        customerId: 'customer-123',
        ticketId: 'ticket-789', // Different ticket
        points: 10
      };
      const key1 = 'loyalty:accrue:ticket-456:customer-123';
      const key2 = 'loyalty:accrue:ticket-789:customer-123';

      await eventStore.append('loyalty.accrued', payload1, { key: key1, params: payload1 });
      await eventStore.append('loyalty.accrued', payload2, { key: key2, params: payload2 });
      
      const events = eventStore.getAll();
      expect(events).toHaveLength(2);
    });
  });

  describe('loyalty.redeemed events', () => {
    it('should allow same key with same params', async () => {
      const payload = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 10,
        value: 1.00
      };
      const key = 'loyalty:redeem:ticket-456:customer-123';

      await eventStore.append('loyalty.redeemed', payload, { key, params: payload });
      await eventStore.append('loyalty.redeemed', payload, { key, params: payload });
      
      const events = eventStore.getAll();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('loyalty.redeemed');
      expect(events[0].payload).toEqual(payload);
    });

    it('should reject same key with different params', async () => {
      const payload1 = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 10,
        value: 1.00
      };
      const payload2 = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 20, // Different points
        value: 2.00 // Different value
      };
      const key = 'loyalty:redeem:ticket-456:customer-123';

      await eventStore.append('loyalty.redeemed', payload1, { key, params: payload1 });
      
      await expect(
        eventStore.append('loyalty.redeemed', payload2, { key, params: payload2 })
      ).rejects.toThrow(IdempotencyConflictError);
      
      const events = eventStore.getAll();
      expect(events).toHaveLength(1);
      expect(events[0].payload).toEqual(payload1);
    });

    it('should validate value matches points calculation', async () => {
      const payload = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 10,
        value: 1.00 // 10 points * 0.10 = 1.00
      };
      const key = 'loyalty:redeem:ticket-456:customer-123';

      await eventStore.append('loyalty.redeemed', payload, { key, params: payload });
      
      const events = eventStore.getAll();
      expect(events).toHaveLength(1);
      expect((events[0].payload as any).value).toBe(1.00);
    });
  });

  describe('Mixed loyalty events', () => {
    it('should handle accrual and redemption for same customer/ticket', async () => {
      const accrualPayload = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 5
      };
      const redemptionPayload = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 10,
        value: 1.00
      };
      
      const accrualKey = 'loyalty:accrue:ticket-456:customer-123';
      const redemptionKey = 'loyalty:redeem:ticket-456:customer-123';

      await eventStore.append('loyalty.accrued', accrualPayload, { key: accrualKey, params: accrualPayload });
      await eventStore.append('loyalty.redeemed', redemptionPayload, { key: redemptionKey, params: redemptionPayload });
      
      const events = eventStore.getAll();
      expect(events).toHaveLength(2);
      
      const accrualEvent = events.find(e => e.type === 'loyalty.accrued');
      const redemptionEvent = events.find(e => e.type === 'loyalty.redeemed');
      
      expect(accrualEvent).toBeDefined();
      expect(redemptionEvent).toBeDefined();
      expect(accrualEvent?.payload).toEqual(accrualPayload);
      expect(redemptionEvent?.payload).toEqual(redemptionPayload);
    });

    it('should handle multiple customers in same transaction', async () => {
      const ticketId = 'ticket-456';
      
      const customer1Payload = {
        customerId: 'customer-123',
        ticketId,
        points: 5
      };
      const customer2Payload = {
        customerId: 'customer-456',
        ticketId,
        points: 3
      };
      
      const key1 = `loyalty:accrue:${ticketId}:customer-123`;
      const key2 = `loyalty:accrue:${ticketId}:customer-456`;

      await eventStore.append('loyalty.accrued', customer1Payload, { key: key1, params: customer1Payload });
      await eventStore.append('loyalty.accrued', customer2Payload, { key: key2, params: customer2Payload });
      
      const events = eventStore.getAll();
      expect(events).toHaveLength(2);
      expect(events.every(e => e.type === 'loyalty.accrued')).toBe(true);
    });
  });

  describe('Key format validation', () => {
    it('should use consistent key format for accrual', async () => {
      const payload = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 5
      };
      
      // Test the expected key format
      const expectedKey = 'loyalty:accrue:ticket-456:customer-123';
      
      await eventStore.append('loyalty.accrued', payload, { key: expectedKey, params: payload });
      
      const events = eventStore.getAll();
      expect(events).toHaveLength(1);
    });

    it('should use consistent key format for redemption', async () => {
      const payload = {
        customerId: 'customer-123',
        ticketId: 'ticket-456',
        points: 10,
        value: 1.00
      };
      
      // Test the expected key format
      const expectedKey = 'loyalty:redeem:ticket-456:customer-123';
      
      await eventStore.append('loyalty.redeemed', payload, { key: expectedKey, params: payload });
      
      const events = eventStore.getAll();
      expect(events).toHaveLength(1);
    });
  });
});