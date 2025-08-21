# Event System Documentation

## Overview

The RMS v3 event system is the backbone of the application, providing a robust, type-safe, and auditable way to manage state changes. This document provides comprehensive documentation for developers working with the event system.

## Core Concepts

### Events

Events are immutable records of things that have happened in the system. They follow a consistent structure and naming convention.

```typescript
interface KnownEvent {
  id: string;           // Unique event identifier (evt_timestamp_random)
  seq: number;          // Sequence number within aggregate
  type: EventType;      // Event type (lowercase.dot.notation)
  at: number;           // Timestamp (milliseconds since epoch)
  aggregate: {          // Aggregate information
    id: string;         // Aggregate ID
    type: string;       // Aggregate type
  };
  payload?: any;        // Event-specific data
}
```

### Event Types

All event types use lowercase dot notation and are strongly typed:

```typescript
type EventType = 
  | 'sale.recorded'      // Sale completed
  | 'loyalty.accrued'    // Loyalty points earned
  | 'loyalty.redeemed'   // Loyalty points used
  | 'inventory.updated'  // Stock levels changed
  | 'payment.processed'  // Payment completed
  | 'order.created'      // New order created
  | 'order.updated'      // Order modified
  | 'order.cancelled'    // Order cancelled;
```

### Aggregates

Aggregates are consistency boundaries that group related events:

- **ticket**: Customer orders/sales
- **customer**: Customer data and loyalty
- **product**: Inventory items
- **payment**: Payment transactions

## Event Store API

### Core Methods

#### `append(type, payload, options)`

Appends a new event to the store:

```typescript
const event = await eventStore.append('sale.recorded', {
  ticketId: 'T-123',
  lines: [{ sku: 'burger', name: 'Classic Burger', qty: 1, price: 12.99, taxRate: 0.15 }],
  totals: { subtotal: 12.99, discount: 0, tax: 1.95, total: 14.94 }
}, {
  aggregate: { id: 'T-123', type: 'ticket' }
});
```

**Parameters:**
- `type`: Event type (must be a valid EventType)
- `payload`: Event-specific data
- `options`: Configuration object with aggregate information

**Returns:** Promise<KnownEvent>

#### `query(criteria)`

Queries events based on criteria:

```typescript
// Get all sales for a specific ticket
const saleEvents = eventStore.query({
  type: 'sale.recorded',
  aggregate: { id: 'T-123' }
});

// Get all loyalty events for a customer
const loyaltyEvents = eventStore.query({
  type: ['loyalty.accrued', 'loyalty.redeemed'],
  aggregate: { type: 'customer', id: 'C-456' }
});
```

**Parameters:**
- `criteria`: Query criteria object

**Returns:** KnownEvent[]

#### `getAll()`

Returns all events in the store:

```typescript
const allEvents = eventStore.getAll();
```

**Returns:** KnownEvent[]

#### `reset()`

Clears all events from the store:

```typescript
await eventStore.reset();
```

**Returns:** Promise<void>

## Event Definitions

### Sale Events

#### `sale.recorded`

Recorded when a sale is completed.

```typescript
interface SaleRecordedPayload {
  ticketId: string;
  customerId?: string;
  lines: Array<{
    sku?: string;
    name: string;
    qty: number;
    price: number;
    taxRate: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
}

// Usage
eventStore.append('sale.recorded', {
  ticketId: 'T-123',
  lines: [
    { sku: 'burger', name: 'Classic Burger', qty: 1, price: 12.99, taxRate: 0.15 }
  ],
  totals: { subtotal: 12.99, discount: 0, tax: 1.95, total: 14.94 }
}, {
  aggregate: { id: 'T-123', type: 'ticket' }
});
```

### Loyalty Events

#### `loyalty.accrued`

Recorded when loyalty points are earned.

```typescript
interface LoyaltyAccruedPayload {
  customerId: string;
  points: number;
  reason: string;
  saleAmount?: number;
}

// Usage
eventStore.append('loyalty.accrued', {
  customerId: 'C-456',
  points: 13,
  reason: 'Purchase',
  saleAmount: 12.99
}, {
  aggregate: { id: 'C-456', type: 'customer' }
});
```

#### `loyalty.redeemed`

Recorded when loyalty points are used.

```typescript
interface LoyaltyRedeemedPayload {
  customerId: string;
  points: number;
  discountAmount: number;
  ticketId: string;
}

// Usage
eventStore.append('loyalty.redeemed', {
  customerId: 'C-456',
  points: 100,
  discountAmount: 1.00,
  ticketId: 'T-123'
}, {
  aggregate: { id: 'C-456', type: 'customer' }
});
```

### Inventory Events

#### `inventory.updated`

Recorded when stock levels change.

```typescript
interface InventoryUpdatedPayload {
  productId: string;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  reference?: string; // Reference to related event/transaction
}

// Usage
eventStore.append('inventory.updated', {
  productId: 'burger',
  previousQuantity: 10,
  newQuantity: 9,
  reason: 'Sale',
  reference: 'T-123'
}, {
  aggregate: { id: 'burger', type: 'product' }
});
```

### Payment Events

#### `payment.processed`

Recorded when a payment is completed.

```typescript
interface PaymentProcessedPayload {
  amount: number;
  method: 'cash' | 'card' | 'digital';
  ticketId: string;
  transactionId?: string;
  change?: number;
}

// Usage
eventStore.append('payment.processed', {
  amount: 14.81,
  method: 'card',
  ticketId: 'T-123',
  transactionId: 'TXN-789'
}, {
  aggregate: { id: 'TXN-789', type: 'payment' }
});
```

## Query Patterns

### Basic Queries

