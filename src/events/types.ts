export interface Event {
  id: string
  seq: number
  type: string
  at: number
  version?: number // Optional for backward compatibility
  aggregate: {
    id: string
    type: string
  }
  payload?: any
}

export type KnownEvent = 
  | SaleRecordedEvent
  | InventoryAdjustedEvent
  | InventorySnapshotEvent
  | CustomerProfileUpsertedEvent
  | CustomerLoyaltyAdjustedEvent
  | LoyaltyAccruedEvent
  | LoyaltyRedeemedEvent
  | PaymentInitiatedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | AuditLoggedEvent
  | ZReportFinalizedEvent
  | TaxRateCreatedEvent
  | TaxRateUpdatedEvent
  | TaxCalculationPerformedEvent
  | TaxExemptionAppliedEvent
  | TaxReportGeneratedEvent
  | ReorderAlertCreatedEvent
  | PurchaseOrderCreatedEvent
  | InventoryReceivedEvent
  | StockTransferInitiatedEvent
  | ExpirationAlertCreatedEvent
  | BatchCreatedEvent
  | BatchConsumedEvent
  | BatchExpiredEvent
  | BatchWastedEvent
  | SupplierCreatedEvent
  | SupplierUpdatedEvent
  | DeliveryReceivedEvent
  | ShiftStartedEvent
  | ShiftEndedEvent
  | OrderCreatedEvent
  | OrderStatusUpdatedEvent
  | { type: 'sale.recorded.v1', payload: SaleRecordedPayload, at: number, id: string, seq: number, aggregate: { id: string, type: string } }
  | { type: 'sale.recorded.v2', payload: SaleRecordedPayload, at: number, id: string, seq: number, aggregate: { id: string, type: string } }
  | { type: 'inventory.adjusted.v1', payload: InventoryAdjustedPayload, at: number, id: string, seq: number, aggregate: { id: string, type: string } }
  | { type: 'payment.failed.v1', payload: PaymentFailedPayload, at: number, id: string, seq: number, aggregate: { id: string, type: string } }
  | { type: 'audit.logged.v1', payload: AuditLoggedPayload, at: number, id: string, seq: number, aggregate: { id: string, type: string } }
  | { type: 'inventory.reorder_alert.created.v1', payload: any, at: number, id: string, seq: number, aggregate: { id: string, type: string } }

export interface SaleRecordedEvent extends Event {
  type: 'sale.recorded'
  payload: SaleRecordedPayload
}

export interface SaleRecordedPayload {
  ticketId: string
  lines: Array<{
    sku?: string
    name: string
    qty: number
    price: number
    taxRate: number
  }>
  totals: {
    subtotal: number
    discount: number
    tax: number
    total: number
  }
  customerId?: string
  notes?: string
}

export interface InventoryAdjustedEvent extends Event {
  type: 'inventory.adjusted'
  payload: InventoryAdjustedPayload
}

export interface InventoryAdjustedPayload {
  sku: string
  oldQty: number
  newQty: number
  reason: string
  delta?: number
  reference?: string
  actorId?: string
}

export interface InventorySnapshotEvent extends Event {
  type: 'inventory.snapshot.set'
  payload: {
    sku: string
    quantity: number
    reason?: string
    recordedAt: number
    recordedBy?: string
  }
}

export interface CustomerProfileUpsertedEvent extends Event {
  type: 'customer.profile.upserted'
  payload: {
    customerId: string
    name: string
    email?: string
    phone?: string
    loyaltyPoints: number
    visits: number
    totalSpent: number
    lastVisit?: number
    tags?: string[]
    createdAt: number
    updatedAt: number
    metadata?: Record<string, unknown>
  }
}

export interface CustomerLoyaltyAdjustedEvent extends Event {
  type: 'customer.loyalty.adjusted'
  payload: {
    customerId: string
    delta: number
    reason: string
    balance: number
    adjustedAt: number
    adjustedBy?: string
  }
}

export interface LoyaltyAccruedEvent extends Event {
  type: 'loyalty.accrued'
  payload: LoyaltyAccruedPayload
}

export interface LoyaltyAccruedPayload {
  customerId: string
  points: number
  ticketId: string
  amount: number
}

