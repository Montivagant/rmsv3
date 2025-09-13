# Inventory System Integration

This document outlines how the different components of the inventory system are integrated and work together.

## Overview

The inventory system consists of several interconnected modules:

1. **Inventory Items** - Core inventory data management
2. **Inventory Audits** - Stock verification and adjustment
3. **Inventory Transfers** - Movement of stock between locations

## Component Integration

### Inventory Items → Counts

- Inventory Audits create a snapshot of current stock levels for selected items
- When a count is submitted, variances are calculated and stock levels are adjusted
- The system emits `inventory.adjusted` events for each item with a variance

### Inventory Items → Transfers

- Transfers move stock between locations
- When a transfer is completed, the system:
  1. Decrements stock at the source location
  2. Increments stock at the destination location
  3. Emits `inventory.adjusted` events for both locations

## Data Flow

```
┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │
│  Inventory Audits│─────▶│ Stock Ledger    │
│ (Verification)  │      │ (Adjustments)   │
│                 │      │                 │
└─────────────────┘      └─────────────────┘
        ▲                        │
┌─────────────────┐              │
│                 │              │
│  Inventory      │◀─────────────┘
│  Items          │
│                 │              ▲
└─────────────────┘              │
        ▲                        │
        │       ┌─────────────────┐  │
        │       │                 │  │
        └───────│ Transfers       │──┘
                │ (Movement)      │
                │                 │
                └─────────────────┘
```

## API Integration

All inventory modules use a consistent API pattern:

1. **Service Layer** - Business logic for each module
2. **API Layer** - HTTP endpoints for external access
3. **Event System** - Events for cross-module communication

### Key API Endpoints

- `/api/inventory/items` - Inventory item management
- `/api/inventory/counts` - Inventory Audit operations
- `/api/inventory/transfers` - Transfer operations

## Event Integration

The system uses events to maintain consistency across modules:

- `inventory.item.created` - New item added
- `inventory.item.updated` - Item details changed
- `inventory.adjusted` - Stock levels adjusted
- `inventory.count.created` - New Audit initiated
- `inventory.count.submitted` - Count completed with adjustments
- `inventory.transfer.created` - New transfer initiated
- `inventory.transfer.completed` - Transfer completed with stock movement

## Testing

The integration between these components is verified through comprehensive tests:

1. **Unit Tests** - Testing individual module functionality
2. **Integration Tests** - Testing cross-module interactions
3. **End-to-End Tests** - Testing complete workflows

See `src/__tests__/inventory/integration.test.ts` for integration test examples.

## Extending the System

When adding new functionality to the inventory system:

1. Update the appropriate service layer
2. Emit relevant events for cross-module communication
3. Update API handlers for external access
4. Add tests to verify integration with existing components
