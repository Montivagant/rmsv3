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
  paymentMethod: z.enum(['cash', 'card']).default('cash').optional(),
  source: z.enum(['pos', 'online', 'mobile']).default('pos').optional()
});

export const SaleRecordedEventV1 = BaseEventSchema.extend({
  type: z.literal('sale.recorded.v1'),
  version: z.literal(1),
  payload: SaleRecordedPayloadV1
});

// V2 adds payment method and source
export const SaleRecordedPayloadV2 = SaleRecordedPayloadV1.extend({
  paymentMethod: z.enum(['cash', 'card']).default('cash'),
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
  displayOrder: z.number().nonnegative().default(0),
  isActive: z.boolean().default(true),
  branchIds: z.array(z.string()).default([])
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
    displayOrder: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
    branchIds: z.array(z.string()).optional()
  })
});

export const MenuCategoryUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('menu.category.updated.v1'),
  version: z.literal(1),
  payload: MenuCategoryUpdatedPayloadV1
});

export const MenuCategoryDeletedPayloadV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  reason: z.string().optional()
});

export const MenuCategoryDeletedEventV1 = BaseEventSchema.extend({
  type: z.literal('menu.category.deleted.v1'),
  version: z.literal(1),
  payload: MenuCategoryDeletedPayloadV1
});

// Menu item events (non-versioned events currently used)
export const MenuItemCreatedPayload = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  price: z.number().positive('Price must be greater than 0'),
  taxRate: z.number().nonnegative().max(1, 'Tax rate must be between 0 and 1'),
  isActive: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  branchIds: z.array(z.string()).default([]),
  image: z.string().optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive()
});

export const MenuItemCreatedEvent = BaseEventSchema.extend({
  type: z.literal('menu.item.created'),
  version: z.literal(1).default(1),
  payload: MenuItemCreatedPayload
});

export const MenuItemUpdatedPayload = z.object({
  id: z.string().min(1),
  changes: z.object({
    sku: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    categoryId: z.string().min(1).optional(),
    price: z.number().positive().optional(),
    taxRate: z.number().nonnegative().max(1).optional(),
    isActive: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
    branchIds: z.array(z.string()).optional(),
    image: z.string().optional()
  }),
  updatedAt: z.number().int().positive()
});

export const MenuItemUpdatedEvent = BaseEventSchema.extend({
  type: z.literal('menu.item.updated'),
  version: z.literal(1).default(1),
  payload: MenuItemUpdatedPayload
});

export const MenuItemDeletedPayload = z.object({
  id: z.string().min(1),
  deletedAt: z.number().int().positive(),
  reason: z.string().optional()
});

export const MenuItemDeletedEvent = BaseEventSchema.extend({
  type: z.literal('menu.item.deleted'),
  version: z.literal(1).default(1),
  payload: MenuItemDeletedPayload
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

// Inventory category events
export const InventoryCategoryCreatedPayloadV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional()
});

export const InventoryCategoryCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.category.created.v1'),
  version: z.literal(1),
  payload: InventoryCategoryCreatedPayloadV1
});

export const InventoryCategoryUpdatedPayloadV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  updatedAt: z.number().int().positive()
});

export const InventoryCategoryUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.category.updated.v1'),
  version: z.literal(1),
  payload: InventoryCategoryUpdatedPayloadV1
});

// Inventory item-type events
export const InventoryItemTypeCreatedPayloadV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Item type name is required'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  itemCount: z.number().nonnegative().default(0)
});

export const InventoryItemTypeCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.item-type.created.v1'),
  version: z.literal(1),
  payload: InventoryItemTypeCreatedPayloadV1
});

export const InventoryItemTypeUpdatedPayloadV1 = z.object({
  id: z.string().min(1),
  changes: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    updatedAt: z.number().int().positive().optional()
  })
});

export const InventoryItemTypeUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.item-type.updated.v1'),
  version: z.literal(1),
  payload: InventoryItemTypeUpdatedPayloadV1
});

// Inventory audit events
export const InventoryAuditCreatedPayloadV1 = z.object({
  auditId: z.string().min(1),
  branchId: z.string().min(1),
  scope: z.any(), // Audit scope can be complex object
  itemCount: z.number().nonnegative(),
  createdBy: z.string().min(1)
});

export const InventoryAuditCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.audit.created.v1'),
  version: z.literal(1),
  payload: InventoryAuditCreatedPayloadV1
});

