/**
 * Inventory Audit System Types
 * Enhanced audit functionality with snapshot-based variance calculation
 */

// Audit Status State Machine
export type AuditStatus = 'draft' | 'open' | 'closed' | 'cancelled';

// Legacy alias for backward compatibility
export type CountStatus = AuditStatus;

// Audit Scope Definition
export interface AuditScope {
  all?: boolean;
  byCategory?: boolean;
  byItemType?: boolean;
  filters?: {
    categoryIds?: string[];
    itemTypeIds?: string[];
    storageLocationIds?: string[];
    tags?: string[];
    includeInactive?: boolean;
  };
  importRef?: string; // Reference to CSV import
}

// Legacy alias for backward compatibility
export type CountScope = AuditScope;

// Audit Session (Enhanced from existing InventoryCount)
export interface InventoryAudit {
  id: string;
  branchId: string;
  status: AuditStatus;
  createdBy: string;
  createdAt: string;
  closedBy?: string;
  closedAt?: string;
  
  // Audit configuration
  scope: AuditScope;
  
  // Calculated totals
  totals: {
    varianceQty: number;
    varianceValue: number;
    itemsCountedCount: number;
    totalItemsCount: number;
    positiveVarianceValue: number;
    negativeVarianceValue: number;
  };
  
  // Metadata and tracking
  metadata: {
    lastSavedAt?: string;
    submittedAt?: string;
    adjustmentBatchId?: string;
    notes?: string;
    estimatedDurationMinutes?: number;
    actualDurationMinutes?: number;
  };
}

// Legacy alias for backward compatibility
export type InventoryCount = InventoryAudit;

// Individual audit item with snapshot and entry data
export interface AuditItem {
  id: string;            // Unique row identifier
  itemId: string;        // Reference to InventoryItem.id
  sku: string;
  name: string;
  unit: string;
  categoryName?: string;
  
  // Immutable snapshot data (captured at audit creation)
  snapshotQty: number;      // Theoretical quantity when audit started
  snapshotAvgCost: number;  // Average cost when audit started
  snapshotTimestamp: string; // When snapshot was taken
  
  // Mutable audit entry data
  auditedQty: number | null;  // null = not yet audited
  
  // Legacy field for backward compatibility
  countedQty?: number | null;
  auditedBy?: string;
  auditedAt?: string;
  
  // Legacy fields for backward compatibility
  countedBy?: string;
  countedAt?: string;
  
  // Derived calculations
  varianceQty: number;        // auditedQty - snapshotQty
  varianceValue: number;      // varianceQty * snapshotAvgCost
  variancePercentage: number; // (varianceQty / snapshotQty) * 100
  
  // Additional tracking
  notes?: string;
  lotNumber?: string;
  isActive: boolean;         // Item status at snapshot time
  hasDiscrepancy: boolean;   // Variance exceeds threshold
}

// Legacy alias for backward compatibility
export type CountItem = AuditItem;

// Audit query and filtering
export interface AuditQuery {
  branchId?: string;
  status?: AuditStatus | AuditStatus[];
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: AuditSortField;
  sortOrder?: 'asc' | 'desc';
}

// Legacy alias for backward compatibility
export type CountQuery = AuditQuery;

export type AuditSortField = 
  | 'createdAt'
  | 'closedAt' 
  | 'branchName'
  | 'itemCount'
  | 'varianceValue'
  | 'status';

// Legacy alias for backward compatibility
export type CountSortField = AuditSortField;

