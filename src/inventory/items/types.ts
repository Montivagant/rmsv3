/**
 * Enhanced Inventory Items System Types
 * 
 * Production-ready inventory management with UOM conversions, lot tracking,
 * storage requirements, expiry management, and comprehensive business rules.
 */

// Unit of Measure (UOM) System
export interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
  type: 'weight' | 'volume' | 'count' | 'length' | 'area';
  baseUnit?: string; // Reference to base unit for conversions
  conversionFactor?: number; // Factor to convert to base unit
  isBase?: boolean; // True if this is the base unit for this type
}

export interface UOMConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
  formula?: string; // For complex conversions
}

// Storage and Location Management
export interface StorageLocation {
  id: string;
  name: string;
  type: 'dry' | 'refrigerated' | 'frozen' | 'ambient' | 'controlled';
  zone?: string;
  capacity?: {
    value: number;
    unit: string;
  };
  temperature?: {
    min: number;
    max: number;
    unit: 'celsius' | 'fahrenheit';
  };
  humidity?: {
    min: number;
    max: number;
  };
  isActive: boolean;
}

// Lot and Batch Tracking
export interface LotInfo {
  lotNumber: string;
  batchId?: string;
  manufacturedDate?: string;
  expiryDate?: string;
  receivedDate: string;
  quantity: number;
  unit: string;
  supplierId?: string;
  notes?: string;
  isConsumed: boolean;
}

// Supplier Information
export interface SupplierInfo {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  rating?: number; // 1-5 stars
  paymentTerms?: string;
  isPreferred: boolean;
  isActive: boolean;
}

// Enhanced Inventory Item
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  
  // Unit of Measure Configuration
  uom: {
    base: string; // Base unit for storage (e.g., "kg", "pieces")
    purchase: string; // Unit used when purchasing (e.g., "case", "box")
    recipe: string; // Unit used in recipes (e.g., "g", "ml")
    conversions: UOMConversion[];
  };
  
  // Storage Requirements
  storage: {
    locationId?: string;
    requirements?: {
      temperature?: {
        min: number;
        max: number;
        unit: 'celsius' | 'fahrenheit';
      };
      humidity?: {
        min: number;
        max: number;
      };
      notes?: string;
    };
  };
  
  // Tracking Configuration
  tracking: {
    lotTracking: boolean;
    expiryTracking: boolean;
    serialTracking?: boolean;
    trackByLocation: boolean;
  };
  
  // Inventory Levels and Alerts
  levels: {
    current: number; // Current stock in base unit
    reserved: number; // Reserved/allocated stock
    available: number; // Available = current - reserved
    onOrder: number; // Stock on order
    par: {
      min: number; // Minimum stock level (triggers reorder)
      max: number; // Maximum stock level
      reorderPoint: number; // Specific reorder trigger
      reorderQuantity: number; // Quantity to order when restocking
    };
  };
  
  // Costing Information
  costing: {
    averageCost: number; // Weighted average cost per base unit
    lastCost: number; // Most recent purchase cost
    standardCost?: number; // Standard/target cost
    currency: string;
    costMethod: 'FIFO' | 'LIFO' | 'AVERAGE' | 'STANDARD';
  };
  
  // Quality and Compliance
  quality: {
    shelfLifeDays?: number;
    allergens?: string[];
    certifications?: string[]; // e.g., "Organic", "Non-GMO"
    hazmat?: boolean;
    temperatureAbuse?: {
      maxTime: number; // Minutes out of temp range before spoilage
      notes?: string;
    };
  };
  
  // Supplier Information
  suppliers: {
    primary?: SupplierInfo;
    alternatives?: SupplierInfo[];
    preferredSupplier?: string;
  };
  
  // Lots and Batches (for lot-tracked items)
  lots?: LotInfo[];
  
  // Status and Metadata
  status: 'active' | 'inactive' | 'discontinued' | 'pending';
  flags: {
    isCritical?: boolean; // Critical inventory item
    isPerishable?: boolean;
    isControlled?: boolean; // Requires special handling
    isRecipe?: boolean; // This item is a prepared recipe
    isRawMaterial?: boolean;
    isFinishedGood?: boolean;
  };
  
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastCountDate?: string;
    lastMovementDate?: string;
    notes?: string;
    tags?: string[];
  };
}