export const InventoryAuditUpdatedPayloadV1 = z.object({
  auditId: z.string().min(1),
  itemsUpdated: z.array(z.object({
    itemId: z.string().min(1),
    auditedQty: z.number().nonnegative(),
    previousAuditedQty: z.number().nullable(),
    notes: z.string().max(1024).optional()
  })),
  updatedBy: z.string().min(1)
});

export const InventoryAuditUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.audit.updated.v1'),
  version: z.literal(1),
  payload: InventoryAuditUpdatedPayloadV1
});

export const InventoryAuditSubmittedPayloadV1 = z.object({
  auditId: z.string().min(1),
  branchId: z.string().min(1),
  adjustmentBatchId: z.string().min(1),
  totalVarianceValue: z.number(),
  adjustmentCount: z.number().nonnegative(),
  submittedBy: z.string().min(1)
});

export const InventoryAuditSubmittedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.audit.submitted.v1'),
  version: z.literal(1),
  payload: InventoryAuditSubmittedPayloadV1
});

// Inventory item events (actively used .v1 events)
export const InventoryItemCreatedPayloadV1 = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  unit: z.string().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  parLevel: z.number().nonnegative().optional(),
  cost: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  levels: z.object({
    current: z.number().nonnegative(),
    reserved: z.number().nonnegative().optional(),
    available: z.number().nonnegative().optional(),
    onOrder: z.number().nonnegative().optional(),
    par: z.object({
      min: z.number().nonnegative(),
      max: z.number().nonnegative(),
      reorderPoint: z.number().nonnegative().optional(),
      reorderQuantity: z.number().nonnegative().optional()
    }).optional()
  }).optional(),
  costing: z.object({
    averageCost: z.number().nonnegative().optional(),
    lastCost: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    costMethod: z.enum(['FIFO', 'LIFO', 'AVERAGE']).optional()
  }).optional(),
  quality: z.object({
    shelfLifeDays: z.number().positive().optional(),
    allergens: z.array(z.string()).optional(),
    certifications: z.array(z.string()).optional(),
    hazmat: z.boolean().optional()
  }).optional(),
  flags: z.object({
    isCritical: z.boolean().optional(),
    isPerishable: z.boolean().optional(),
    isControlled: z.boolean().optional(),
    isRecipe: z.boolean().optional(),
    isRawMaterial: z.boolean().optional(),
    isFinishedGood: z.boolean().optional()
  }).optional()
});

export const InventoryItemCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.item.created.v1'),
  version: z.literal(1),
  payload: InventoryItemCreatedPayloadV1
});

export const InventoryItemUpdatedPayloadV1 = z.object({
  id: z.string().min(1),
  changes: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    categoryId: z.string().min(1).optional(),
    unit: z.string().optional(),
    reorderPoint: z.number().nonnegative().optional(),
    parLevel: z.number().nonnegative().optional(),
    cost: z.number().nonnegative().optional(),
    price: z.number().nonnegative().optional(),
    updatedAt: z.number().int().positive().optional()
  }),
  updatedBy: z.string().min(1)
});

export const InventoryItemUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.item.updated.v1'),
  version: z.literal(1),
  payload: InventoryItemUpdatedPayloadV1
});

export const InventoryItemDeletedPayloadV1 = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().min(1),
  reason: z.string().optional()
});

export const InventoryItemDeletedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.item.deleted.v1'),
  version: z.literal(1),
  payload: InventoryItemDeletedPayloadV1
});

// Other actively used deletion events
export const InventoryCategoryDeletedPayloadV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  reason: z.string().optional()
});

export const InventoryCategoryDeletedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.category.deleted.v1'),
  version: z.literal(1),
  payload: InventoryCategoryDeletedPayloadV1
});

export const InventoryItemTypeDeletedPayloadV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  reason: z.string().optional()
});

export const InventoryItemTypeDeletedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.item-type.deleted.v1'),
  version: z.literal(1),
  payload: InventoryItemTypeDeletedPayloadV1
});

export const InventoryUnitCreatedPayloadV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  type: z.enum(['weight', 'volume', 'length', 'count', 'time']),
  baseUnit: z.string().optional(),
  conversionFactor: z.number().positive().optional()
});

export const InventoryUnitCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('inventory.unit.created.v1'),
  version: z.literal(1),
  payload: InventoryUnitCreatedPayloadV1
});