export interface LoyaltyRedeemedEvent extends Event {
  type: 'loyalty.redeemed'
  payload: LoyaltyRedeemedPayload
}

export interface LoyaltyRedeemedPayload {
  customerId: string
  points: number
  value: number
  ticketId: string
}

export interface PaymentInitiatedEvent extends Event {
  type: 'payment.initiated'
  payload: PaymentInitiatedPayload
}

export interface PaymentInitiatedPayload {
  ticketId: string
  amount: number
  provider: string
  sessionId: string
  currency?: string
}

export interface PaymentSucceededEvent extends Event {
  type: 'payment.succeeded'
  payload: PaymentSucceededPayload
}

export interface PaymentSucceededPayload {
  ticketId: string
  amount: number
  provider: string
  sessionId: string
  currency?: string
}

export interface PaymentFailedEvent extends Event {
  type: 'payment.failed'
  payload: PaymentFailedPayload
}

export interface PaymentFailedPayload {
  ticketId: string
  amount: number
  provider: string
  sessionId: string
  currency?: string
  reason?: string
  orderId?: string;
}

export interface AuditLoggedPayload {
  userId: string
  userRole: string
  userName: string
  action: string
  resource: string
  details?: Record<string, any>
  previousValue?: any
  newValue?: any
  timestamp: number
  userAgent?: string
  ipAddress?: string
  message?: string;
}

export interface AuditLoggedEvent extends Event {
  type: 'audit.logged'
  payload: AuditLoggedPayload
}

export interface ZReportFinalizedEvent extends Event {
  type: 'z-report.finalized'
  payload: ZReportFinalizedPayload
}

export interface ZReportFinalizedPayload {
  reportId: string
  reportNumber: number
  businessDate: string
  operatorId: string
  operatorName: string
  salesSummary: {
    grossSales: number
    totalDiscounts: number
    netSales: number
    totalTax: number
    finalTotal: number
    transactionCount: number
    itemCount: number
    averageTicket: number
  }
  paymentSummary: {
    cash: { count: number; amount: number }
    card: { count: number; amount: number }
    other: { count: number; amount: number }
    total: { count: number; amount: number }
  }
  taxSummary: Array<{
    rate: number
    taxableAmount: number
    taxAmount: number
  }>
  topItems: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  discountSummary: {
    totalDiscounts: number
    discountCount: number
    loyaltyDiscounts: number
    manualDiscounts: number
  }
  finalizedAt: string
  finalizedBy: string
  cashReconciliation: {
    expectedCash: number
    actualCash: number
    variance: number
    notes: string
  }
}

export type OrderStatus = 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface OrderItemPayload {
  id: string;
  name?: string;
  categoryId?: string;
  quantity: number;
  price: number;
}

export interface OrderCreatedEvent extends Event {
  type: 'order.created'
  payload: {
    orderId: string;
    ticketId: string;
    branchId: string;
    source: string;
    status: OrderStatus;
    items: OrderItemPayload[];
    totals: { subtotal: number; discount: number; tax: number; total: number };
    discount?: number;
    customerId?: string;
    customerName?: string;
    notes?: string;
    channel?: string;
    createdAt: number;
  }
}

export interface OrderStatusUpdatedEvent extends Event {
  type: 'order.status.updated'
  payload: {
    orderId: string;
    status: OrderStatus;
    previousStatus?: OrderStatus;
    updatedAt: number;
    actorId?: string;
    actorName?: string;
    reason?: string;
  }
}

export interface AppendOptions {
  key: string
  params?: any
  timestamp?: number
  aggregate?: {
    id: string
    type: string
  }
}

export interface AppendResult {
  event: Event
  isNew: boolean
  deduped: boolean
}

export interface IdempotencyRecord {
  eventId: string
  paramsHash: string
}

export interface EventStore {
  append(type: string, payload: any, options: AppendOptions): AppendResult
  getAll(): Event[]
  getEventsForAggregate(aggregateId: string): Event[]
  query(filter?: any): Event[]
  reset(): Promise<void>
}

export class IdempotencyConflictError extends Error {
  code = 'IDEMPOTENCY_CONFLICT' as const
  
  constructor(message: string) {
    super(message)
    this.name = 'IdempotencyConflictError'
  }
}