// Inventory Movement Tracking
export interface InventoryMovement {
  id: string;
  itemId: string;
  movementType: 'receipt' | 'sale' | 'adjustment' | 'transfer' | 'waste' | 'production' | 'return';
  quantity: number;
  unit: string;
  lotNumber?: string;
  batchId?: string;
  locationFrom?: string;
  locationTo?: string;
  reason?: string;
  reference?: string; // PO number, sale ID, etc.
  cost?: number;
  timestamp: string;
  performedBy: string;
  notes?: string;
}

// Stock Counts and Audits
export interface StockCount {
  id: string;
  type: 'cycle' | 'physical' | 'spot' | 'annual';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  locationId?: string;
  categoryId?: string;
  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;
  performedBy: string[];
  items: StockCountItem[];
  discrepancies: StockDiscrepancy[];
  notes?: string;
}

export interface StockCountItem {
  itemId: string;
  lotNumber?: string;
  locationId?: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  unit: string;
  countedBy: string;
  notes?: string;
}

export interface StockDiscrepancy {
  itemId: string;
  systemQuantity: number;
  countedQuantity: number;
  variance: number;
  unit: string;
  reason?: 'shrinkage' | 'theft' | 'spoilage' | 'damage' | 'error' | 'unknown';
  action?: 'adjust' | 'investigate' | 'write_off';
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
}

// Reorder Management
export interface ReorderAlert {
  id: string;
  itemId: string;
  alertType: 'below_min' | 'below_reorder' | 'overstocked' | 'expiring_soon' | 'expired';
  currentLevel: number;
  targetLevel: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  suggestedAction: string;
  suggestedQuantity?: number;
  suggestedSupplier?: string;
  createdAt: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
}