// Order events
export const OrderCreatedPayloadV1 = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  branchId: z.string().min(1),
  items: z.array(z.object({
    id: z.string().min(1),
    sku: z.string().optional(),
    name: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative(),
    modifiers: z.array(z.any()).optional(),
    notes: z.string().optional()
  })),
  totals: z.object({
    subtotal: z.number().nonnegative(),
    discount: z.number().nonnegative(),
    tax: z.number().nonnegative(),
    total: z.number().nonnegative()
  }),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  source: z.enum(['pos', 'online', 'mobile']).default('pos'),
  notes: z.string().optional(),
  createdBy: z.string().min(1)
});

export const OrderCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('order.created.v1'),
  version: z.literal(1),
  payload: OrderCreatedPayloadV1
});

export const OrderStatusUpdatedPayloadV1 = z.object({
  orderId: z.string().min(1),
  status: z.enum(['preparing', 'ready', 'delivered', 'completed', 'cancelled']),
  updatedBy: z.string().min(1),
  notes: z.string().optional()
});

export const OrderStatusUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('order.status.updated.v1'),
  version: z.literal(1),
  payload: OrderStatusUpdatedPayloadV1
});

export const OrderCompletedPayloadV1 = z.object({
  orderId: z.string().min(1),
  completedBy: z.string().min(1),
  completedAt: z.number().int().positive(),
  paymentMethod: z.string().min(1)
});

export const OrderCompletedEventV1 = BaseEventSchema.extend({
  type: z.literal('order.completed.v1'),
  version: z.literal(1),
  payload: OrderCompletedPayloadV1
});

export const OrderCancelledPayloadV1 = z.object({
  orderId: z.string().min(1),
  cancelledBy: z.string().min(1),
  cancelledAt: z.number().int().positive(),
  reason: z.string().min(1)
});

export const OrderCancelledEventV1 = BaseEventSchema.extend({
  type: z.literal('order.cancelled.v1'),
  version: z.literal(1),
  payload: OrderCancelledPayloadV1
});

// Transfer events
export const TransferCreatedPayloadV1 = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  sourceLocationId: z.string().min(1),
  destinationLocationId: z.string().min(1),
  lines: z.array(z.object({
    itemId: z.string().min(1),
    sku: z.string().min(1),
    name: z.string().min(1),
    unit: z.string().min(1),
    qtyPlanned: z.number().positive()
  })),
  notes: z.string().optional(),
  createdBy: z.string().min(1)
});

export const TransferCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('transfer.created.v1'),
  version: z.literal(1),
  payload: TransferCreatedPayloadV1
});

export const TransferCompletedPayloadV1 = z.object({
  id: z.string().min(1),
  linesFinal: z.array(z.object({
    itemId: z.string().min(1),
    qtyFinal: z.number().nonnegative()
  })),
  completedBy: z.string().min(1)
});

export const TransferCompletedEventV1 = BaseEventSchema.extend({
  type: z.literal('transfer.completed.v1'),
  version: z.literal(1),
  payload: TransferCompletedPayloadV1
});

export const TransferCancelledPayloadV1 = z.object({
  id: z.string().min(1),
  reason: z.string().min(1),
  notes: z.string().optional(),
  cancelledBy: z.string().min(1)
});

export const TransferCancelledEventV1 = BaseEventSchema.extend({
  type: z.literal('transfer.cancelled.v1'),
  version: z.literal(1),
  payload: TransferCancelledPayloadV1
});

export const TransferUpdatedPayloadV1 = z.object({
  id: z.string().min(1),
  changes: z.object({
    lines: z.array(z.object({
      itemId: z.string().min(1),
      sku: z.string().min(1),
      name: z.string().min(1),
      unit: z.string().min(1),
      qtyPlanned: z.number().positive()
    })).optional(),
    notes: z.string().optional(),
    destinationLocationId: z.string().min(1).optional()
  }),
  updatedBy: z.string().min(1)
});

export const TransferUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('transfer.updated.v1'),
  version: z.literal(1),
  payload: TransferUpdatedPayloadV1
});

// Time tracking events
export const TimeEntryCreatedPayloadV1 = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  clockIn: z.number().int().positive(),
  shiftId: z.string().optional(),
  branchId: z.string().optional(),
  deviceId: z.string().optional()
});

