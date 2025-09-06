# Inventory Count (Cycle Count) - Feature Documentation

**Feature**: Inventory Count & Cycle Count Management  
**Status**: ✅ **IMPLEMENTED**  
**Version**: v3.1.0  
**Integration**: Seamless integration with existing inventory system

## Overview

The Inventory Count feature enables restaurant operations to perform physical inventory reconciliation by comparing theoretical stock quantities (from sales/receiving/adjustments) with actual physical counts. The system captures snapshots, calculates variances, and automatically creates inventory adjustments to maintain accurate stock levels.

## Business Value

### **Core Benefits**
- **Stock Accuracy**: Maintain precise inventory levels for better decision making
- **Shrinkage Detection**: Identify theft, waste, or data entry errors
- **Cost Control**: Accurate variance calculations with financial impact analysis
- **Compliance**: Complete audit trail for inventory reconciliation
- **Operational Efficiency**: Streamlined counting process with mobile-friendly interface

### **Operational Impact**
- **Reduce Stock Outages**: Better visibility into actual inventory levels
- **Optimize Purchasing**: Accurate stock levels improve reorder decisions  
- **Minimize Waste**: Early detection of discrepancies and shrinkage patterns
- **Improve Profit Margins**: Accurate cost calculations and variance tracking

## User Workflows

### **1. Count Management Workflow**
```
Manager → Inventory → Counts → New Count
├── Select Branch (required)
├── Define Scope:
│   ├── All Items, OR
│   ├── Filter by Category/Supplier/Storage Area, OR  
│   └── Import CSV Item List (optional)
├── Create Count (captures snapshot)
└── Count Status: Draft
```

### **2. Count Entry Workflow**
```
Staff → Open Count Session → Count Entry Table
├── Search/Filter Items
├── Enter Counted Quantities  
├── Review Variance Indicators
├── Add Notes for Discrepancies
├── Save Draft (incremental saves)
└── Submit & Close (creates adjustments)
```

### **3. Count Review Workflow**
```
Manager → Closed Count → Review Results
├── Variance Summary & Totals
├── Discrepancy Analysis
├── Generated Adjustments Review
├── Export Count Results (CSV)
└── Audit Trail Review
```

## Technical Architecture

### **Data Model Integration**

#### **Enhanced Count Types** (Builds on existing)
```typescript
interface InventoryCount {
  id: string;
  branchId: string;               // Links to existing Location.id
  status: CountStatus;            // 'draft' | 'open' | 'closed' | 'cancelled'  
  createdBy: string;
  createdAt: string;
  closedBy?: string;
  closedAt?: string;
  
  scope: CountScope;              // Flexible scope definition
  totals: CountTotals;            // Calculated variance totals
  metadata: CountMetadata;        // Additional tracking data
}

interface CountItem {
  id: string;
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  
  // Snapshot data (immutable after creation)
  snapshotQty: number;            // Theoretical quantity at count start
  snapshotAvgCost: number;        // Average cost at count start
  
  // Count entry (mutable during count)
  countedQty: number | null;      // null = not yet counted
  countedBy?: string;
  countedAt?: string;
  notes?: string;
  
  // Calculated fields (derived)
  varianceQty: number;            // countedQty - snapshotQty
  varianceValue: number;          // varianceQty * snapshotAvgCost
}
```

#### **Integration Points**
```typescript
// Leverages existing systems:
- InventoryItem.levels.current     # Source for snapshot quantities
- InventoryItem.costing.averageCost # Source for snapshot costs  
- InventoryMovement ('adjustment')  # Target for variance adjustments
- StockLevelAdjustedEvent          # Event sourcing integration
- Location system                  # Branch-based counting
```

### **API Contract**

#### **Count Management**
```typescript
GET /api/inventory/counts
  ?branch=string&status=string&page=number&pageSize=number
  → { data: InventoryCount[], total: number, page: number, pageSize: number }

POST /api/inventory/counts  
  body: { branchId: string, scope: CountScope }
  → { countId: string, itemCount: number }

GET /api/inventory/counts/:id
  → InventoryCount with populated CountItem[]
```

#### **Count Operations**
```typescript
PUT /api/inventory/counts/:id/items
  body: { itemId: string, countedQty: number, notes?: string }[]
  → { saved: number, errors?: FieldError[] }

POST /api/inventory/counts/:id/submit
  body: { confirmation: boolean, notes?: string }
  → { adjustmentBatchId: string, adjustments: Adjustment[] }

POST /api/inventory/counts/:id/cancel  
  body: { reason: string }
  → { success: boolean }
```

#### **Count Data Export**
```typescript
GET /api/inventory/counts/:id/export
  ?format=csv
  → CSV file with count results and variance analysis
```

## User Interface Design

### **Count List Page** (`/inventory/counts`)
```typescript
// Main count management interface
Features:
- Tabbed view: All | Draft | Open | Closed | Cancelled
- Filterable table: Branch, Creator, Date Range, Status  
- Sortable columns: Count #, Branch, Created, Status, Items, Variance
- Virtualized rows for large count histories
- Actions: View, Resume (draft/open), Export (closed)

Design System:
- Uses CustomerTable virtualization patterns
- Table components with design tokens
- StatusBadge for count status visualization
- VarianceIndicator for financial impact display
```

### **New Count Wizard**
```typescript
// Multi-step count creation
Step 1: Branch Selection
- Dropdown of active locations
- Required field with validation

Step 2: Scope Definition  
- Radio buttons: All Items | Filtered Items | Import CSV
- Filter options: Category, Supplier, Storage Area (multi-select)
- CSV upload with basic validation (optional)

Step 3: Confirmation
- Summary of selection (branch, scope, estimated item count)
- Create button (disabled until valid)

Design System:
- Modal component with step navigation
- Form controls with design tokens
- Progress indicator for wizard steps
```

