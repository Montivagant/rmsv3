# Inventory Count System - Feature Overview

## What It Does

The Inventory Count feature enables restaurant operations to perform **physical inventory reconciliation** by comparing theoretical stock quantities (from the system) with actual physical counts. It's essentially a "cycle count" or "stock take" system that helps maintain accurate inventory levels.

## Core Functionality

### 1. **Count Creation Process**
- **Select Branch**: Choose which location to count (Main Restaurant, Warehouse, etc.)
- **Define Scope**: Count all items OR filter by category/supplier/storage area
- **Capture Snapshot**: System takes an immutable snapshot of current stock levels
- **Status**: Count starts as "Draft"

### 2. **Count Entry Process**
- **Open Count Session**: Staff can access the count entry interface
- **Physical Counting**: Enter actual counted quantities item by item
- **Variance Calculation**: System automatically calculates differences (actual vs theoretical)
- **Visual Indicators**: Color-coded variance alerts (green/yellow/red)
- **Auto-Save**: Changes are saved incrementally every 30 seconds

### 3. **Count Completion**
- **Validation**: Ensure at least some items have been counted
- **Adjustment Creation**: System automatically generates inventory adjustments for variances
- **Stock Updates**: Inventory levels are updated to match physical count
- **Status**: Count becomes "Closed" and immutable

## Business Flow

```
DRAFT → OPEN → CLOSED
   ↓      ↓       ↓
Create  Count   Review
Count → Items → Results
```

### **Status Transitions:**
- **Draft**: Count created but not yet started
- **Open**: Counting in progress (staff entering quantities)
- **Closed**: Count completed, adjustments applied
- **Cancelled**: Count abandoned (no stock changes)

## Module Integrations

### 🔗 **Inventory Items Module**
- **Reads**: Current stock levels for snapshot creation
- **Writes**: Updates stock levels after count completion
- **Connection**: `InventoryItem.levels.current` ↔ `CountItem.snapshotQty`

### 🔗 **Inventory Movements Module**
- **Creates**: Adjustment records for each variance
- **Purpose**: Full audit trail of all stock changes
- **Connection**: Count completion generates `InventoryMovement` records with reason "Count Adjustment"

### 🔗 **Reorder Alerts Module**
- **Triggers**: New stock levels may trigger reorder alerts
- **Purpose**: Automatic purchasing recommendations
- **Connection**: After count adjustments, system checks if items fall below reorder points

### 🔗 **Categories & Suppliers Module**
- **Used For**: Count scope filtering
- **Purpose**: Allow counting specific product groups
- **Connection**: Count scope can filter by `Category.id` or `Supplier.id`

### 🔗 **Branches/Locations Module**
- **Used For**: Multi-location count management
- **Purpose**: Each count belongs to a specific branch
- **Connection**: `InventoryCount.branchId` → `Location.id`

### 🔗 **Event System**
- **Records**: All count operations as events
- **Events**: `inventory.count.created`, `inventory.count.updated`, `inventory.count.submitted`
- **Purpose**: Complete audit trail and event sourcing

### 🔗 **RBAC (Role-Based Access)**
- **Permissions**: Only `BUSINESS_OWNER` role can create and submit counts
- **Purpose**: Restrict access to critical inventory operations
- **Connection**: Uses `getCurrentUser()` and role validation

### 🔗 **Reports Module**
- **Provides**: Count variance analysis and trends
- **Purpose**: Business intelligence on inventory accuracy
- **Connection**: Closed counts feed into inventory variance reports

## Data Flow Example

### **Typical Count Scenario:**
1. **Manager creates count** for Main Restaurant, Produce category
2. **System snapshots** current stock: 50 tomatoes (theoretical)
3. **Staff counts physically**: 47 tomatoes (actual)
4. **System calculates variance**: -3 tomatoes ($7.50 loss)
5. **Count submission creates**:
   - Inventory adjustment: -3 tomatoes
   - Movement record: "Count Adjustment - Shrinkage"
   - Updated stock level: 47 tomatoes
   - Potential reorder alert if below minimum

### **Key Business Benefits:**
- **Stock Accuracy**: True inventory levels for purchasing decisions
- **Loss Detection**: Identify theft, spoilage, or data entry errors  
- **Cost Control**: Financial impact of inventory variances
- **Compliance**: Audit trail for accounting and regulatory requirements

## Technical Implementation

### **Pages:**
- `/inventory/counts` - List all counts with filtering
- `/inventory/counts/:countId` - Count detail view
- `/inventory/counts/:countId/entry` - Count entry interface

### **Key Components:**
- `CountsList` - Main list view with status tabs
- `NewCountWizard` - Multi-step count creation
- `VarianceIndicator` - Visual variance display
- `CountStatusBadge` - Status visualization

### **API Endpoints:**
```typescript
GET    /api/inventory/counts              // List counts
POST   /api/inventory/counts              // Create count
GET    /api/inventory/counts/:id          // Get count details
PUT    /api/inventory/counts/:id/items    // Update count quantities
POST   /api/inventory/counts/:id/submit   // Submit count (create adjustments)
POST   /api/inventory/counts/:id/cancel   // Cancel count
```

### **Data Security:**
- **Immutable Snapshots**: Original quantities can't be changed after creation
- **Event Sourcing**: Complete history of all count operations
- **Audit Trail**: Who, what, when, why for all changes
- **Validation**: Business rules prevent invalid operations

## Current Status

✅ **Fully Implemented** - Production-ready with complete UI and business logic
✅ **Tested** - Comprehensive test coverage
✅ **Integrated** - Connected to all relevant modules
✅ **Accessible** - WCAG compliant interface
✅ **Mobile-Friendly** - Responsive design for tablet counting

**Route**: `http://localhost:5173/inventory/counts`
