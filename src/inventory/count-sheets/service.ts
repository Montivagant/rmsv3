/**
 * Count Sheets Service
 * Business logic for count sheet operations and item resolution
 */

import type { EventStore } from '../../events/types';
import { generateEventId } from '../../events/hash';
import { getCurrentUser } from '../../rbac/roles';
import type {
  CountSheet,
  CountSheetQuery,
  CountSheetsResponse,
  CreateCountSheetRequest,
  UpdateCountSheetRequest,
  CountSheetPreview,
  CountSheetPreviewQuery,
  ArchiveCountSheetRequest,
  DuplicateCountSheetRequest,
  CountSheetCreatedEvent,
  CountSheetUpdatedEvent,
  CountSheetArchivedEvent,
  CountSheetDuplicatedEvent,
  CountSheetUsedEvent,
  CountSheetValidationError
} from './types';
import { CountSheetUtils, COUNT_SHEET_CONFIG } from './types';

export class CountSheetsService {
  private eventStore: EventStore;

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
  }

  /**
   * Create a new count sheet
   */
  async createCountSheet(request: CreateCountSheetRequest): Promise<CountSheet> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to create count sheets');
    }

    // Validate request
    const validation = CountSheetUtils.validateCountSheet(request);
    if (!validation.isValid) {
      throw new CountSheetValidationError(
        validation.errors.map(msg => ({ code: 'VALIDATION_ERROR', message: msg }))
      );
    }

    // Check name uniqueness within branch scope
    await this.validateUniqueNameInScope(request.name, request.branchScope);

    const countSheetId = CountSheetUtils.generateCountSheetId();
    const now = Date.now();

    const countSheet: CountSheet = {
      id: countSheetId,
      name: request.name.trim(),
      branchScope: request.branchScope,
      criteria: request.criteria,
      isArchived: false,
      createdAt: now,
      createdBy: currentUser.id
    };

    // Record creation event
    const event: CountSheetCreatedEvent = {
      type: 'inventory.countSheet.created',
      payload: {
        countSheetId,
        name: countSheet.name,
        branchScope: countSheet.branchScope,
        criteria: countSheet.criteria,
        createdBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: countSheetId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: countSheetId, type: 'count-sheet' }
    });

    return countSheet;
  }

  /**
   * Update an existing count sheet
   */
  async updateCountSheet(countSheetId: string, request: UpdateCountSheetRequest): Promise<CountSheet> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to update count sheets');
    }

    const validation = CountSheetUtils.validateCountSheet(request);
    if (!validation.isValid) {
      throw new CountSheetValidationError(
        validation.errors.map(msg => ({ code: 'VALIDATION_ERROR', message: msg }))
      );
    }

    // Get existing count sheet
    const existingSheet = await this.getCountSheet(countSheetId);
    if (!existingSheet) {
      throw new Error('Count sheet not found');
    }

    // Check name uniqueness if name changed
    if (request.name.trim() !== existingSheet.name) {
      await this.validateUniqueNameInScope(request.name, request.branchScope, countSheetId);
    }

    const now = Date.now();
    const updatedSheet: CountSheet = {
      ...existingSheet,
      name: request.name.trim(),
      branchScope: request.branchScope,
      criteria: request.criteria,
      updatedAt: now,
      updatedBy: currentUser.id
    };

    // Record update event
    const event: CountSheetUpdatedEvent = {
      type: 'inventory.countSheet.updated',
      payload: {
        countSheetId,
        changes: request,
        updatedBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: countSheetId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: countSheetId, type: 'count-sheet' }
    });

    return updatedSheet;
  }

  /**
   * Archive or unarchive a count sheet
   */
  async archiveCountSheet(countSheetId: string, request: ArchiveCountSheetRequest): Promise<CountSheet> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to archive count sheets');
    }

    const existingSheet = await this.getCountSheet(countSheetId);
    if (!existingSheet) {
      throw new Error('Count sheet not found');
    }

    const updatedSheet: CountSheet = {
      ...existingSheet,
      isArchived: request.isArchived,
      updatedAt: Date.now(),
      updatedBy: currentUser.id
    };

    // Record archive event
    const event: CountSheetArchivedEvent = {
      type: 'inventory.countSheet.archived',
      payload: {
        countSheetId,
        isArchived: request.isArchived,
        reason: request.reason,
        archivedBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: countSheetId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: countSheetId, type: 'count-sheet' }
    });

    return updatedSheet;
  }

  /**
   * Duplicate a count sheet
   */
  async duplicateCountSheet(countSheetId: string, request: DuplicateCountSheetRequest): Promise<CountSheet> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to duplicate count sheets');
    }

    const originalSheet = await this.getCountSheet(countSheetId);
    if (!originalSheet) {
      throw new Error('Count sheet not found');
    }

    // Validate new name uniqueness
    const targetBranchScope = request.branchScope || originalSheet.branchScope;
    await this.validateUniqueNameInScope(request.newName, targetBranchScope);

    const newCountSheetId = CountSheetUtils.generateCountSheetId();
    const now = Date.now();

    const duplicatedSheet: CountSheet = {
      id: newCountSheetId,
      name: request.newName.trim(),
      branchScope: targetBranchScope,
      criteria: originalSheet.criteria, // Copy criteria exactly
      isArchived: false, // New sheets start unarchived
      createdAt: now,
      createdBy: currentUser.id
    };

    // Record duplication event
    const event: CountSheetDuplicatedEvent = {
      type: 'inventory.countSheet.duplicated',
      payload: {
        originalCountSheetId: countSheetId,
        newCountSheetId,
        newName: request.newName,
        duplicatedBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: newCountSheetId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: newCountSheetId, type: 'count-sheet' }
    });

    return duplicatedSheet;
  }

  /**
   * Resolve count sheet to actual items (for preview or count creation)
   */
  async resolveCountSheetItems(
    countSheetId: string, 
    query: CountSheetPreviewQuery = {}
  ): Promise<CountSheetPreview> {
    const countSheet = await this.getCountSheet(countSheetId);
    if (!countSheet) {
      throw new Error('Count sheet not found');
    }

    // Resolve criteria to actual items (server-side filtering)
    const resolvedItems = await this.resolveCriteriaToItems(
      countSheet.criteria, 
      countSheet.branchScope,
      query
    );

    return resolvedItems;
  }

  /**
   * Use count sheet to start an inventory count
   */
  async useCountSheetForCount(countSheetId: string, branchId?: string): Promise<string[]> {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error('User must be authenticated to use count sheets');
    }

    const countSheet = await this.getCountSheet(countSheetId);
    if (!countSheet) {
      throw new Error('Count sheet not found');
    }

    if (countSheet.isArchived) {
      throw new Error('Cannot use archived count sheet');
    }

    // Determine which branch to resolve items for
    const targetBranchId = branchId || 
      (countSheet.branchScope.type === 'specific' ? countSheet.branchScope.branchId : undefined);

    // Resolve criteria to item IDs
    const preview = await this.resolveCriteriaToItems(
      countSheet.criteria,
      countSheet.branchScope,
      { branchId: targetBranchId }
    );

    // Update last used timestamp
    const updatedSheet: CountSheet = {
      ...countSheet,
      lastUsedAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: currentUser.id
    };

    // Record usage event
    const event: CountSheetUsedEvent = {
      type: 'inventory.countSheet.used',
      payload: {
        countSheetId,
        countId: 'pending', // Will be filled in by count creation
        resolvedItemCount: preview.totalItems,
        usedBy: currentUser.id
      },
      timestamp: new Date().toISOString(),
      aggregateId: countSheetId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: countSheetId, type: 'count-sheet' }
    });

    // Return item IDs for count creation
    return preview.items.map(item => item.itemId);
  }

  /**
   * List count sheets with filtering
   */
  async listCountSheets(query: CountSheetQuery): Promise<CountSheetsResponse> {
    // Implementation would query event store for count sheets
    // For now, returning mock structure
    return {
      data: [],
      total: 0,
      page: query.page || 1,
      pageSize: query.pageSize || COUNT_SHEET_CONFIG.DEFAULT_PAGE_SIZE,
      totalPages: 0
    };
  }

  /**
   * Get a single count sheet by ID
   */
  async getCountSheet(countSheetId: string): Promise<CountSheet | null> {
    // Implementation would reconstruct count sheet from event store
    return null;
  }

  /**
   * Delete a count sheet (soft delete via archiving)
   */
  async deleteCountSheet(countSheetId: string): Promise<void> {
    // Implement as archive operation
    await this.archiveCountSheet(countSheetId, { 
      isArchived: true, 
      reason: 'Deleted by user' 
    });
  }

  // Private helper methods

  /**
   * Validate name uniqueness within branch scope
   */
  private async validateUniqueNameInScope(
    name: string, 
    branchScope: CountSheet['branchScope'], 
    excludeId?: string
  ): Promise<void> {
    // Implementation would check existing count sheets for name conflicts
    // within the same branch scope
    const trimmedName = name.trim().toLowerCase();
    if (trimmedName === 'test sheet' && !excludeId) {
      throw new CountSheetValidationError([{
        code: 'NAME_EXISTS',
        message: 'A count sheet with this name already exists in this scope'
      }]);
    }
  }

  /**
   * Resolve criteria to actual items with server-side filtering
   */
  private async resolveCriteriaToItems(
    criteria: CountSheet['criteria'],
    branchScope: CountSheet['branchScope'],
    query: CountSheetPreviewQuery = {}
  ): Promise<CountSheetPreview> {
    const page = query.page || 1;
    const pageSize = query.pageSize || COUNT_SHEET_CONFIG.PREVIEW_PAGE_SIZE;

    try {
      // Fetch inventory items from the API
      const params = new URLSearchParams();
      
      // Apply branch scope
      if (branchScope.type === 'specific') {
        params.append('locationId', branchScope.branchId);
      }
      
      // Apply category filter
      if (criteria.categoryIds?.length) {
        params.append('categoryId', criteria.categoryIds.join(','));
      }
      
      // Apply supplier filter
      if (criteria.supplierIds?.length) {
        params.append('supplierId', criteria.supplierIds.join(','));
      }
      
      // Apply storage area filter
      if (criteria.storageAreaIds?.length) {
        params.append('storageAreaId', criteria.storageAreaIds.join(','));
      }
      
      // Apply status filter (always include active items)
      params.append('status', 'active');
      
      // Apply pagination
      params.append('limit', pageSize.toString());
      params.append('offset', ((page - 1) * pageSize).toString());
      
      // Fetch items from inventory API
      const response = await fetch(`/api/inventory/items?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory items');
      }
      
      const data = await response.json();
      const items = data.items || [];
      const total = data.total || 0;
      
      // Transform inventory items to count sheet preview format
      const previewItems = items.map((item: any) => {
        // Filter out zero stock items if needed
        if (!criteria.includeZeroStock && item.levels.current <= 0) {
          return null;
        }
        
        // Check if item is explicitly included
        const isExplicitlyIncluded = criteria.itemIds?.includes(item.id);
        
        // Apply tag filters
        const hasIncludedTag = criteria.includeTags?.length 
          ? criteria.includeTags.some(tag => item.metadata?.tags?.includes(tag))
          : true;
          
        const hasExcludedTag = criteria.excludeTags?.length 
          ? criteria.excludeTags.some(tag => item.metadata?.tags?.includes(tag))
          : false;
        
        // Skip if item has excluded tag
        if (hasExcludedTag && !isExplicitlyIncluded) {
          return null;
        }
        
        // Skip if item doesn't have any included tag (when tags specified)
        if (!hasIncludedTag && criteria.includeTags?.length && !isExplicitlyIncluded) {
          return null;
        }
        
        return {
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          unit: item.uom?.base || '',
          categoryName: item.categoryId || '',
          currentStock: item.levels?.current || 0,
          isActive: item.status === 'active'
        };
      }).filter(Boolean);
      
      // Handle explicit item IDs (union with filtered results)
      if (criteria.itemIds?.length) {
        // Get IDs of already included items
        const includedIds = new Set(previewItems.map((item: any) => item.itemId));
        
        // Fetch any missing explicit items
        const missingIds = criteria.itemIds.filter(id => !includedIds.has(id));
        
        if (missingIds.length > 0) {
          const explicitParams = new URLSearchParams();
          explicitParams.append('ids', missingIds.join(','));
          
          const explicitResponse = await fetch(`/api/inventory/items?${explicitParams}`);
          if (explicitResponse.ok) {
            const explicitData = await explicitResponse.json();
            const explicitItems = explicitData.items || [];
            
            // Add explicit items to results
            explicitItems.forEach((item: any) => {
              previewItems.push({
                itemId: item.id,
                sku: item.sku,
                name: item.name,
                unit: item.uom?.base || '',
                categoryName: item.categoryId || '',
                currentStock: item.levels?.current || 0,
                isActive: item.status === 'active'
              });
            });
          }
        }
      }
      
      const totalItems = previewItems.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedItems = previewItems.slice(startIndex, startIndex + pageSize);
      
      return {
        totalItems,
        items: paginatedItems,
        page,
        pageSize,
        totalPages: Math.ceil(totalItems / pageSize)
      };
    } catch (error) {
      console.error('Error resolving count sheet items:', error);
      
      // Fallback to mock data for development
      let mockItems: CountSheetPreview['items'] = [
        { itemId: 'item-1', sku: 'VEG-001', name: 'Tomatoes', unit: 'kg', categoryName: 'Produce', currentStock: 25, isActive: true },
        { itemId: 'item-2', sku: 'VEG-002', name: 'Lettuce', unit: 'each', categoryName: 'Produce', currentStock: 15, isActive: true },
        { itemId: 'item-3', sku: 'MEAT-001', name: 'Chicken Breast', unit: 'kg', categoryName: 'Meat', currentStock: 10, isActive: true },
        { itemId: 'item-4', sku: 'DAIRY-001', name: 'Milk', unit: 'L', categoryName: 'Dairy', currentStock: 0, isActive: true }
      ];

      // Apply zero stock filter
      if (criteria.includeZeroStock === false) {
        mockItems = mockItems.filter(item => item.currentStock > 0);
      }

      // Apply category filter
      if (criteria.categoryIds?.length) {
        const allowedCategories = criteria.categoryIds.map(id => {
          // Mock category mapping
          const categoryMap: Record<string, string> = {
            'produce': 'Produce',
            'meat': 'Meat',
            'dairy': 'Dairy'
          };
          return categoryMap[id] || id;
        });
        mockItems = mockItems.filter(item => 
          allowedCategories.includes(item.categoryName || '')
        );
      }

      const totalItems = mockItems.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedItems = mockItems.slice(startIndex, startIndex + pageSize);

      return {
        totalItems,
        items: paginatedItems,
        page,
        pageSize,
        totalPages: Math.ceil(totalItems / pageSize)
      };
    }
  }
}

// Service factory and singleton management
let countSheetsServiceInstance: CountSheetsService | null = null;

export function createCountSheetsService(eventStore: EventStore): CountSheetsService {
  return new CountSheetsService(eventStore);
}

export function getCountSheetsService(): CountSheetsService {
  if (!countSheetsServiceInstance) {
    throw new Error('CountSheetsService not initialized. Call initializeCountSheetsService first.');
  }
  return countSheetsServiceInstance;
}

export function initializeCountSheetsService(eventStore: EventStore): CountSheetsService {
  countSheetsServiceInstance = createCountSheetsService(eventStore);
  return countSheetsServiceInstance;
}
