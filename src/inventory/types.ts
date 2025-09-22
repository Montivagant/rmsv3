export interface InventoryItem {
  sku: string
  name: string
  qty: number
  unit?: string
  // Enhanced inventory properties
  reorderPoint?: number
  reorderQuantity?: number
  maxStockLevel?: number
  costPerUnit?: number
  avgCostPerUnit?: number // Weighted average cost
  lastOrderDate?: string
  lastOrderCost?: number
  category?: InventoryCategory
  isActive?: boolean
  notes?: string
  // Batch tracking
  batches?: BatchInfo[]
  // Location-specific quantities
  locationQuantities?: Record<string, number>
  primarySupplierId?: string
}

export type OversellPolicy = 'block' | 'allow_negative_alert'

export interface ComponentRequirement {
  sku: string
  qty: number
}

export interface InventoryAdjustmentReport {
  alerts?: string[]
  adjustments: Array<{
    sku: string
    oldQty: number
    newQty: number
    delta: number
  }>
}

export class OversellError extends Error {
  code = 'OVERSELL_BLOCKED' as const
  sku: string
  
  constructor(sku: string, message = `Oversell blocked for SKU: ${sku}`) {
    super(message)
    this.sku = sku
  }
}

// Advanced Inventory Management Types

export type InventoryCategory = 
  | 'food_perishable'
  | 'food_non_perishable'
  | 'beverages'
  | 'alcohol'
  | 'packaging'
  | 'cleaning_supplies'
  | 'equipment'
  | 'other';

export interface BatchInfo {
  batchId: string
  quantity: number
  expirationDate?: string
  receivedDate: string
  costPerUnit: number
  supplierId?: string
  lotNumber?: string
  isExpired?: boolean
  notes?: string
}

export interface Location {
  id: string
  name: string
  type: LocationType
  address?: LocationAddress
  isActive: boolean
  managerName?: string
  phone?: string
  email?: string
  operatingHours?: OperatingHours
  notes?: string
}

export type LocationType = 
  | 'restaurant'
  | 'warehouse'
  | 'central_kitchen'
  | 'commissary'
  | 'storage_unit';