### **Count Entry Session** (`/inventory/counts/:id`)
```typescript
// Main counting interface
Header:
- Count metadata (branch, creator, status, last saved)
- Action buttons: Save Draft, Submit & Close, Cancel

Items Table (Virtualized):
- Columns: Item, SKU, Unit, Theoretical Qty, Counted Qty, Variance, Value
- Inline editing for counted quantities
- Real-time variance calculation
- Color coding for variances (green/yellow/red)
- Search and filter toolbar

Footer Summary:
- Total items, counted items, total variance (qty & value)
- Submit button (disabled until requirements met)

Design System:
- Table virtualization (CustomerTable patterns)
- Inline editing with Input components
- VarianceIndicator component for visual feedback
- Real-time calculation without inline styles
```

### **Count Review (Read-only)**
```typescript
// Closed count review interface  
Features:
- Read-only count results
- Variance breakdown and analysis
- Link to generated adjustment batch
- Export functionality (CSV)
- Audit trail of count progression

Design System:
- Read-only table with same design tokens
- Export button using existing patterns
- Audit log component (reusable)
```

## Business Rules Implementation

### **Count Session Management**
```typescript
// Status transitions:
Draft → Open → Closed (normal flow)
Draft → Cancelled (abandoned count)  
Open → Cancelled (emergency cancellation)

// Business rules:
- Only BUSINESS_OWNER can create/submit counts
- Only one active count per branch/scope combination
- Draft counts can be edited/deleted
- Open counts can be counted but not scope-modified
- Closed counts are immutable (read-only)
```

### **Snapshot System**
```typescript
// Theoretical quantity snapshot (immutable):
snapshotQty = InventoryItem.levels.current (at count creation)
snapshotAvgCost = InventoryItem.costing.averageCost (at count creation)

// Ensures consistent variance calculation even if:
- Sales occur during counting
- Receipts arrive during counting  
- Other adjustments happen during counting
```

### **Variance Calculation**
```typescript
// Real-time calculation:
varianceQty = countedQty - snapshotQty
varianceValue = varianceQty * snapshotAvgCost

// Rounding rules:
- Quantities: Match item unit precision
- Values: Currency precision (2 decimal places)
- Use system rounding rules (half-up)
```

### **Adjustment Integration**
```typescript
// On count submission:
1. Validate: At least one item counted
2. Generate: InventoryMovement records for each variance
3. Create: StockLevelAdjustedEvent for each adjustment
4. Update: InventoryItem.levels.current with new quantities
5. Audit: Link adjustments to count session ID
6. Notify: Generate reorder alerts if new levels trigger thresholds
```

## Data Security & Audit Trail

### **Event Sourcing Integration**
```typescript
// New event types:
- 'inventory.count.created'    # Count session started
- 'inventory.count.updated'    # Count data saved  
- 'inventory.count.submitted'  # Count completed and adjustments made
- 'inventory.count.cancelled'  # Count abandoned
```

### **Audit Requirements**
```typescript
// Complete audit trail:
- Who created the count (user, timestamp)
- What items were included (scope definition)
- When quantities were entered (field-level timestamps)
- Why adjustments were made (variance analysis)
- How adjustments affected stock (before/after quantities)
```

### **Data Integrity**
```typescript
// Immutable snapshot ensures:
- Consistent variance calculations
- No retroactive data changes affecting counts
- Reliable audit trail for compliance
- Accurate financial impact assessment
```

## Performance & Scalability

### **Large Dataset Handling**
```typescript
// Virtualization strategy:
- Count list: react-window for 1000+ count sessions
- Count entry: virtualized table for 10,000+ items  
- Search: debounced (300ms) with server-side filtering
- Pagination: server-side with cursor-based navigation
```

### **Real-time Features**
```typescript
// Incremental saves:
- Auto-save every 30 seconds during entry
- Real-time variance calculation (no API calls)
- Optimistic updates with rollback capability
- Network resilience with offline draft capability
```

## Mobile & Accessibility

### **Mobile Optimization**
```typescript
// Touch-friendly interface:
- Large target sizes for quantity inputs (44px minimum)
- Gesture support for table scrolling
- Optimized keyboard for number entry
- Portrait/landscape responsive layouts
```

### **Accessibility Compliance**
```typescript
// WCAG AA standards:
- Table semantics with proper headers
- Screen reader support for variance announcements
- Keyboard navigation throughout interface
- Color contrast ≥4.5:1 for text, ≥3:1 for variance indicators
- Focus management in modal workflows
```

## Integration Points

### **Existing System Integration**
```typescript
// Seamless integration with:
- Inventory Dashboard (count summaries)
- Adjustment History (linked adjustments)  
- Reorder Alerts (triggered by new levels)
- Supplier Management (scope filtering)
- Category Management (scope filtering)
- Event System (complete audit trail)
```

### **Future Enhancement Hooks**
```typescript
// Prepared for future features:
- Physical scanner integration (keyboard input ready)
- Advanced import templates (CSV framework ready)  
- Multi-location counting (architecture supports)
- Scheduled counting (timer framework ready)
- Mobile app integration (API-first design)
```

---

**Implementation Status**: 🚀 **READY FOR DEVELOPMENT**  
**Architecture Alignment**: ✅ **PERFECT MATCH**  
**User Experience**: 📱 **MOBILE-FRIENDLY & ACCESSIBLE**  
**Business Value**: 💰 **HIGH IMPACT ON OPERATIONS**