// Tax Management Events
export interface TaxRateCreatedEvent extends Event {
  type: 'tax.rate.created'
  payload: {
    taxRate: any; // Will be fully typed when tax types are imported
    createdBy: string;
  }
}

export interface TaxRateUpdatedEvent extends Event {
  type: 'tax.rate.updated'
  payload: {
    taxRateId: string;
    changes: any;
    previousValues: any;
    updatedBy: string;
  }
}

export interface TaxCalculationPerformedEvent extends Event {
  type: 'tax.calculation.performed'
  payload: {
    input: any;
    result: any;
    saleId?: string;
  }
}

export interface TaxExemptionAppliedEvent extends Event {
  type: 'tax.exemption.applied'
  payload: {
    exemptionId: string;
    customerId: string;
    certificateId?: string;
    appliedToSale: string;
    savedAmount: number;
  }
}

export interface TaxReportGeneratedEvent extends Event {
  type: 'tax.report.generated'
  payload: {
    reportId: string;
    reportType: string;
    periodStart: string;
    periodEnd: string;
    jurisdiction: any;
    generatedBy: string;
    totalTaxCollected: number;
    totalExemptions: number;
  }
}

// Advanced Inventory Management Events
export interface ReorderAlertCreatedEvent extends Event {
  type: 'inventory.reorder_alert.created'
  payload: {
    alert: any; // ReorderAlert type
    automaticallyGenerated: boolean;
  }
}

export interface PurchaseOrderCreatedEvent extends Event {
  type: 'inventory.purchase_order.created'
  payload: {
    purchaseOrder: any; // PurchaseOrder type
    triggeredByReorderAlert?: string;
  }
}

export interface InventoryReceivedEvent extends Event {
  type: 'inventory.received'
  payload: {
    purchaseOrderId: string;
    items: Array<{
      sku: string;
      quantityReceived: number;
      batchInfo?: any; // BatchInfo type
      costPerUnit: number;
    }>;
    receivedBy: string;
    locationId: string;
  }
}

export interface StockTransferInitiatedEvent extends Event {
  type: 'inventory.transfer.initiated'
  payload: {
    transfer: any; // StockTransfer type
  }
}

export interface ExpirationAlertCreatedEvent extends Event {
  type: 'inventory.expiration_alert.created'
  payload: {
    alert: any; // ExpirationAlert type
    daysUntilExpiration: number;
  }
}

export interface BatchCreatedEvent extends Event {
  type: 'inventory.batch.created'
  payload: {
    batchId: string;
    sku: string;
    batchInfo: any; // BatchInfo type
    locationId: string;
  }
}

export interface BatchConsumedEvent extends Event {
  type: 'inventory.batch.consumed'
  payload: {
    consumption: any; // BatchConsumption type
    sku: string;
    remainingBatchQuantity: number;
  }
}

export interface BatchExpiredEvent extends Event {
  type: 'inventory.batch.expired'
  payload: {
    batchId: string;
    expiredDate: string;
    quantity: number;
  }
}

export interface BatchWastedEvent extends Event {
  type: 'inventory.batch.wasted'
  payload: {
    batchId: string;
    wasteQuantity: number;
    reason: string;
    markedBy: string;
    wasteDate: string;
    wasteValue: number;
  }
}

// Supplier events
export interface SupplierCreatedEvent extends Event {
  type: 'inventory.supplier.created',
  payload: {
    supplier: any; // Supplier type
    createdBy: string;
  }
}

export interface SupplierUpdatedEvent extends Event {
  type: 'inventory.supplier.updated',
  payload: {
    supplierId: string;
    changes: any;
    updatedBy: string;
  }
}


export interface DeliveryReceivedEvent extends Event {
  type: 'inventory.delivery.received'
  payload: {
    purchaseOrderId: string;
    receivedItems: Array<{
      sku: string;
      quantityReceived: number;
      condition: 'good' | 'damaged' | 'expired';
      notes?: string;
    }>;
    receivedBy: string;
    actualDeliveryDate: string;
  }
}

export interface ShiftStartedEvent extends Event {
  type: 'shift.started'
  payload: {
    userId: string
    userName: string
    startedAt: number
  }
}

export interface ShiftEndedEvent extends Event {
  type: 'shift.ended'
  payload: {
    userId: string
    userName: string
    startedAt: number
    endedAt: number
  }
}