// Event Types for Inventory Items
export interface InventoryItemCreatedEvent {
  type: 'inventory.item.created';
  payload: {
    itemId: string;
    sku: string;
    name: string;
    categoryId: string;
    uom: InventoryItem['uom'];
    tracking: InventoryItem['tracking'];
    levels: InventoryItem['levels'];
    costing: InventoryItem['costing'];
    createdBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface InventoryItemUpdatedEvent {
  type: 'inventory.item.updated';
  payload: {
    itemId: string;
    changes: Partial<InventoryItem>;
    updatedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface InventoryMovementRecordedEvent {
  type: 'inventory.movement.recorded';
  payload: {
    movementId: string;
    itemId: string;
    movementType: InventoryMovement['movementType'];
    quantity: number;
    unit: string;
    lotNumber?: string;
    locationFrom?: string;
    locationTo?: string;
    cost?: number;
    performedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface StockLevelAdjustedEvent {
  type: 'inventory.stock.adjusted';
  payload: {
    itemId: string;
    previousLevel: number;
    newLevel: number;
    adjustmentQuantity: number;
    unit: string;
    reason: string;
    performedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface ReorderAlertTriggeredEvent {
  type: 'inventory.reorder.alert';
  payload: {
    alertId: string;
    itemId: string;
    alertType: ReorderAlert['alertType'];
    currentLevel: number;
    targetLevel: number;
    urgency: ReorderAlert['urgency'];
  };
  timestamp: string;
  aggregateId: string;
}

// Query and Filter Types
export interface InventoryItemQuery {
  categoryId?: string;
  status?: InventoryItem['status'];
  locationId?: string;
  supplierId?: string;
  isLotTracked?: boolean;
  isExpiring?: boolean; // Items expiring within X days
  isBelowMin?: boolean;
  isBelowReorder?: boolean;
  search?: string;
  tags?: string[];
  sortBy?: 'name' | 'sku' | 'category' | 'level' | 'cost' | 'lastMovement';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface InventoryAnalytics {
  totalItems: number;
  activeItems: number;
  lotTrackedItems: number;
  itemsBelowMin: number;
  itemsBelowReorder: number;
  expiringItems: number;
  totalValue: number;
  averageTurnover: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    itemCount: number;
    totalValue: number;
  }>;
  lowStockAlerts: ReorderAlert[];
  recentMovements: InventoryMovement[];
}

// Validation Types
export interface InventoryItemValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// Default UOM definitions for restaurant operations
export const DEFAULT_UNITS: UnitOfMeasure[] = [
  // Weight Units
  { id: 'g', name: 'Gram', abbreviation: 'g', type: 'weight', isBase: true },
  { id: 'kg', name: 'Kilogram', abbreviation: 'kg', type: 'weight', baseUnit: 'g', conversionFactor: 1000 },
  { id: 'lb', name: 'Pound', abbreviation: 'lb', type: 'weight', baseUnit: 'g', conversionFactor: 453.592 },
  { id: 'oz', name: 'Ounce', abbreviation: 'oz', type: 'weight', baseUnit: 'g', conversionFactor: 28.3495 },
  
  // Volume Units
  { id: 'ml', name: 'Milliliter', abbreviation: 'ml', type: 'volume', isBase: true },
  { id: 'l', name: 'Liter', abbreviation: 'L', type: 'volume', baseUnit: 'ml', conversionFactor: 1000 },
  { id: 'cup', name: 'Cup', abbreviation: 'cup', type: 'volume', baseUnit: 'ml', conversionFactor: 240 },
  { id: 'tbsp', name: 'Tablespoon', abbreviation: 'tbsp', type: 'volume', baseUnit: 'ml', conversionFactor: 15 },
  { id: 'tsp', name: 'Teaspoon', abbreviation: 'tsp', type: 'volume', baseUnit: 'ml', conversionFactor: 5 },
  { id: 'fl_oz', name: 'Fluid Ounce', abbreviation: 'fl oz', type: 'volume', baseUnit: 'ml', conversionFactor: 29.5735 },
  { id: 'gallon', name: 'Gallon', abbreviation: 'gal', type: 'volume', baseUnit: 'ml', conversionFactor: 3785.41 },
  
  // Count Units
  { id: 'piece', name: 'Piece', abbreviation: 'pc', type: 'count', isBase: true },
  { id: 'dozen', name: 'Dozen', abbreviation: 'dz', type: 'count', baseUnit: 'piece', conversionFactor: 12 },
  { id: 'case', name: 'Case', abbreviation: 'case', type: 'count', baseUnit: 'piece', conversionFactor: 24 },
  { id: 'box', name: 'Box', abbreviation: 'box', type: 'count', baseUnit: 'piece', conversionFactor: 1 },
  { id: 'bag', name: 'Bag', abbreviation: 'bag', type: 'count', baseUnit: 'piece', conversionFactor: 1 },
  { id: 'bottle', name: 'Bottle', abbreviation: 'btl', type: 'count', baseUnit: 'piece', conversionFactor: 1 }
];

// Common storage locations for restaurants
export const DEFAULT_STORAGE_LOCATIONS: Omit<StorageLocation, 'id'>[] = [
  {
    name: 'Main Walk-in Cooler',
    type: 'refrigerated',
    zone: 'kitchen',
    temperature: { min: 1, max: 4, unit: 'celsius' },
    isActive: true
  },
  {
    name: 'Freezer',
    type: 'frozen',
    zone: 'kitchen',
    temperature: { min: -18, max: -15, unit: 'celsius' },
    isActive: true
  },
  {
    name: 'Dry Storage',
    type: 'dry',
    zone: 'storage',
    temperature: { min: 15, max: 25, unit: 'celsius' },
    humidity: { min: 40, max: 60 },
    isActive: true
  },
  {
    name: 'Wine Cellar',
    type: 'controlled',
    zone: 'bar',
    temperature: { min: 12, max: 18, unit: 'celsius' },
    humidity: { min: 60, max: 70 },
    isActive: true
  },
  {
    name: 'Prep Area',
    type: 'ambient',
    zone: 'kitchen',
    isActive: true
  }
];