```typescript
// Get events by type
const sales = eventStore.query({ type: 'sale.recorded' });

// Get events by aggregate
const ticketEvents = eventStore.query({
  aggregate: { id: 'T-123' }
});

// Get events by aggregate type
const customerEvents = eventStore.query({
  aggregate: { type: 'customer' }
});
```

### Advanced Queries

```typescript
// Multiple event types
const loyaltyEvents = eventStore.query({
  type: ['loyalty.accrued', 'loyalty.redeemed']
});

// Specific aggregate with type filter
const customerLoyalty = eventStore.query({
  type: ['loyalty.accrued', 'loyalty.redeemed'],
  aggregate: { id: 'C-456', type: 'customer' }
});
```

### State Projection

Building current state from events:

```typescript
// Calculate customer loyalty balance
function getCustomerLoyaltyBalance(customerId: string): number {
  const events = eventStore.query({
    type: ['loyalty.accrued', 'loyalty.redeemed'],
    aggregate: { id: customerId, type: 'customer' }
  });
  
  return events.reduce((balance, event) => {
    if (event.type === 'loyalty.accrued') {
      return balance + event.payload.points;
    } else if (event.type === 'loyalty.redeemed') {
      return balance - event.payload.points;
    }
    return balance;
  }, 0);
}

// Calculate product inventory
function getProductInventory(productId: string): number {
  const events = eventStore.query({
    type: 'inventory.updated',
    aggregate: { id: productId, type: 'product' }
  });
  
  // Get the latest inventory level
  const latestEvent = events[events.length - 1];
  return latestEvent?.payload.newQuantity ?? 0;
}
```

## Event Factories

For testing and development, use event factories:

```typescript
// Create a sale event
const saleEvent = createSaleEvent({
  ticketId: 'T-123',
  lines: [{ sku: 'burger', name: 'Burger', qty: 1, price: 12.99, taxRate: 0.15 }],
  totals: { subtotal: 12.99, discount: 0, tax: 1.95, total: 14.94 }
});

// Create a loyalty event
const loyaltyEvent = createLoyaltyAccruedEvent({
  customerId: 'C-456',
  points: 13,
  saleAmount: 12.99
});
```

## Best Practices

### Event Design

1. **Immutability**: Events should never be modified after creation
2. **Descriptive Names**: Use clear, business-meaningful event names
3. **Complete Data**: Include all necessary information in the payload
4. **Backward Compatibility**: Design events to support schema evolution

### Performance

1. **Efficient Queries**: Use specific criteria to limit result sets
2. **Batch Operations**: Group related events when possible
3. **Indexing**: Ensure proper indexing for common query patterns
4. **Caching**: Cache frequently accessed projections

### Error Handling

1. **Validation**: Validate event data before appending
2. **Idempotency**: Handle duplicate events gracefully
3. **Retry Logic**: Implement retry mechanisms for transient failures
4. **Fallback**: Provide fallback strategies for critical operations

## Testing

### Unit Testing Events

```typescript
describe('Sale Events', () => {
  it('should record sale with correct data', async () => {
    const event = await eventStore.append('sale.recorded', {
      ticketId: 'T-123',
      lines: [{ sku: 'burger', name: 'Burger', qty: 1, price: 12.99, taxRate: 0.15 }],
      totals: { subtotal: 12.99, discount: 0, tax: 1.95, total: 14.94 }
    }, {
      aggregate: { id: 'T-123', type: 'ticket' }
    });
    
    expect(event.type).toBe('sale.recorded');
    expect(event.payload.totals.total).toBe(14.94);
    expect(event.aggregate.id).toBe('T-123');
  });
});
```

### Integration Testing

```typescript
describe('Loyalty System Integration', () => {
  it('should accrue and redeem points correctly', async () => {
    // Accrue points
    await eventStore.append('loyalty.accrued', {
      customerId: 'C-456',
      points: 100,
      reason: 'Purchase'
    }, {
      aggregate: { id: 'C-456', type: 'customer' }
    });
    
    // Redeem points
    await eventStore.append('loyalty.redeemed', {
      customerId: 'C-456',
      points: 50,
      discountAmount: 0.50
    }, {
      aggregate: { id: 'C-456', type: 'customer' }
    });
    
    // Verify balance
    const balance = getCustomerLoyaltyBalance('C-456');
    expect(balance).toBe(50);
  });
});
```

## Troubleshooting

### Common Issues

1. **Event Not Found**: Check event type spelling and aggregate ID
2. **Duplicate Events**: Verify idempotency handling
3. **Query Performance**: Review query criteria and indexing
4. **State Inconsistency**: Check event ordering and projection logic

### Debugging

```typescript
// Enable event logging
eventStore.on('event-appended', (event) => {
  console.log('Event appended:', event);
});

// Query all events for debugging
const allEvents = eventStore.getAll();
console.log('All events:', allEvents);

// Check specific aggregate
const aggregateEvents = eventStore.query({
  aggregate: { id: 'T-123' }
});
console.log('Aggregate events:', aggregateEvents);
```

## Migration and Versioning

### Event Schema Evolution

When evolving event schemas:

1. **Additive Changes**: Add optional fields
2. **Breaking Changes**: Create new event types
3. **Migration**: Provide migration utilities
4. **Versioning**: Consider event versioning strategies

```typescript
// Example: Adding optional field
interface SaleRecordedPayloadV2 extends SaleRecordedPayload {
  promotions?: Array<{
    id: string;
    discount: number;
  }>;
}
```

## Conclusion

The event system provides a powerful foundation for building reliable, auditable applications. By following these patterns and best practices, developers can create maintainable and scalable event-driven systems.

For additional support or questions, refer to the test files in `src/events/__tests__/` for comprehensive examples of event system usage.