// Audit list response
export interface AuditsResponse {
  data: InventoryAudit[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Legacy alias for backward compatibility
export interface CountsResponse extends AuditsResponse {
  data: InventoryCount[];
}

// Audit item query for entry table
export interface AuditItemQuery {
  search?: string;
  categoryIds?: string[];
  showAuditedOnly?: boolean;
  showVarianceOnly?: boolean;
  showNotAuditedOnly?: boolean;
  hasNotes?: boolean;
}

// Legacy alias for backward compatibility
export interface CountItemQuery extends AuditItemQuery {
  showCountedOnly?: boolean;
  showNotCountedOnly?: boolean;
}

// Audit creation request
export interface CreateAuditRequest {
  branchId: string;
  scope: AuditScope;
  notes?: string;
  estimatedDurationMinutes?: number;
}

// Legacy alias for backward compatibility
export interface CreateCountRequest extends CreateAuditRequest {
  scope: CountScope;
}

// Audit item update request
export interface UpdateAuditItemRequest {
  itemId: string;
  auditedQty: number;
  notes?: string;
}

// Legacy alias for backward compatibility
export interface UpdateCountItemRequest {
  itemId: string;
  countedQty: number;
  auditedQty?: number;
  notes?: string;
}

// Bulk audit item updates
export interface BulkUpdateAuditItemsRequest {
  updates: UpdateAuditItemRequest[];
}

// Legacy alias for backward compatibility
export interface BulkUpdateCountItemsRequest {
  updates: UpdateCountItemRequest[];
}

// Audit submission request
export interface SubmitAuditRequest {
  confirmation: boolean;
  submissionNotes?: string;
  varianceThreshold?: number; // Override default variance threshold
}

// Legacy alias for backward compatibility
export type SubmitCountRequest = SubmitAuditRequest;

// Audit submission response
export interface SubmitAuditResponse {
  adjustmentBatchId: string;
  adjustments: Array<{
    itemId: string;
    sku: string;
    name: string;
    adjustmentQty: number;
    adjustmentValue: number;
    newStockLevel: number;
  }>;
  summary: {
    totalAdjustments: number;
    totalVarianceValue: number;
    positiveAdjustments: number;
    negativeAdjustments: number;
  };
  movementsDuringAudit?: MovementsDuringAuditReport;
}

// Legacy alias for backward compatibility
export type SubmitCountResponse = SubmitAuditResponse;

// Audit cancellation request
export interface CancelAuditRequest {
  reason: string;
  notes?: string;
}

// Legacy alias for backward compatibility
export type CancelCountRequest = CancelAuditRequest;

// Audit export options
export interface AuditExportOptions {
  format: 'csv' | 'xlsx';
  includeSnapshots?: boolean;
  includeNotes?: boolean;
  includeAuditTrail?: boolean;
}

// Legacy alias for backward compatibility
export type CountExportOptions = AuditExportOptions;

// Variance analysis for business insights
export interface VarianceAnalysis {
  totalVarianceValue: number;
  totalVarianceQty: number;
  averageVariancePercentage: number;
  itemsWithVariance: number;
  
  // Variance distribution
  positiveVariances: {
    count: number;
    totalValue: number;
    averageValue: number;
  };
  
  negativeVariances: {
    count: number;
    totalValue: number;
    averageValue: number;
  };
  
  // Top discrepancies
  largestVariances: Array<{
    itemId: string;
    sku: string;
    name: string;
    varianceQty: number;
    varianceValue: number;
    variancePercentage: number;
  }>;
  
  // Category breakdown
  categoryVariances: Array<{
    categoryId: string;
    categoryName: string;
    varianceValue: number;
    itemCount: number;
  }>;
}

// Event types for audit operations
export interface InventoryAuditCreatedEvent {
  type: 'inventory.audit.created';
  payload: {
    auditId: string;
    branchId: string;
    scope: AuditScope;
    itemCount: number;
    createdBy: string;
  };
  timestamp: string;
  aggregateId: string; // auditId
}

// Legacy alias for backward compatibility
export interface InventoryCountCreatedEvent {
  type: 'inventory.count.created';
  payload: {
    countId: string;
    branchId: string;
    scope: CountScope;
    itemCount: number;
    createdBy: string;
  };
  timestamp: string;
  aggregateId: string; // countId
}

export interface InventoryAuditUpdatedEvent {
  type: 'inventory.audit.updated';
  payload: {
    auditId: string;
    itemsUpdated: Array<{
      itemId: string;
      auditedQty: number;
      previousAuditedQty: number | null;
      notes?: string;
    }>;
    updatedBy: string;
  };
  timestamp: string;
  aggregateId: string; // auditId  
}

// Legacy alias for backward compatibility
export interface InventoryCountUpdatedEvent {
  type: 'inventory.count.updated';
  payload: {
    countId: string;
    itemsUpdated: Array<{
      itemId: string;
      countedQty: number;
      previousCountedQty: number | null;
      notes?: string;
    }>;
    updatedBy: string;
  };
  timestamp: string;
  aggregateId: string; // countId  
}

export interface InventoryAuditSubmittedEvent {
  type: 'inventory.audit.submitted';
  payload: {
    auditId: string;
    branchId: string;
    adjustmentBatchId: string;
    totalVarianceValue: number;
    adjustmentCount: number;
    submittedBy: string;
  };
  timestamp: string;
  aggregateId: string; // auditId
}

// Legacy alias for backward compatibility
export interface InventoryCountSubmittedEvent {
  type: 'inventory.count.submitted';
  payload: {
    countId: string;
    branchId: string;
    adjustmentBatchId: string;
    totalVarianceValue: number;
    adjustmentCount: number;
    submittedBy: string;
  };
  timestamp: string;
  aggregateId: string; // countId
}

export interface InventoryAuditCancelledEvent {
  type: 'inventory.audit.cancelled';
  payload: {
    auditId: string;
    reason: string;
    cancelledBy: string;
  };
  timestamp: string;
  aggregateId: string; // auditId
}

// Legacy alias for backward compatibility
export interface InventoryCountCancelledEvent {
  type: 'inventory.count.cancelled';
  payload: {
    countId: string;
    reason: string;
    cancelledBy: string;
  };
  timestamp: string;
  aggregateId: string; // countId
}

// Business constants and configuration
export const AUDIT_CONFIG = {
  // Variance thresholds for visual indicators
  VARIANCE_THRESHOLDS: {
    LOW: 5,        // ≤5% variance
    MEDIUM: 15,    // ≤15% variance  
    HIGH: Infinity // >15% variance
  },
  
  // Value thresholds for approval workflows (future)
  VALUE_THRESHOLDS: {
    AUTO_APPROVE: 100,    // Auto-approve variances ≤$100
    MANAGER_REVIEW: 500,  // Manager review for variances ≤$500
    EXECUTIVE_REVIEW: Infinity // Executive review for >$500
  },
  
  // Default settings
  DEFAULT_VARIANCE_THRESHOLD: 10, // 10% default threshold
  AUTO_SAVE_INTERVAL_MS: 30000,   // 30 seconds
  MAX_ITEMS_PER_AUDIT: 10000,     // Performance limit
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100
} as const;

// Legacy alias for backward compatibility
export const COUNT_CONFIG = AUDIT_CONFIG;

// Utility functions for audit operations
export const AuditUtils = {
  /**
   * Calculate variance percentage
   */
  calculateVariancePercentage(audited: number, theoretical: number): number {
    if (theoretical === 0) return audited > 0 ? 100 : 0;
    return ((audited - theoretical) / theoretical) * 100;
  },

  /**
   * Determine variance severity for UI styling
   */
  getVarianceSeverity(variancePercentage: number): 'low' | 'medium' | 'high' {
    const absPercentage = Math.abs(variancePercentage);
    if (absPercentage <= AUDIT_CONFIG.VARIANCE_THRESHOLDS.LOW) return 'low';
    if (absPercentage <= AUDIT_CONFIG.VARIANCE_THRESHOLDS.MEDIUM) return 'medium';
    return 'high';
  },

  /**
   * Format variance for display
   */
  formatVariance(variance: number, showSign: boolean = true): string {
    const formatted = Math.abs(variance).toLocaleString();
    if (!showSign) return formatted;
    return variance >= 0 ? `+${formatted}` : `-${formatted}`;
  },

  /**
   * Format currency variance
   */
  formatVarianceValue(value: number): string {
    const formatted = Math.abs(value).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  },

  /**
   * Generate audit session ID
   */
  generateAuditId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `AUDIT_${timestamp}_${random.toUpperCase()}`;
  },

  /**
   * Legacy method for backward compatibility
   */
  generateCountId(): string {
    return this.generateAuditId().replace('AUDIT_', 'COUNT_');
  },

  /**
   * Calculate variance for a single audit item
   */
  calculateItemVariance(item: Omit<AuditItem, 'varianceQty' | 'varianceValue' | 'variancePercentage'>): {
    varianceQty: number;
    varianceValue: number;
    variancePercentage: number;
    hasDiscrepancy: boolean;
  } {
    const auditedQty = item.auditedQty ?? item.countedQty;
    
    if (auditedQty === null || auditedQty === undefined) {
      return {
        varianceQty: 0,
        varianceValue: 0,
        variancePercentage: 0,
        hasDiscrepancy: false
      };
    }

    const varianceQty = auditedQty - item.snapshotQty;
    const varianceValue = varianceQty * item.snapshotAvgCost;
    const variancePercentage = AuditUtils.calculateVariancePercentage(auditedQty, item.snapshotQty);
    
    // Determine if this is a significant discrepancy
    const hasDiscrepancy = Math.abs(variancePercentage) > AUDIT_CONFIG.DEFAULT_VARIANCE_THRESHOLD;

    return {
      varianceQty: Math.round(varianceQty * 100) / 100, // Round to 2 decimal places
      varianceValue: Math.round(varianceValue * 100) / 100, // Round currency
      variancePercentage: Math.round(variancePercentage * 100) / 100,
      hasDiscrepancy
    };
  },

  /**
   * Validate audit scope
   */
  validateAuditScope(scope: AuditScope): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for at least one scope type (align wording with tests)
    if (!scope.all && !scope.byCategory && !scope.byItemType && !scope.filters && !scope.importRef) {
      errors.push('Must specify count scope: all items, filters, or import');
    }
    
    // If selecting by category, must have categoryIds
    if (scope.byCategory && (!scope.filters?.categoryIds || scope.filters.categoryIds.length === 0)) {
      errors.push('Must select at least one category when using category scope');
    }
    
    // If selecting by item type, must have itemTypeIds
    if (scope.byItemType && (!scope.filters?.itemTypeIds || scope.filters.itemTypeIds.length === 0)) {
      errors.push('Must select at least one item type when using item type scope');
    }
    
    // If using general filters (not by category or item type), validate they're not empty
    if (scope.filters && !scope.byCategory && !scope.byItemType) {
      const hasFilters = Object.values(scope.filters).some(filter => 
        Array.isArray(filter) ? filter.length > 0 : Boolean(filter)
      );
      if (!hasFilters) {
        errors.push('At least one filter must be specified when using filtered scope');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Legacy method for backward compatibility
   */
  validateCountScope(scope: CountScope): { isValid: boolean; errors: string[] } {
    const result = this.validateAuditScope(scope);
    // Normalize wording to match legacy count tests
    return {
      isValid: result.isValid,
      errors: result.errors.map(e => e.replace(/\b[Aa]udit\b/g, 'count').replace('Audit', 'Count'))
    };
  }
};

// Legacy alias for backward compatibility
export const CountUtils = AuditUtils;

// Error types for audit operations
export interface AuditError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

// Legacy alias for backward compatibility
export type CountError = AuditError;

export class AuditValidationError extends Error {
  public errors: AuditError[];
  
  constructor(errors: AuditError[]) {
    super(`Audit validation failed: ${errors.map(e => e.message).join(', ')}`);
    this.errors = errors;
  }
}

// Legacy alias for backward compatibility
export class CountValidationError extends AuditValidationError {
  constructor(errors: CountError[]) {
    super(errors);
    this.message = this.message.replace('Audit validation', 'Count validation');
  }
}

export class AuditConcurrencyError extends Error {
  public conflictingAuditId: string;
  
  constructor(conflictingAuditId: string) {
    super(`Another audit session is already active for this scope`);
    this.conflictingAuditId = conflictingAuditId;
  }
}

// Legacy alias for backward compatibility
export class CountConcurrencyError extends AuditConcurrencyError {
  public conflictingCountId: string;
  
  constructor(conflictingCountId: string) {
    super(conflictingCountId);
    this.conflictingCountId = conflictingCountId;
    this.message = this.message.replace('audit session', 'count session');
  }
}

export class AuditSubmissionError extends Error {
  public variances: AuditItem[];
  
  constructor(message: string, variances: AuditItem[]) {
    super(message);
    this.variances = variances;
  }
}

// Legacy alias for backward compatibility
export class CountSubmissionError extends AuditSubmissionError {
  public variances: CountItem[];
  
  constructor(message: string, variances: CountItem[]) {
    super(message, variances as AuditItem[]);
    this.variances = variances;
  }
}

// Movement tracking during audit types
export interface InventoryMovementDuringAudit {
  itemId: string;
  itemName: string;
  sku: string;
  movementType: 'sale' | 'receipt' | 'adjustment' | 'transfer' | 'waste' | 'production';
  quantity: number;
  timestamp: string;
  reference: string;
  performedBy: string;
  reason: string;
}

export interface InventoryMovementEvent {
  itemId: string;
  movementType: InventoryMovementDuringAudit['movementType'];
  quantity: number;
  timestamp: string;
  reference?: string;
  performedBy?: string;
  reason?: string;
}

export interface MovementsDuringAuditReport {
  hasMovements: boolean;
  movements: InventoryMovementDuringAudit[];
  message: string;
}