export const TimeEntryCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('time.entry.created.v1'),
  version: z.literal(1),
  payload: TimeEntryCreatedPayloadV1
});

export const TimeEntryUpdatedPayloadV1 = z.object({
  id: z.string().min(1),
  changes: z.object({
    clockOut: z.number().int().positive().optional(),
    duration: z.number().nonnegative().optional(),
    shiftId: z.string().optional(),
    status: z.enum(['active', 'completed', 'cancelled']).optional()
  })
});

export const TimeEntryUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('time.entry.updated.v1'),
  version: z.literal(1),
  payload: TimeEntryUpdatedPayloadV1
});

// Shift management events
export const ShiftCreatedPayloadV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  assignedUserIds: z.array(z.string()),
  branchId: z.string().optional(),
  isActive: z.boolean()
});

export const ShiftCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('shift.created.v1'),
  version: z.literal(1),
  payload: ShiftCreatedPayloadV1
});

export const ShiftUpdatedPayloadV1 = z.object({
  id: z.string().min(1),
  changes: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    assignedUserIds: z.array(z.string()).optional(),
    branchId: z.string().optional(),
    isActive: z.boolean().optional()
  })
});

export const ShiftUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('shift.updated.v1'),
  version: z.literal(1),
  payload: ShiftUpdatedPayloadV1
});

export const ShiftDeletedPayloadV1 = z.object({
  id: z.string().min(1)
});

export const ShiftDeletedEventV1 = BaseEventSchema.extend({
  type: z.literal('shift.deleted.v1'),
  version: z.literal(1),
  payload: ShiftDeletedPayloadV1
});
export const ShiftStartedPayloadV1 = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  startedAt: z.number().int().positive(),
  branchId: z.string().optional(),
  deviceId: z.string().optional(),
  timeEntryId: z.string().optional(),
  shiftId: z.string().optional()
});

export const ShiftStartedEventV1 = BaseEventSchema.extend({
  type: z.literal('shift.started'),
  version: z.literal(1),
  payload: ShiftStartedPayloadV1
});

export const ShiftEndedPayloadV1 = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive(),
  branchId: z.string().optional(),
  deviceId: z.string().optional(),
  timeEntryId: z.string().optional(),
  shiftId: z.string().optional()
});

export const ShiftEndedEventV1 = BaseEventSchema.extend({
  type: z.literal('shift.ended'),
  version: z.literal(1),
  payload: ShiftEndedPayloadV1
});

// Branch management events
export const BranchCreatedPayloadV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  isMain: z.boolean(),
  type: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    country: z.string(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    manager: z.string().optional(),
  }).optional(),
  storageAreas: z.array(z.string()),
  isActive: z.boolean(),
  createdBy: z.string(),
});

export const BranchCreatedEventV1 = BaseEventSchema.extend({
  type: z.literal('branch.created.v1'),
  version: z.literal(1),
  payload: BranchCreatedPayloadV1
});

export const BranchUpdatedPayloadV1 = z.object({
  id: z.string().min(1),
  changes: z.object({
    name: z.string().optional(),
    isMain: z.boolean().optional(),
    type: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
    }).optional(),
    contact: z.object({
      phone: z.string().optional(),
      email: z.string().optional(),
      manager: z.string().optional(),
    }).optional(),
    storageAreas: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  })
});

export const BranchUpdatedEventV1 = BaseEventSchema.extend({
  type: z.literal('branch.updated.v1'),
  version: z.literal(1),
  payload: BranchUpdatedPayloadV1
});

export const BranchDeletedPayloadV1 = z.object({
  id: z.string().min(1),
  reason: z.string().optional(),
  deletedBy: z.string(),
});

export const BranchDeletedEventV1 = BaseEventSchema.extend({
  type: z.literal('branch.deleted.v1'),
  version: z.literal(1),
  payload: BranchDeletedPayloadV1
});

// Audit events
export const AuditLoggedEventV1 = BaseEventSchema.extend({
  type: z.literal('audit.logged'),
  version: z.literal(1),
  payload: AuditLoggedPayloadV1
});

