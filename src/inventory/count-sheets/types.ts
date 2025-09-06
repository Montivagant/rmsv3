/**
 * Count Sheets Types
 * Saved item scopes/templates for quick inventory count creation
 */

export type ID = string;

// Count Sheet entity
export interface CountSheet {
  id: ID;
  name: string;
  branchScope: { type: "all" } | { type: "specific"; branchId: ID };
  criteria: {
    categoryIds?: ID[];
    supplierIds?: ID[];
    storageAreaIds?: ID[];
    itemIds?: ID[];      // explicit picks override filters (union)
    includeTags?: string[];
    excludeTags?: string[];
    includeZeroStock?: boolean;
  };
  isArchived: boolean;
  lastUsedAt?: number;
  createdAt: number;
  createdBy: ID;
  updatedAt?: number;
  updatedBy?: ID;
}

// Count sheet query interface
export interface CountSheetQuery {
  search?: string;
  branchId?: string;
  archived?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'lastUsedAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// Count sheet list response
export interface CountSheetsResponse {
  data: CountSheet[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Create/update count sheet request
export interface CreateCountSheetRequest {
  name: string;
  branchScope: CountSheet['branchScope'];
  criteria: CountSheet['criteria'];
}

export interface UpdateCountSheetRequest extends CreateCountSheetRequest {
  // Same as create request - all fields updatable
}

// Count sheet preview (resolved items)
export interface CountSheetPreview {
  totalItems: number;
  items: Array<{
    itemId: string;
    sku: string;
    name: string;
    unit: string;
    categoryName?: string;
    currentStock: number;
    isActive: boolean;
  }>;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Count sheet preview query
export interface CountSheetPreviewQuery {
  page?: number;
  pageSize?: number;
  branchId?: string; // For specific branch scope
}

// Archive/unarchive request
export interface ArchiveCountSheetRequest {
  isArchived: boolean;
  reason?: string;
}

// Duplicate count sheet request  
export interface DuplicateCountSheetRequest {
  newName: string;
  branchScope?: CountSheet['branchScope'];
}

// Count sheet validation result
export interface CountSheetValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Event types for count sheet operations
export interface CountSheetCreatedEvent {
  type: 'inventory.countSheet.created';
  payload: {
    countSheetId: string;
    name: string;
    branchScope: CountSheet['branchScope'];
    criteria: CountSheet['criteria'];
    createdBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface CountSheetUpdatedEvent {
  type: 'inventory.countSheet.updated';
  payload: {
    countSheetId: string;
    changes: Partial<CreateCountSheetRequest>;
    updatedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface CountSheetArchivedEvent {
  type: 'inventory.countSheet.archived';
  payload: {
    countSheetId: string;
    isArchived: boolean;
    reason?: string;
    archivedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface CountSheetDuplicatedEvent {
  type: 'inventory.countSheet.duplicated';
  payload: {
    originalCountSheetId: string;
    newCountSheetId: string;
    newName: string;
    duplicatedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface CountSheetUsedEvent {
  type: 'inventory.countSheet.used';
  payload: {
    countSheetId: string;
    countId: string;
    resolvedItemCount: number;
    usedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

// Configuration constants
export const COUNT_SHEET_CONFIG = {
  MAX_NAME_LENGTH: 100,
  MAX_CATEGORY_FILTERS: 20,
  MAX_SUPPLIER_FILTERS: 20,
  MAX_STORAGE_AREA_FILTERS: 20,
  MAX_ITEM_PICKS: 500,
  MAX_TAGS: 50,
  DEFAULT_PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
  PREVIEW_PAGE_SIZE: 20,
  MAX_PREVIEW_ITEMS: 1000
} as const;

// Utility functions for count sheets
export const CountSheetUtils = {
  /**
   * Generate count sheet ID
   */
  generateCountSheetId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `countsheet_${timestamp}_${random}`;
  },

  /**
   * Validate count sheet creation/update
   */
  validateCountSheet(data: CreateCountSheetRequest): CountSheetValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Name validation
    if (!data.name.trim()) {
      errors.push('Name is required');
    } else if (data.name.length > COUNT_SHEET_CONFIG.MAX_NAME_LENGTH) {
      errors.push(`Name must be ${COUNT_SHEET_CONFIG.MAX_NAME_LENGTH} characters or less`);
    }

    // Branch scope validation
    if (data.branchScope.type === 'specific' && !data.branchScope.branchId) {
      errors.push('Branch is required for specific branch scope');
    }

    // Criteria validation
    const { criteria } = data;
    const hasFilters = !!(
      criteria.categoryIds?.length ||
      criteria.supplierIds?.length ||
      criteria.storageAreaIds?.length ||
      criteria.includeTags?.length ||
      criteria.excludeTags?.length
    );
    const hasItemPicks = !!(criteria.itemIds?.length);

    if (!hasFilters && !hasItemPicks) {
      errors.push('At least one filter criteria or item selection is required');
    }

    // Check filter limits
    if (criteria.categoryIds && criteria.categoryIds.length > COUNT_SHEET_CONFIG.MAX_CATEGORY_FILTERS) {
      errors.push(`Maximum ${COUNT_SHEET_CONFIG.MAX_CATEGORY_FILTERS} categories allowed`);
    }
    if (criteria.supplierIds && criteria.supplierIds.length > COUNT_SHEET_CONFIG.MAX_SUPPLIER_FILTERS) {
      errors.push(`Maximum ${COUNT_SHEET_CONFIG.MAX_SUPPLIER_FILTERS} suppliers allowed`);
    }
    if (criteria.itemIds && criteria.itemIds.length > COUNT_SHEET_CONFIG.MAX_ITEM_PICKS) {
      errors.push(`Maximum ${COUNT_SHEET_CONFIG.MAX_ITEM_PICKS} specific items allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Format branch scope for display
   */
  formatBranchScope(branchScope: CountSheet['branchScope'], branches: Array<{id: string; name: string}>): string {
    if (branchScope.type === 'all') {
      return 'All Branches';
    }
    
    const branch = branches.find(b => b.id === branchScope.branchId);
    return branch?.name || branchScope.branchId;
  },

  /**
   * Format scope summary for display (as chips)
   */
  formatScopeSummary(
    criteria: CountSheet['criteria'],
    options: {
      categories?: Array<{id: string; name: string}>;
      suppliers?: Array<{id: string; name: string}>;
      storageAreas?: Array<{id: string; name: string}>;
    }
  ): Array<{type: string; label: string}> {
    const summary: Array<{type: string; label: string}> = [];

    if (criteria.categoryIds?.length) {
      const categoryNames = criteria.categoryIds
        .map(id => options.categories?.find(c => c.id === id)?.name || id)
        .slice(0, 3);
      
      const label = categoryNames.length === criteria.categoryIds.length
        ? categoryNames.join(', ')
        : `${categoryNames.join(', ')}${criteria.categoryIds.length > 3 ? ` +${criteria.categoryIds.length - 3} more` : ''}`;
      
      summary.push({ type: 'category', label: `Categories: ${label}` });
    }

    if (criteria.supplierIds?.length) {
      const supplierNames = criteria.supplierIds
        .map(id => options.suppliers?.find(s => s.id === id)?.name || id)
        .slice(0, 2);
      
      const label = supplierNames.length === criteria.supplierIds.length
        ? supplierNames.join(', ')
        : `${supplierNames.join(', ')}${criteria.supplierIds.length > 2 ? ` +${criteria.supplierIds.length - 2} more` : ''}`;
      
      summary.push({ type: 'supplier', label: `Suppliers: ${label}` });
    }

    if (criteria.storageAreaIds?.length) {
      const areaNames = criteria.storageAreaIds
        .map(id => options.storageAreas?.find(a => a.id === id)?.name || id)
        .slice(0, 2);
      
      const label = areaNames.length === criteria.storageAreaIds.length
        ? areaNames.join(', ')
        : `${areaNames.join(', ')}${criteria.storageAreaIds.length > 2 ? ` +${criteria.storageAreaIds.length - 2} more` : ''}`;
      
      summary.push({ type: 'storage', label: `Storage: ${label}` });
    }

    if (criteria.itemIds?.length) {
      const label = criteria.itemIds.length === 1 
        ? '1 specific item'
        : `${criteria.itemIds.length} specific items`;
      summary.push({ type: 'items', label: label });
    }

    if (criteria.includeTags?.length) {
      const label = criteria.includeTags.length === 1
        ? `Tag: ${criteria.includeTags[0]}`
        : `${criteria.includeTags.length} include tags`;
      summary.push({ type: 'tag', label: label });
    }

    if (criteria.excludeTags?.length) {
      const label = criteria.excludeTags.length === 1
        ? `Exclude: ${criteria.excludeTags[0]}`
        : `Exclude ${criteria.excludeTags.length} tags`;
      summary.push({ type: 'tag', label: label });
    }

    if (criteria.includeZeroStock === false) {
      summary.push({ type: 'stock', label: 'Exclude zero stock' });
    }

    return summary;
  },

  /**
   * Check if count sheet can be archived
   */
  canArchive(countSheet: CountSheet): boolean {
    return !countSheet.isArchived;
  },

  /**
   * Check if count sheet can be unarchived
   */
  canUnarchive(countSheet: CountSheet): boolean {
    return countSheet.isArchived;
  },

  /**
   * Check if count sheet can be edited
   */
  canEdit(countSheet: CountSheet): boolean {
    return true; // Count sheets can always be edited
  },

  /**
   * Check if count sheet can be used to start a count
   */
  canUse(countSheet: CountSheet): boolean {
    return !countSheet.isArchived;
  },

  /**
   * Check if count sheet can be duplicated
   */
  canDuplicate(countSheet: CountSheet): boolean {
    return true; // Count sheets can always be duplicated
  },

  /**
   * Format last used time
   */
  formatLastUsed(lastUsedAt?: number): string {
    if (!lastUsedAt) return 'Never used';
    
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    
    return date.toLocaleDateString();
  }
};

// Error classes
export class CountSheetValidationError extends Error {
  public errors: Array<{code: string; message: string}>;

  constructor(errors: Array<{code: string; message: string}>) {
    super(errors.map(e => e.message).join(', '));
    this.errors = errors;
    this.name = 'CountSheetValidationError';
  }
}
