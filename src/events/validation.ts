import { z, ZodError } from 'zod';
// Removed unused imports - these types are no longer used in this file

// Base event schema with versioning
export const BaseEventSchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
  seq: z.number().int().positive('Sequence must be positive'),
  type: z.string().min(1, 'Event type is required'),
  at: z.number().int().positive('Timestamp must be positive'),
  version: z.number().int().min(1, 'Version must be at least 1').default(1),
  aggregate: z.object({
    id: z.string().min(1, 'Aggregate ID is required'),
    type: z.string().min(1, 'Aggregate type is required')
  }),
  payload: z.unknown().optional()
});

// Versioned event base type
export type VersionedEvent = z.infer<typeof BaseEventSchema>;

// Event validation error
export class EventValidationError extends Error {
  public readonly eventType: string;
  public readonly version: number;
  public readonly issues: ZodError['issues'];
  
  constructor(
    message: string,
    eventType: string,
    version: number,
    issues: ZodError['issues']
  ) {
    super(message);
    this.name = 'EventValidationError';
    this.eventType = eventType;
    this.version = version;
    this.issues = issues;
  }
}

// Sale recorded event schemas (v1 and v2 examples)
export const SaleRecordedPayloadV1 = z.object({
  ticketId: z.string().min(1),
  lines: z.array(z.object({
    sku: z.string().optional(),
    name: z.string().min(1),
    qty: z.number().positive(),
    price: z.number().nonnegative(),
    taxRate: z.number().nonnegative().max(1)
  })),
  totals: z.object({
    subtotal: z.number().nonnegative(),
    discount: z.number().nonnegative(),
    tax: z.number().nonnegative(),
    total: z.number().nonnegative()
  }),
  customerId: z.string().optional(),
  paymentMethod: z.enum(['cash', 'card', 'loyalty']).default('cash').optional(),
  source: z.enum(['pos', 'online', 'mobile']).default('pos').optional()
});

export const SaleRecordedEventV1 = BaseEventSchema.extend({
  type: z.literal('sale.recorded.v1'),
  version: z.literal(1),
  payload: SaleRecordedPayloadV1
});

// V2 adds payment method and source
export const SaleRecordedPayloadV2 = SaleRecordedPayloadV1.extend({
  paymentMethod: z.enum(['cash', 'card', 'loyalty']).default('cash'),
  source: z.enum(['pos', 'online', 'mobile']).default('pos'),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const SaleRecordedEventV2 = BaseEventSchema.extend({
  type: z.literal('sale.recorded.v2'),
  version: z.literal(2),
  payload: SaleRecordedPayloadV2
});

export const PaymentFailedPayloadV1 = z.object({
  ticketId: z.string(),
  amount: z.number(),
  provider: z.string(),
  sessionId: z.string(),
  currency: z.string().optional(),
  reason: z.string().optional(),
  orderId: z.string().optional()
});

export const AuditLoggedPayloadV1 = z.object({
  userId: z.string(),
  userRole: z.string(),
  userName: z.string(),
  action: z.string(),
  resource: z.string(),
  details: z.record(z.string(), z.any()).optional(),
  previousValue: z.any().optional(),
  newValue: z.any().optional(),
  timestamp: z.number(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  message: z.string().optional()
});

// Customer events
export const CustomerProfileUpsertedPayloadV1 = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  loyaltyPoints: z.number().nonnegative(),
  visits: z.number().nonnegative(),
  totalSpent: z.number().nonnegative(),
  lastVisit: z.number().optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const CustomerProfileUpsertedEventV1 = BaseEventSchema.extend({
  type: z.literal('customer.profile.upserted.v1'),
  version: z.literal(1),
  payload: CustomerProfileUpsertedPayloadV1
});

// Menu category events
export const MenuCategoryCreatedPayloadV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Category name is required'),
  reference: z.string().min(1, 'Category reference is required'),
  isActive: z.boolean().default(true)
});

export const MenuCategoryCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('menu.category.created.v1'),
  version: z.literal(1),
  payload: MenuCategoryCreatedPayloadV1
});