// Event schema registry
export const EVENT_SCHEMAS = {
  'sale.recorded.v1': SaleRecordedEventV1,
  'sale.recorded.v2': SaleRecordedEventV2,
  'customer.profile.upserted.v1': CustomerProfileUpsertedEventV1,
  'menu.category.created.v1': MenuCategoryCreatedEventV1,
  'menu.category.updated.v1': MenuCategoryUpdatedEventV1,
  'menu.category.deleted.v1': MenuCategoryDeletedEventV1,
  'menu.item.created': MenuItemCreatedEvent,
  'menu.item.updated': MenuItemUpdatedEvent,
  'menu.item.deleted': MenuItemDeletedEvent,
  'inventory.adjusted.v1': InventoryAdjustedEventV1,
  'inventory.category.created.v1': InventoryCategoryCreatedEventV1,
  'inventory.category.updated.v1': InventoryCategoryUpdatedEventV1,
  'inventory.category.deleted.v1': InventoryCategoryDeletedEventV1,
  'inventory.item-type.created.v1': InventoryItemTypeCreatedEventV1,
  'inventory.item-type.updated.v1': InventoryItemTypeUpdatedEventV1,
  'inventory.item-type.deleted.v1': InventoryItemTypeDeletedEventV1,
  'inventory.item.created.v1': InventoryItemCreatedEventV1,
  'inventory.item.updated.v1': InventoryItemUpdatedEventV1,
  'inventory.item.deleted.v1': InventoryItemDeletedEventV1,
  'inventory.unit.created.v1': InventoryUnitCreatedEventV1,
  'inventory.audit.created.v1': InventoryAuditCreatedEventV1,
  'inventory.audit.updated.v1': InventoryAuditUpdatedEventV1,
  'inventory.audit.submitted.v1': InventoryAuditSubmittedEventV1,
  'transfer.created.v1': TransferCreatedEventV1,
  'transfer.completed.v1': TransferCompletedEventV1,
  'transfer.cancelled.v1': TransferCancelledEventV1,
  'transfer.updated.v1': TransferUpdatedEventV1,
  'order.created.v1': OrderCreatedEventV1,
  'order.status.updated.v1': OrderStatusUpdatedEventV1,
  'order.completed.v1': OrderCompletedEventV1,
  'order.cancelled.v1': OrderCancelledEventV1,
  'time.entry.created.v1': TimeEntryCreatedEventV1,
  'time.entry.updated.v1': TimeEntryUpdatedEventV1,
  'shift.created.v1': ShiftCreatedEventV1,
  'shift.updated.v1': ShiftUpdatedEventV1,
  'shift.deleted.v1': ShiftDeletedEventV1,
  'branch.created.v1': BranchCreatedEventV1,
  'branch.updated.v1': BranchUpdatedEventV1,
  'branch.deleted.v1': BranchDeletedEventV1,
  'shift.started': ShiftStartedEventV1,
  'shift.ended': ShiftEndedEventV1,
  'audit.logged': AuditLoggedEventV1,
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
 * Map a possibly unversioned/base event type to a concrete registered type
 * Example: 'customer.profile.upserted' -> 'customer.profile.upserted.v1'
 */
function resolveToRegisteredType(eventType: string): ValidEventType | null {
  if (isValidEventType(eventType)) return eventType;
  const base = getBaseEventType(eventType);
  // Find any registered key that starts with the same base + version suffix
  const candidates = Object.keys(EVENT_SCHEMAS).filter(k => k === base || k.startsWith(base + '.v')) as ValidEventType[];
  if (candidates.length === 0) return null;
  // Prefer highest version if multiple
  const pickLatest = candidates.sort((a, b) => getEventVersion(b) - getEventVersion(a))[0];
  return pickLatest;
}

/**
 * Check if event type is valid
 */
function isValidEventType(type: string): type is ValidEventType {
  return type in EVENT_SCHEMAS;
}

/**
 * Validate and possibly migrate event
 */
export function processIncomingEvent(event: unknown): VersionedEvent {
  // First validate as base event
  const baseEvent = BaseEventSchema.parse(event);
  
  // Resolve possibly unversioned/base types to a registered schema
  const resolvedType = resolveToRegisteredType(baseEvent.type);
  
  // Validate if we have a matching registered schema
  if (resolvedType) {
    // Validate against specific schema
    const validatedEvent = validateEvent(resolvedType, {
      ...baseEvent,
      type: resolvedType,
      version: getEventVersion(resolvedType),
    });
    return validatedEvent as VersionedEvent;
  }
  
  // For unknown event types, return base validated event
  console.warn(`No schema found for event type: ${baseEvent.type}`);
  return baseEvent;
}

