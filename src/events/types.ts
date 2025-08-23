export interface Event {
  id: string
  seq: number
  type: string
  at: number
  aggregate: {
    id: string
    type: string
  }
  payload?: any
}

export type KnownEvent = 
  | SaleRecordedEvent
  | InventoryAdjustedEvent
  | LoyaltyAccruedEvent
  | LoyaltyRedeemedEvent
  | PaymentInitiatedEvent
  | PaymentSucceededEvent
  | PaymentFailedEvent
  | AuditLoggedEvent
  | ZReportFinalizedEvent

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

export interface AppendOptions {
  key?: string
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
  reset(): Promise<void>
}

export class IdempotencyConflictError extends Error {
  code = 'IDEMPOTENCY_CONFLICT' as const
  
  constructor(message: string) {
    super(message)
    this.name = 'IdempotencyConflictError'
  }
}