export const MenuCategoryUpdatedPayloadV1 = z.object({
  id: z.string().min(1),
  changes: z.object({
    name: z.string().min(1).optional(),
    reference: z.string().min(1).optional(),
    isActive: z.boolean().optional()
  })
});

export const MenuCategoryUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('menu.category.updated.v1'),
  version: z.literal(1),
  payload: MenuCategoryUpdatedPayloadV1
});

// Inventory events
export const InventoryAdjustedPayloadV1 = z.object({
  sku: z.string().min(1),
  oldQty: z.number().nonnegative(),
  newQty: z.number().nonnegative(),
  reason: z.string().min(1),
  delta: z.number().optional(),
  reference: z.string().optional(),
  actorId: z.string().optional()
});

export const InventoryAdjustedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.adjusted.v1'),
  version: z.literal(1),
  payload: InventoryAdjustedPayloadV1
});

// Event schema registry
export const EVENT_SCHEMAS = {
  'sale.recorded.v1': SaleRecordedEventV1,
  'sale.recorded.v2': SaleRecordedEventV2,
  'customer.profile.upserted.v1': CustomerProfileUpsertedEventV1,
  'menu.category.created.v1': MenuCategoryCreatedEventV1,
  'menu.category.updated.v1': MenuCategoryUpdatedEventV1,
  'inventory.adjusted.v1': InventoryAdjustedEventV1,
} as const;

export type EventSchemaRegistry = typeof EVENT_SCHEMAS;
export type ValidEventType = keyof EventSchemaRegistry;

/**
 * Validate event against its schema
 */
export function validateEvent<T extends ValidEventType>(
  eventType: T,
  event: unknown
): any {
  const schema = EVENT_SCHEMAS[eventType];
  if (!schema) {
    throw new EventValidationError(
      `Unknown event type: ${eventType}`,
      eventType,
      1,
      []
    );
  }

  try {
    return schema.parse(event);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new EventValidationError(
        `Event validation failed for ${eventType}`,
        eventType,
        1,
        error.issues
      );
    }
    throw error;
  }
}

/**
 * Get event version from event type
 */
export function getEventVersion(eventType: string): number {
  const versionMatch = eventType.match(/\.v(\d+)$/);
  return versionMatch ? parseInt(versionMatch[1], 10) : 1;
}

/**
 * Get base event type without version
 */
export function getBaseEventType(eventType: string): string {
  return eventType.replace(/\.v\d+$/, '');
}

/**
 * Migrate event to latest version
 */
export function migrateEventToLatest(event: VersionedEvent): VersionedEvent {
  const baseType = getBaseEventType(event.type);
  const currentVersion = getEventVersion(event.type);
  
  // Example migration for sale.recorded v1 → v2
  if (baseType === 'sale.recorded' && currentVersion === 1) {
    return {
      ...event,
      type: 'sale.recorded.v2',
      version: 2,
      payload: {
        ...(event.payload as any),
        paymentMethod: 'cash', // Default for legacy events
        source: 'pos',
      }
    };
  }
  
  // Return unchanged if no migration needed
  return event;
}

/**
 * Validate and possibly migrate event
 */
export function processIncomingEvent(event: unknown): VersionedEvent {
  // First validate as base event
  const baseEvent = BaseEventSchema.parse(event);
  
  // Check if we have a schema for this event type
  const eventType = baseEvent.type as ValidEventType;
  if (eventType in EVENT_SCHEMAS) {
    // Validate against specific schema
    const validatedEvent = validateEvent(eventType, event);
    return validatedEvent;
  }
  
  // For unknown event types, return base validated event
  console.warn(`No schema found for event type: ${baseEvent.type}`);
  return baseEvent;
}
