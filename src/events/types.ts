// Base event structure
export interface BaseEvent {
  id: string;
  seq: number;
  type: string;
  at: number;
  aggregate?: {
    id: string;
    type: string;
  };
}

// Event payloads
export interface SaleRecordedPayload {
  ticketId: string;
  customerId?: string;
  lines: {
    sku?: string;
    name: string;
    qty: number;
    price: number;
    taxRate: number;
  }[];
  totals: {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  };
}

export interface InventoryAdjustedPayload {
  sku: string;
  delta: number;
  reason?: string;
}

export interface LoyaltyAccruedPayload {
  customerId: string;
  ticketId: string;
  points: number;
}

export interface LoyaltyRedeemedPayload {
  customerId: string;
  ticketId: string;
  points: number;
  value: number;
}

export interface PaymentInitiatedPayload {
  ticketId: string;
  provider: string;
  sessionId: string;
  amount: number;
  currency?: string;
  redirectUrl: string;
}

export interface PaymentSucceededPayload {
  ticketId: string;
  provider: string;
  sessionId: string;
  amount: number;
  currency?: string;
}

export interface PaymentFailedPayload {
  ticketId: string;
  provider: string;
  sessionId: string;
  amount: number;
  currency?: string;
  reason?: string;
}

export interface AuditLoggedPayload {
  action: string;
  resource: string;
  details?: Record<string, any>;
  previousValue?: any;
  newValue?: any;
  userId: string;
  userRole: string;
  userName: string;
  timestamp: number;
  userAgent?: string;
  ipAddress?: string;
}

// Typed events
export interface SaleRecordedEvent extends BaseEvent {
  type: 'sale.recorded';
  payload: SaleRecordedPayload;
}

export interface InventoryAdjustedEvent extends BaseEvent {
  type: 'inventory.adjusted';
  payload: InventoryAdjustedPayload;
}

export interface LoyaltyAccruedEvent extends BaseEvent {
  type: 'loyalty.accrued';
  payload: LoyaltyAccruedPayload;
}

export interface LoyaltyRedeemedEvent extends BaseEvent {
  type: 'loyalty.redeemed';
  payload: LoyaltyRedeemedPayload;
}

export interface PaymentInitiatedEvent extends BaseEvent {
  type: 'payment.initiated';
  payload: PaymentInitiatedPayload;
}

export interface PaymentSucceededEvent extends BaseEvent {
  type: 'payment.succeeded';
  payload: PaymentSucceededPayload;
}

export interface PaymentFailedEvent extends BaseEvent {
  type: 'payment.failed';
  payload: PaymentFailedPayload;
}

export interface AuditLoggedEvent extends BaseEvent {
  type: 'audit.logged';
  payload: AuditLoggedPayload;
}

// Union type for all events
export type Event = SaleRecordedEvent | InventoryAdjustedEvent | LoyaltyAccruedEvent | LoyaltyRedeemedEvent | PaymentInitiatedEvent | PaymentSucceededEvent | PaymentFailedEvent | AuditLoggedEvent;

// Alias for compatibility with PouchDB adapter
export type KnownEvent = Event & {
  timestamp: number; // Maps to 'at' field
  aggregateId?: string; // Maps to 'aggregate.id'
};

// Error types
export class IdempotencyConflictError extends Error {
  public readonly code = 'IDEMPOTENCY_MISMATCH';
  
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

// Event store interfaces
export interface AppendOptions {
  key: string;
  params: any;
  aggregate?: {
    id: string;
    type: string;
  };
}

export interface AppendResult {
  event: Event;
  deduped: boolean;
}

export interface IdempotencyRecord {
  event: Event;
  paramsHash: string;
}

export interface EventStore {
  append(type: string, payload: any, opts: AppendOptions): AppendResult;
  getAll(): Event[];
  getByAggregate(id: string): Event[];
  getByType(type: string): Event[];
  getByIdempotencyKey(key: string): IdempotencyRecord | undefined;
  reset(): void;
}