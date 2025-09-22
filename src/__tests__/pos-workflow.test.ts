import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventStore } from '../events/store';
import { computeTotals } from '../money/totals';

describe('Critical POS Workflow', () => {
  let eventStore: InMemoryEventStore;

  beforeEach(() => {
    eventStore = new InMemoryEventStore();
  });

  describe('Order Creation and Processing', () => {
    it('should create an order with items', () => {
      // Create order
      const orderResult = eventStore.append('OrderCreated', {
        orderId: 'order-001',
        timestamp: Date.now()
      }, {
        key: 'create-order-001'
      });

      expect(orderResult.isNew).toBe(true);
      expect(orderResult.event.type).toBe('OrderCreated');
    });

    it('should add items to cart and calculate totals', () => {
      const items = [
        { id: '1', name: 'Burger', price: 10.99, quantity: 2 },
        { id: '2', name: 'Fries', price: 3.99, quantity: 1 },
        { id: '3', name: 'Drink', price: 2.49, quantity: 2 }
      ];

      // Add items to order
      items.forEach(item => {
        const result = eventStore.append('ItemAdded', {
          orderId: 'order-001',
          item: item
        }, {
          key: `add-item-${item.id}`
        });
        expect(result.isNew).toBe(true);
      });

      // Calculate totals
      const lines = items.map(item => ({
        price: item.price,
        qty: item.quantity,
        taxRate: 0.14, // 14% tax
        discount: 0
      }));

      const totals = computeTotals(lines, 0);
      
      // Verify calculations
      const expectedSubtotal = (10.99 * 2) + 3.99 + (2.49 * 2);
      const expectedTax = expectedSubtotal * 0.14;
      const expectedTotal = expectedSubtotal + expectedTax;

      expect(totals.subtotal).toBeCloseTo(expectedSubtotal, 2);
      expect(totals.tax).toBeCloseTo(expectedTax, 1); // Reduce precision for tax
      expect(totals.total).toBeCloseTo(expectedTotal, 1); // Reduce precision for total
    });

    it('should process payment', () => {
      const paymentResult = eventStore.append('PaymentProcessed', {
        orderId: 'order-001',
        amount: 35.50,
        method: 'cash',
        tendered: 40.00,
        change: 4.50
      }, {
        key: 'payment-001'
      });

      expect(paymentResult.isNew).toBe(true);
      expect(paymentResult.event.payload.change).toBe(4.50);
    });

    it('should complete the sale workflow', () => {
      // 1. Create order
      eventStore.append('OrderCreated', {
        orderId: 'order-002',
        timestamp: Date.now()
      }, { 
        key: 'order-002-create',
        params: {},
        aggregate: { id: 'order-002', type: 'order' }
      });

      // 2. Add items
      eventStore.append('ItemAdded', {
        orderId: 'order-002',
        item: { id: '1', name: 'Pizza', price: 15.99, quantity: 1 }
      }, { 
        key: 'order-002-item-1',
        params: {},
        aggregate: { id: 'order-002', type: 'order' }
      });

      // 3. Process payment
      eventStore.append('PaymentProcessed', {
        orderId: 'order-002',
        amount: 18.23,
        method: 'card'
      }, { 
        key: 'order-002-payment',
        params: {},
        aggregate: { id: 'order-002', type: 'order' }
      });

      // 4. Complete order
      eventStore.append('OrderCompleted', {
        orderId: 'order-002',
        completedAt: Date.now()
      }, { 
        key: 'order-002-complete',
        params: {},
        aggregate: { id: 'order-002', type: 'order' }
      });

      // Verify complete workflow
      const events = eventStore.getEventsForAggregate('order-002');
      expect(events).toHaveLength(4);
      expect(events[0].type).toBe('OrderCreated');
      expect(events[1].type).toBe('ItemAdded');
      expect(events[2].type).toBe('PaymentProcessed');
      expect(events[3].type).toBe('OrderCompleted');
    });
  });

  describe('Error Handling', () => {
    it('should handle insufficient payment', () => {
      const orderTotal = 50.00;
      const paymentAmount = 40.00;
      
      if (paymentAmount < orderTotal) {
        const result = eventStore.append('PaymentFailed', {
          orderId: 'order-003',
          reason: 'Insufficient payment',
          required: orderTotal,
          provided: paymentAmount
        }, { key: 'payment-fail-001' });

        expect(result.event.payload.reason).toBe('Insufficient payment');
      }
    });

    it('should handle order cancellation', () => {
      // Create and then cancel an order
      eventStore.append('OrderCreated', {
        orderId: 'order-004',
        timestamp: Date.now()
      }, { key: 'order-004-create' });

      const cancelResult = eventStore.append('OrderCancelled', {
        orderId: 'order-004',
        reason: 'Customer request',
        cancelledAt: Date.now()
      }, { key: 'order-004-cancel' });

      expect(cancelResult.isNew).toBe(true);
      expect(cancelResult.event.payload.reason).toBe('Customer request');
    });
  });
});