export interface LocationAddress {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface OperatingHours {
  monday?: TimeRange
  tuesday?: TimeRange
  wednesday?: TimeRange
  thursday?: TimeRange
  friday?: TimeRange
  saturday?: TimeRange
  sunday?: TimeRange
}

export interface TimeRange {
  open: string  // "HH:MM" format
  close: string // "HH:MM" format
}


export interface StockTransfer {
  id: string
  fromLocationId: string
  toLocationId: string
  status: TransferStatus
  transferDate: string
  expectedArrivalDate?: string
  actualArrivalDate?: string
  items: TransferItem[]
  notes?: string
  createdBy: string
  approvedBy?: string
  receivedBy?: string
  shippingMethod?: string
  trackingNumber?: string
}

export type TransferStatus = 
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'in_transit'
  | 'partially_received'
  | 'fully_received'
  | 'cancelled';

export interface TransferItem {
  sku: string
  name: string
  quantityTransferred: number
  quantityReceived?: number
  unit: string
  batchId?: string
  notes?: string
}

export interface ReorderAlert {
  id: string
  sku: string
  itemName: string
  currentQuantity: number
  reorderPoint: number
  reorderQuantity: number
  locationId: string
  status: AlertStatus
  createdDate: string
  acknowledgedBy?: string
  acknowledgedDate?: string
  notes?: string
  urgencyLevel: UrgencyLevel
}

export type AlertStatus = 
  | 'active'
  | 'acknowledged'
  | 'resolved'
  | 'dismissed';

export type UrgencyLevel = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface ExpirationAlert {
  id: string
  sku: string
  itemName: string
  batchId: string
  quantity: number
  expirationDate: string
  daysUntilExpiration: number
  locationId: string
  status: AlertStatus
  createdDate: string
  notes?: string
  urgencyLevel: UrgencyLevel
}

export interface InventoryAnalytics {
  sku: string
  itemName: string
  locationId?: string
  // Turnover metrics
  turnoverRate?: number // times per year
  daysInInventory?: number
  // Usage patterns
  averageDailyUsage?: number
  averageWeeklyUsage?: number
  averageMonthlyUsage?: number
  // Cost metrics
  totalInventoryValue?: number
  averageCostPerUnit?: number
  lastPurchaseCost?: number
  // Performance indicators
  stockoutDays?: number // days out of stock in period
  overstockDays?: number // days overstocked in period
  wasteAmount?: number // quantity wasted/expired
  wasteValue?: number // value of waste
  // Forecasting
  predictedUsage30Days?: number
  predictedUsage90Days?: number
  recommendedReorderPoint?: number
  recommendedReorderQuantity?: number
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  locationId: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'partially_received' | 'fully_received' | 'cancelled';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  subtotal: number;
  taxAmount?: number;
  shippingCost?: number;
  totalAmount: number;
  items: Array<{
    sku: string;
    name: string;
    quantityOrdered: number;
    quantityReceived?: number;
    unitCost: number;
    totalCost: number;
    unit: string;
  }>;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  submittedBy?: string;
  receivedBy?: string;
}

export interface InventoryCount {
  id: string
  locationId: string
  status: CountStatus
  countDate: string
  countType: CountType
  items: InventoryCountItem[]
  discrepancies: InventoryDiscrepancy[]
  createdBy: string
  supervisedBy?: string
  notes?: string
  totalVarianceValue?: number
  snapshotTimestamp: string // When the snapshot was taken
  inventoryMovements?: InventoryMovement[] // Movements during the audit
}

export type CountStatus = 
  | 'in_progress'
  | 'completed'
  | 'approved'
  | 'rejected';

export type CountType = 
  | 'full_inventory'
  | 'partial_inventory'
  | 'cycle_count'
  | 'spot_check';

export interface InventoryCountItem {
  sku: string
  name: string
  systemQuantity: number
  countedQuantity: number
  variance: number
  variancePercentage: number
  unit: string
  countedBy: string
  notes?: string
  batchId?: string
}

export interface InventoryDiscrepancy {
  sku: string
  systemQuantity: number
  countedQuantity: number
  variance: number
  varianceValue: number
  reason?: DiscrepancyReason
  investigationNotes?: string
  resolution?: string
  resolvedBy?: string
  resolvedDate?: string
}

export type DiscrepancyReason = 
  | 'theft'
  | 'spoilage'
  | 'damage'
  | 'data_entry_error'
  | 'system_error'
  | 'unknown'
  | 'transfer_not_recorded'
  | 'sale_not_recorded';

import type { InventoryMovement } from './items/types';

// Event types for advanced inventory management

export interface ReorderAlertCreatedEvent {
  type: 'inventory.reorder_alert.created'
  payload: {
    alert: ReorderAlert
    automaticallyGenerated: boolean
  }
  at: number
  aggregate?: {
    id: string
    type: 'inventory_item'
  }
}

export interface PurchaseOrderCreatedEvent {
  type: 'inventory.purchase_order.created'
  payload: {
    purchaseOrder: PurchaseOrder
    triggeredByReorderAlert?: string
  }
  at: number
  aggregate?: {
    id: string
    type: 'purchase_order'
  }
}

export interface InventoryReceivedEvent {
  type: 'inventory.received'
  payload: {
    purchaseOrderId: string
    items: Array<{
      sku: string
      quantityReceived: number
      batchInfo?: BatchInfo
      costPerUnit: number
    }>
    receivedBy: string
    locationId: string
  }
  at: number
  aggregate?: {
    id: string
    type: 'inventory_item'
  }
}

export interface StockTransferInitiatedEvent {
  type: 'inventory.transfer.initiated'
  payload: {
    transfer: StockTransfer
  }
  at: number
  aggregate?: {
    id: string
    type: 'stock_transfer'
  }
}

export interface ExpirationAlertCreatedEvent {
  type: 'inventory.expiration_alert.created'
  payload: {
    alert: ExpirationAlert
    daysUntilExpiration: number
  }
  at: number
  aggregate?: {
    id: string
    type: 'inventory_item'
  }
}