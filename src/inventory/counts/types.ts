/**
 * Inventory Count System Types
 * Enhanced cycle count functionality with snapshot-based variance calculation
 */

// Count Status State Machine
export type CountStatus = 'draft' | 'open' | 'closed' | 'cancelled';

// Count Scope Definition
export interface CountScope {
  all?: boolean;
  filters?: {
    categoryIds?: string[];
    supplierIds?: string[];
    storageLocationIds?: string[];
    tags?: string[];
    includeInactive?: boolean;
  };
  importRef?: string; // Reference to CSV import
}

// Count Session (Enhanced from existing InventoryCount)
export interface InventoryCount {
  id: string;
  branchId: string;
  status: CountStatus;
  createdBy: string;
  createdAt: string;
  closedBy?: string;
  closedAt?: string;
  
  // Count configuration
  scope: CountScope;
  
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

// Individual count item with snapshot and entry data
export interface CountItem {
  id: string;            // Unique row identifier
  itemId: string;        // Reference to InventoryItem.id
  sku: string;
  name: string;
  unit: string;
  categoryName?: string;
  
  // Immutable snapshot data (captured at count creation)
  snapshotQty: number;      // Theoretical quantity when count started
  snapshotAvgCost: number;  // Average cost when count started
  snapshotTimestamp: string; // When snapshot was taken
  
  // Mutable count entry data
  countedQty: number | null;  // null = not yet counted
  countedBy?: string;
  countedAt?: string;
  
  // Derived calculations
  varianceQty: number;        // countedQty - snapshotQty
  varianceValue: number;      // varianceQty * snapshotAvgCost
  variancePercentage: number; // (varianceQty / snapshotQty) * 100
  
  // Additional tracking
  notes?: string;
  lotNumber?: string;
  isActive: boolean;         // Item status at snapshot time
  hasDiscrepancy: boolean;   // Variance exceeds threshold
}

// Count query and filtering
export interface CountQuery {
  branchId?: string;
  status?: CountStatus | CountStatus[];
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: CountSortField;
  sortOrder?: 'asc' | 'desc';
}

export type CountSortField = 
  | 'createdAt'
  | 'closedAt' 
  | 'branchName'
  | 'itemCount'
  | 'varianceValue'
  | 'status';

// Count list response
export interface CountsResponse {
  data: InventoryCount[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Count item query for entry table
export interface CountItemQuery {
  search?: string;
  categoryIds?: string[];
  showCountedOnly?: boolean;
  showVarianceOnly?: boolean;
  showNotCountedOnly?: boolean;
  hasNotes?: boolean;
}

// Count creation request
export interface CreateCountRequest {
  branchId: string;
  scope: CountScope;
  notes?: string;
  estimatedDurationMinutes?: number;
}

// Count item update request
export interface UpdateCountItemRequest {
  itemId: string;
  countedQty: number;
  notes?: string;
}

// Bulk count item updates
export interface BulkUpdateCountItemsRequest {
  updates: UpdateCountItemRequest[];
}

// Count submission request
export interface SubmitCountRequest {
  confirmation: boolean;
  submissionNotes?: string;
  varianceThreshold?: number; // Override default variance threshold
}

// Count submission response
export interface SubmitCountResponse {
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
}

// Count cancellation request
export interface CancelCountRequest {
  reason: string;
  notes?: string;
}

// Count export options
export interface CountExportOptions {
  format: 'csv' | 'xlsx';
  includeSnapshots?: boolean;
  includeNotes?: boolean;
  includeAuditTrail?: boolean;
}

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

// Event types for count operations
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

export interface InventoryCountUpdatedEvent {
  type: 'inventory.count.updated';
  payload: {
    countId: string;
    itemsUpdated: Array<{
      itemId: string;
      countedQty: number;
      previousCountedQty: number | null;
    }>;
    updatedBy: string;
  };
  timestamp: string;
  aggregateId: string; // countId  
}

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
export const COUNT_CONFIG = {
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
  MAX_ITEMS_PER_COUNT: 10000,     // Performance limit
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100
} as const;

// Utility functions for count operations
export const CountUtils = {
  /**
   * Calculate variance percentage
   */
  calculateVariancePercentage(counted: number, theoretical: number): number {
    if (theoretical === 0) return counted > 0 ? 100 : 0;
    return ((counted - theoretical) / theoretical) * 100;
  },

  /**
   * Determine variance severity for UI styling
   */
  getVarianceSeverity(variancePercentage: number): 'low' | 'medium' | 'high' {
    const absPercentage = Math.abs(variancePercentage);
    if (absPercentage <= COUNT_CONFIG.VARIANCE_THRESHOLDS.LOW) return 'low';
    if (absPercentage <= COUNT_CONFIG.VARIANCE_THRESHOLDS.MEDIUM) return 'medium';
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
   * Generate count session ID
   */
  generateCountId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `COUNT_${timestamp}_${random.toUpperCase()}`;
  },

  /**
   * Calculate variance for a single count item
   */
  calculateItemVariance(item: Omit<CountItem, 'varianceQty' | 'varianceValue' | 'variancePercentage'>): {
    varianceQty: number;
    varianceValue: number;
    variancePercentage: number;
    hasDiscrepancy: boolean;
  } {
    if (item.countedQty === null) {
      return {
        varianceQty: 0,
        varianceValue: 0,
        variancePercentage: 0,
        hasDiscrepancy: false
      };
    }

    const varianceQty = item.countedQty - item.snapshotQty;
    const varianceValue = varianceQty * item.snapshotAvgCost;
    const variancePercentage = CountUtils.calculateVariancePercentage(item.countedQty, item.snapshotQty);
    
    // Determine if this is a significant discrepancy
    const hasDiscrepancy = Math.abs(variancePercentage) > COUNT_CONFIG.DEFAULT_VARIANCE_THRESHOLD;

    return {
      varianceQty: Math.round(varianceQty * 100) / 100, // Round to 2 decimal places
      varianceValue: Math.round(varianceValue * 100) / 100, // Round currency
      variancePercentage: Math.round(variancePercentage * 100) / 100,
      hasDiscrepancy
    };
  },

  /**
   * Validate count scope
   */
  validateCountScope(scope: CountScope): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!scope.all && !scope.filters && !scope.importRef) {
      errors.push('Must specify count scope: all items, filters, or import');
    }
    
    if (scope.filters) {
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
  }
};

// Error types for count operations
export interface CountError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export class CountValidationError extends Error {
  public errors: CountError[];
  
  constructor(errors: CountError[]) {
    super(`Count validation failed: ${errors.map(e => e.message).join(', ')}`);
    this.errors = errors;
  }
}

export class CountConcurrencyError extends Error {
  public conflictingCountId: string;
  
  constructor(conflictingCountId: string) {
    super(`Another count session is already active for this scope`);
    this.conflictingCountId = conflictingCountId;
  }
}

export class CountSubmissionError extends Error {
  public variances: CountItem[];
  
  constructor(message: string, variances: CountItem[]) {
    super(message);
    this.variances = variances;
  }
}
