# Inventory Transfers - Simplified Flow

## Overview

The Inventory Transfers feature enables moving stock between branch locations with a simplified, immediate stock movement flow. Unlike traditional shipping/receiving systems, our transfers complete instantly - when you complete a transfer, stock is immediately deducted from the source and added to the destination.

## Business Flow

### Transfer States

1. **DRAFT** - Initial state, can be edited, completed, or cancelled
2. **COMPLETED** - Stock has been moved, no further changes allowed
3. **CANCELLED** - Transfer was cancelled, no stock movement occurred

### Key Concepts

- **No timing/in-transit tracking** - Transfers complete instantly
- **Final quantity adjustment** - Adjust quantities during completion
- **Atomic stock movement** - Source decremented and destination incremented in one transaction
- **Branch-to-branch only** - Not for internal location movements within same facility

## Technical Implementation

### Types & Interfaces

```typescript
// Simplified transfer status
type TransferStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED';

// Transfer line with planned and final quantities
interface TransferLine {
  itemId: string;
  sku: string;
  name: string;
  unit: 'each' | 'kg' | 'L' | string;
  qtyPlanned: number;      // Entered during draft
  qtyFinal?: number;       // Set at completion (defaults to qtyPlanned)
}

// Main transfer entity
interface Transfer {
  id: string;
  code: string;              // e.g., TRF-123456
  sourceLocationId: string;
  destinationLocationId: string;
  status: TransferStatus;
  lines: TransferLine[];
  notes?: string;
  createdBy: string;
  completedBy?: string;
  cancelledBy?: string;
}
```

### API Endpoints

```typescript
// List transfers with filtering
GET /api/inventory/transfers
  ?sourceLocationId=string
  &destinationLocationId=string
  &status=DRAFT|COMPLETED|CANCELLED
  &search=string
  &page=number
  &pageSize=number

// Get single transfer
GET /api/inventory/transfers/:id

// Create new transfer (creates as DRAFT)
POST /api/inventory/transfers
Body: {
  sourceLocationId: string;
  destinationLocationId: string;
  lines: Array<{
    itemId: string;
    qtyPlanned: number;
  }>;
  notes?: string;
}

// Update draft transfer
PUT /api/inventory/transfers/:id
Body: Partial<CreateTransferRequest>

// Complete transfer (DRAFT → COMPLETED with stock movement)
POST /api/inventory/transfers/:id/complete
Body: {
  linesFinal: Array<{
    itemId: string;
    qtyFinal: number;
  }>;
}

// Cancel transfer (DRAFT → CANCELLED)
POST /api/inventory/transfers/:id/cancel
Body: {
  reason: string;
}

// Delete empty draft transfer
DELETE /api/inventory/transfers/:id
```

### Stock Movement

When a transfer is completed:

1. **Validation** - Check sufficient stock at source for each item
2. **Atomic Transaction** - In a single transaction:
   - Decrement source location stock by `qtyFinal`
   - Increment destination location stock by `qtyFinal`
   - Record stock movement events with shared `transactionId`
3. **Update Status** - Mark transfer as COMPLETED

### Business Rules

1. **Location Guards**
   - Source and destination must be different
   - Both locations must be active

2. **Quantity Rules**
   - All quantities must be positive (> 0)
   - Respect item units (whole numbers for 'each', decimals for 'kg'/'L')
   - Final quantity cannot exceed available stock at source

3. **Status Transitions**
   - Only DRAFT transfers can be edited, completed, or cancelled
   - Only empty DRAFT transfers can be deleted
   - Status changes are irreversible

4. **RBAC Permissions**
   - Create: `inventory.transfers.create`
   - Complete: `inventory.transfers.complete`
   - Cancel: `inventory.transfers.cancel`
   - View: `inventory.transfers.view`

## UI/UX Implementation

### Main Transfers Page (`/inventory/transfers`)

**Layout:**
- Header with "Create Transfer" button
- Tabbed interface: All | Drafts | Completed | Cancelled
- Filters: Source, Destination, Search
- Data table with actions per row

**Table Columns:**
- Code
- Source
- Destination
- Lines (count)
- Total Qty (planned or final)
- Status
- Actions (dropdown menu)

### New Transfer Modal

**Fields:**
1. Source Location (required dropdown)
2. Destination Location (required dropdown, filtered)
3. Items (searchable item selector with quantity inputs)
4. Notes (optional text)

**Validations:**
- Source ≠ Destination
- At least one item required
- Quantities > 0 and respect unit constraints

### Complete Transfer Drawer

**Features:**
- Warning about immediate stock movement
- Transfer summary (code, locations, notes)
- Table of items with editable final quantities
- Defaults to planned quantities
- Real-time validation of stock availability

### Design System Compliance

- **Components**: Button, Modal, Select, Input, Badge, DropdownMenu
- **Styling**: Design tokens only (no inline styles)
- **Theme**: Full dark/light mode support
- **Accessibility**: ARIA labels, focus management, keyboard navigation
- **Colors**: Using semantic color tokens (success, warning, error, etc.)

## Testing

### Unit Tests (`validation.test.ts`)
- Transfer creation validation
- Complete transfer validation with stock checks
- Status transition rules
- Quantity calculations

### Integration Tests (`TransfersList.test.tsx`)
- Component rendering
- Filter interactions
- Action menu behavior
- Pagination
- Empty states

### E2E Tests (`transfer-workflow.e2e.test.ts`)
- Complete workflow: Create → Complete → Verify
- Insufficient stock handling
- Transfer cancellation
- Draft updates
- Empty transfer deletion

## Development Setup

### Running Locally

```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Run specific test file
pnpm test validation.test.ts
```

### MSW Handlers

The feature includes complete MSW mock handlers for development:
- Full CRUD operations
- Stock tracking simulation
- Validation logic
- Error scenarios

### Adding to Routes

Ensure the route is registered in your router configuration:

```typescript
{
  path: '/inventory/transfers',
  lazy: () => import('./pages/inventory/Transfers')
}
```

## Common Use Cases

### Weekly Stock Replenishment
1. Warehouse manager creates transfer to restaurant
2. Adds common items with standard quantities
3. Restaurant manager confirms receipt with actual quantities
4. Stock levels update immediately

### Emergency Stock Transfer
1. Restaurant A running low on items
2. Manager checks Restaurant B has excess
3. Creates transfer B → A
4. Completes immediately to update both locations

### Consolidation
1. Closing a location temporarily
2. Create multiple transfers to move stock
3. Each transfer moves specific categories
4. Complete as items are physically moved

## Troubleshooting

### "Insufficient Stock" Error
- Check current stock levels at source
- Reduce final quantities to available amounts
- Consider partial transfers

### Cannot Complete Transfer
- Verify transfer is in DRAFT status
- Check user has completion permissions
- Ensure all quantities are valid

### Performance Considerations
- Limit transfers to 100 items maximum
- Use pagination for large transfer lists
- Implement search debouncing (300ms)

## Future Enhancements

While keeping the simple flow, potential additions:
- Transfer templates for common movements
- Bulk transfer creation
- Transfer history reporting
- Stock reservation during draft
- Email notifications on completion
- Barcode scanning for item selection
