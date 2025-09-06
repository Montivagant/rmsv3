# Inventory System Integration

This document outlines how the different components of the inventory system are integrated and work together.

## Overview

The inventory system consists of several interconnected modules:

1. **Inventory Items** - Core inventory data management
2. **Inventory Counts** - Stock verification and adjustment
3. **Count Sheets** - Reusable templates for inventory counts
4. **Inventory Transfers** - Movement of stock between locations

## Component Integration

### Inventory Items → Counts

- Inventory counts create a snapshot of current stock levels for selected items
- When a count is submitted, variances are calculated and stock levels are adjusted
- The system emits `inventory.adjusted` events for each item with a variance

### Inventory Items → Count Sheets

- Count sheets define criteria for selecting inventory items
- When a count sheet is used, the system resolves the criteria to actual inventory items
- This creates a dynamic selection of items based on current inventory data
- Count sheets can filter by category, supplier, storage area, tags, and zero-stock status

### Count Sheets → Counts

- Count sheets can be used to initiate new inventory counts
- When starting a count from a sheet, the system:
  1. Resolves the sheet criteria to actual inventory items
  2. Creates a snapshot of those items' current stock levels
  3. Generates a new count with those items
  4. Records usage of the count sheet (`lastUsedAt` timestamp)

### Inventory Items → Transfers

- Transfers move stock between locations
- When a transfer is completed, the system:
  1. Decrements stock at the source location
  2. Increments stock at the destination location
  3. Emits `inventory.adjusted` events for both locations

## Data Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Count Sheets   │─────▶│ Inventory Counts│─────▶│ Stock Ledger    │
│  (Templates)    │      │ (Verification)  │      │ (Adjustments)   │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                         ▲
┌─────────────────┐                                      │
│                 │                                      │
│  Inventory      │◀─────────────────────────────────────┘
│  Items          │
│                 │                                      ▲
└─────────────────┘                                      │
        ▲                                                │
        │                           ┌─────────────────┐  │
        │                           │                 │  │
        └───────────────────────────│ Transfers       │──┘
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
- `/api/inventory/counts` - Inventory count operations
- `/api/inventory/count-sheets` - Count sheet management
- `/api/inventory/transfers` - Transfer operations

## Event Integration

The system uses events to maintain consistency across modules:

- `inventory.item.created` - New item added
- `inventory.item.updated` - Item details changed
- `inventory.adjusted` - Stock levels adjusted
- `inventory.count.created` - New count initiated
- `inventory.count.submitted` - Count completed with adjustments
- `inventory.countSheet.created` - New count sheet template created
- `inventory.countSheet.used` - Count sheet used to start a count
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
