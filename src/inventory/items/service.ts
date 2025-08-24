/**
 * Enhanced Inventory Items Service
 * 
 * Comprehensive service for managing inventory items with UOM conversions,
 * lot tracking, storage management, and business rule enforcement.
 */

import type { EventStore } from '../../events/types';
import { generateEventId } from '../../events/hash';
import { getRole } from '../../rbac/roles';
import type {
  InventoryItem,
  InventoryItemQuery,
  InventoryItemValidation,
  InventoryMovement,
  StockCount,
  ReorderAlert,
  InventoryAnalytics,
  UnitOfMeasure,
  UOMConversion,
  StorageLocation,
  LotInfo,
  InventoryItemCreatedEvent,
  InventoryItemUpdatedEvent,
  InventoryMovementRecordedEvent,
  StockLevelAdjustedEvent,
  ReorderAlertTriggeredEvent,
  DEFAULT_UNITS,
  DEFAULT_STORAGE_LOCATIONS
} from './types';

export class InventoryItemService {
  private units: Map<string, UnitOfMeasure> = new Map();
  private conversions: Map<string, UOMConversion[]> = new Map();
  private storageLocations: Map<string, StorageLocation> = new Map();

  constructor(private eventStore: EventStore) {
    this.initializeUnits();
    this.initializeStorageLocations();
  }

  // Initialize default units and conversions
  private initializeUnits() {
    for (const unit of DEFAULT_UNITS) {
      this.units.set(unit.id, unit);
    }
    this.buildConversionMaps();
  }

  // Initialize default storage locations
  private initializeStorageLocations() {
    for (const location of DEFAULT_STORAGE_LOCATIONS) {
      const id = generateEventId();
      this.storageLocations.set(id, {
        ...location,
        id
      });
    }
  }

  // Build conversion maps for efficient UOM conversions
  private buildConversionMaps() {
    for (const unit of this.units.values()) {
      if (unit.baseUnit && unit.conversionFactor) {
        const key = `${unit.id}-${unit.baseUnit}`;
        const reverseKey = `${unit.baseUnit}-${unit.id}`;
        
        if (!this.conversions.has(unit.id)) {
          this.conversions.set(unit.id, []);
        }
        if (!this.conversions.has(unit.baseUnit)) {
          this.conversions.set(unit.baseUnit, []);
        }
        
        // Forward conversion
        this.conversions.get(unit.id)?.push({
          fromUnit: unit.id,
          toUnit: unit.baseUnit,
          factor: unit.conversionFactor
        });
        
        // Reverse conversion
        this.conversions.get(unit.baseUnit)?.push({
          fromUnit: unit.baseUnit,
          toUnit: unit.id,
          factor: 1 / unit.conversionFactor
        });
      }
    }
  }

  // UOM Conversion Methods
  convertQuantity(quantity: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return quantity;
    
    const conversion = this.findConversion(fromUnit, toUnit);
    if (!conversion) {
      throw new Error(`No conversion found from ${fromUnit} to ${toUnit}`);
    }
    
    return quantity * conversion.factor;
  }

  private findConversion(fromUnit: string, toUnit: string): UOMConversion | null {
    const conversions = this.conversions.get(fromUnit);
    if (!conversions) return null;
    
    // Direct conversion
    const direct = conversions.find(c => c.toUnit === toUnit);
    if (direct) return direct;
    
    // Try conversion through base unit
    const toBase = conversions.find(c => this.units.get(c.toUnit)?.isBase);
    if (toBase) {
      const fromBase = this.conversions.get(toBase.toUnit)?.find(c => c.toUnit === toUnit);
      if (fromBase) {
        return {
          fromUnit,
          toUnit,
          factor: toBase.factor * fromBase.factor
        };
      }
    }
    
    return null;
  }

  // CRUD Operations
  async createItem(itemData: Partial<InventoryItem>): Promise<string> {
    const validation = this.validateItem(itemData);
    if (!validation.isValid) {
      throw new Error(`Item validation failed: ${validation.errors.join(', ')}`);
    }

    const itemId = generateEventId();
    const currentUser = getRole();
    
    // Check for SKU uniqueness
    const existingItems = await this.getAllItems();
    const skuExists = existingItems.some(item => 
      item.sku.toLowerCase() === itemData.sku?.toLowerCase() && item.status !== 'discontinued'
    );
    
    if (skuExists) {
      throw new Error(`SKU "${itemData.sku}" already exists`);
    }

    // Ensure required fields have defaults
    const defaultItem: InventoryItem = {
      id: itemId,
      sku: itemData.sku || '',
      name: itemData.name || '',
      categoryId: itemData.categoryId || '',
      uom: {
        base: itemData.uom?.base || 'piece',
        purchase: itemData.uom?.purchase || itemData.uom?.base || 'piece',
        recipe: itemData.uom?.recipe || itemData.uom?.base || 'piece',
        conversions: itemData.uom?.conversions || []
      },
      storage: {
        locationId: itemData.storage?.locationId,
        requirements: itemData.storage?.requirements
      },
      tracking: {
        lotTracking: itemData.tracking?.lotTracking || false,
        expiryTracking: itemData.tracking?.expiryTracking || false,
        serialTracking: itemData.tracking?.serialTracking || false,
        trackByLocation: itemData.tracking?.trackByLocation || false
      },
      levels: {
        current: itemData.levels?.current || 0,
        reserved: itemData.levels?.reserved || 0,
        available: (itemData.levels?.current || 0) - (itemData.levels?.reserved || 0),
        onOrder: itemData.levels?.onOrder || 0,
        par: {
          min: itemData.levels?.par?.min || 0,
          max: itemData.levels?.par?.max || 100,
          reorderPoint: itemData.levels?.par?.reorderPoint || itemData.levels?.par?.min || 5,
          reorderQuantity: itemData.levels?.par?.reorderQuantity || 20
        }
      },
      costing: {
        averageCost: itemData.costing?.averageCost || 0,
        lastCost: itemData.costing?.lastCost || 0,
        standardCost: itemData.costing?.standardCost,
        currency: itemData.costing?.currency || 'USD',
        costMethod: itemData.costing?.costMethod || 'AVERAGE'
      },
      quality: {
        shelfLifeDays: itemData.quality?.shelfLifeDays,
        allergens: itemData.quality?.allergens || [],
        certifications: itemData.quality?.certifications || [],
        hazmat: itemData.quality?.hazmat || false,
        temperatureAbuse: itemData.quality?.temperatureAbuse
      },
      suppliers: {
        primary: itemData.suppliers?.primary,
        alternatives: itemData.suppliers?.alternatives || [],
        preferredSupplier: itemData.suppliers?.preferredSupplier
      },
      lots: itemData.lots || [],
      status: itemData.status || 'active',
      flags: {
        isCritical: itemData.flags?.isCritical || false,
        isPerishable: itemData.flags?.isPerishable || false,
        isControlled: itemData.flags?.isControlled || false,
        isRecipe: itemData.flags?.isRecipe || false,
        isRawMaterial: itemData.flags?.isRawMaterial || true,
        isFinishedGood: itemData.flags?.isFinishedGood || false
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser,
        notes: itemData.metadata?.notes,
        tags: itemData.metadata?.tags || []
      }
    };

    const event: InventoryItemCreatedEvent = {
      type: 'inventory.item.created',
      payload: {
        itemId,
        sku: defaultItem.sku,
        name: defaultItem.name,
        categoryId: defaultItem.categoryId,
        uom: defaultItem.uom,
        tracking: defaultItem.tracking,
        levels: defaultItem.levels,
        costing: defaultItem.costing,
        createdBy: currentUser
      },
      timestamp: new Date().toISOString(),
      aggregateId: itemId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: itemId, type: 'inventory-item' }
    });

    return itemId;
  }

  async updateItem(itemId: string, updates: Partial<InventoryItem>): Promise<void> {
    const existingItem = await this.getItemById(itemId);
    if (!existingItem) {
      throw new Error(`Item ${itemId} not found`);
    }

    if (existingItem.status === 'discontinued') {
      throw new Error('Cannot update discontinued item');
    }

    const validation = this.validateItemUpdate(itemId, updates);
    if (!validation.isValid) {
      throw new Error(`Item validation failed: ${validation.errors.join(', ')}`);
    }

    const currentUser = getRole();
    const event: InventoryItemUpdatedEvent = {
      type: 'inventory.item.updated',
      payload: {
        itemId,
        changes: updates,
        updatedBy: currentUser
      },
      timestamp: new Date().toISOString(),
      aggregateId: itemId
    };

    await this.eventStore.append(event.type, event.payload, {
      aggregate: { id: itemId, type: 'inventory-item' }
    });
  }

  async getItemById(itemId: string): Promise<InventoryItem | null> {
    const events = this.eventStore.getEventsForAggregate(itemId);
    return this.buildItemFromEvents(events);
  }

  async getAllItems(query: InventoryItemQuery = {}): Promise<InventoryItem[]> {
    const allEvents = this.eventStore.getEventsByType('inventory.item.created')
      .concat(this.eventStore.getEventsByType('inventory.item.updated'));

    // Group events by item ID
    const itemEvents = new Map<string, any[]>();
    for (const event of allEvents) {
      const itemId = event.aggregateId;
      if (!itemEvents.has(itemId)) {
        itemEvents.set(itemId, []);
      }
      itemEvents.get(itemId)!.push(event);
    }

    // Build items from events
    const items: InventoryItem[] = [];
    for (const [itemId, events] of itemEvents) {
      const item = this.buildItemFromEvents(events);
      if (item) {
        items.push(item);
      }
    }

    // Apply filters and sorting
    return this.filterAndSortItems(items, query);
  }

  // Stock Management
  async adjustStock(itemId: string, adjustment: number, reason: string, lotNumber?: string): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    const currentUser = getRole();
    const previousLevel = item.levels.current;
    const newLevel = previousLevel + adjustment;

    if (newLevel < 0) {
      throw new Error('Stock adjustment would result in negative inventory');
    }

    // Record the movement
    const movementId = generateEventId();
    const movement: InventoryMovement = {
      id: movementId,
      itemId,
      movementType: adjustment > 0 ? 'receipt' : 'adjustment',
      quantity: Math.abs(adjustment),
      unit: item.uom.base,
      lotNumber,
      reason,
      timestamp: new Date().toISOString(),
      performedBy: currentUser
    };

    // Record movement event
    const movementEvent: InventoryMovementRecordedEvent = {
      type: 'inventory.movement.recorded',
      payload: {
        movementId,
        itemId,
        movementType: movement.movementType,
        quantity: movement.quantity,
        unit: movement.unit,
        lotNumber,
        performedBy: currentUser
      },
      timestamp: movement.timestamp,
      aggregateId: movementId
    };

    // Record stock adjustment event
    const adjustmentEvent: StockLevelAdjustedEvent = {
      type: 'inventory.stock.adjusted',
      payload: {
        itemId,
        previousLevel,
        newLevel,
        adjustmentQuantity: adjustment,
        unit: item.uom.base,
        reason,
        performedBy: currentUser
      },
      timestamp: new Date().toISOString(),
      aggregateId: itemId
    };

    await this.eventStore.append(movementEvent.type, movementEvent.payload, {
      aggregate: { id: movementId, type: 'inventory-movement' }
    });

    await this.eventStore.append(adjustmentEvent.type, adjustmentEvent.payload, {
      aggregate: { id: itemId, type: 'inventory-item' }
    });

    // Check if this triggers reorder alerts
    await this.checkReorderAlerts(itemId, newLevel);
  }

  // Reorder Alert Management
  private async checkReorderAlerts(itemId: string, currentLevel: number): Promise<void> {
    const item = await this.getItemById(itemId);
    if (!item) return;

    const alerts: ReorderAlert[] = [];

    // Check if below minimum
    if (currentLevel <= item.levels.par.min) {
      alerts.push({
        id: generateEventId(),
        itemId,
        alertType: 'below_min',
        currentLevel,
        targetLevel: item.levels.par.min,
        urgency: currentLevel <= 0 ? 'critical' : currentLevel <= item.levels.par.min / 2 ? 'high' : 'medium',
        suggestedAction: `Reorder ${item.levels.par.reorderQuantity} ${item.uom.purchase}`,
        suggestedQuantity: item.levels.par.reorderQuantity,
        suggestedSupplier: item.suppliers.preferredSupplier,
        createdAt: new Date().toISOString(),
        isResolved: false
      });
    }

    // Check if below reorder point
    if (currentLevel <= item.levels.par.reorderPoint && currentLevel > item.levels.par.min) {
      alerts.push({
        id: generateEventId(),
        itemId,
        alertType: 'below_reorder',
        currentLevel,
        targetLevel: item.levels.par.reorderPoint,
        urgency: 'medium',
        suggestedAction: `Consider reordering ${item.levels.par.reorderQuantity} ${item.uom.purchase}`,
        suggestedQuantity: item.levels.par.reorderQuantity,
        suggestedSupplier: item.suppliers.preferredSupplier,
        createdAt: new Date().toISOString(),
        isResolved: false
      });
    }

    // Generate alert events
    for (const alert of alerts) {
      const alertEvent: ReorderAlertTriggeredEvent = {
        type: 'inventory.reorder.alert',
        payload: {
          alertId: alert.id,
          itemId: alert.itemId,
          alertType: alert.alertType,
          currentLevel: alert.currentLevel,
          targetLevel: alert.targetLevel,
          urgency: alert.urgency
        },
        timestamp: alert.createdAt,
        aggregateId: alert.id
      };

      await this.eventStore.append(alertEvent.type, alertEvent.payload, {
        aggregate: { id: alert.id, type: 'reorder-alert' }
      });
    }
  }

  // Analytics and Reporting
  async getInventoryAnalytics(): Promise<InventoryAnalytics> {
    const items = await this.getAllItems();
    const movements = await this.getRecentMovements(50);
    const alerts = await this.getActiveReorderAlerts();

    const analytics: InventoryAnalytics = {
      totalItems: items.length,
      activeItems: items.filter(item => item.status === 'active').length,
      lotTrackedItems: items.filter(item => item.tracking.lotTracking).length,
      itemsBelowMin: items.filter(item => item.levels.current <= item.levels.par.min).length,
      itemsBelowReorder: items.filter(item => item.levels.current <= item.levels.par.reorderPoint).length,
      expiringItems: 0, // Would calculate based on expiry dates
      totalValue: items.reduce((total, item) => total + (item.levels.current * item.costing.averageCost), 0),
      averageTurnover: 0, // Would calculate based on movement history
      topCategories: this.calculateTopCategories(items),
      lowStockAlerts: alerts.filter(alert => ['below_min', 'below_reorder'].includes(alert.alertType)),
      recentMovements: movements
    };

    return analytics;
  }

  private calculateTopCategories(items: InventoryItem[]) {
    const categoryMap = new Map<string, { count: number; value: number }>();
    
    for (const item of items) {
      const existing = categoryMap.get(item.categoryId) || { count: 0, value: 0 };
      categoryMap.set(item.categoryId, {
        count: existing.count + 1,
        value: existing.value + (item.levels.current * item.costing.averageCost)
      });
    }

    return Array.from(categoryMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: categoryId, // Would lookup actual category name
        itemCount: data.count,
        totalValue: data.value
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  }

  private async getRecentMovements(limit: number): Promise<InventoryMovement[]> {
    // Would implement based on movement events
    return [];
  }

  private async getActiveReorderAlerts(): Promise<ReorderAlert[]> {
    // Would implement based on alert events
    return [];
  }

  // Validation Methods
  private validateItem(itemData: Partial<InventoryItem>): InventoryItemValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!itemData.sku || itemData.sku.trim().length === 0) {
      errors.push('SKU is required');
    } else if (itemData.sku.length < 2) {
      errors.push('SKU must be at least 2 characters');
    }

    if (!itemData.name || itemData.name.trim().length === 0) {
      errors.push('Item name is required');
    } else if (itemData.name.length < 2) {
      errors.push('Item name must be at least 2 characters');
    }

    if (!itemData.categoryId) {
      errors.push('Category is required');
    }

    if (itemData.levels?.par?.min !== undefined && itemData.levels?.par?.max !== undefined) {
      if (itemData.levels.par.min >= itemData.levels.par.max) {
        errors.push('Minimum stock level must be less than maximum stock level');
      }
    }

    if (itemData.levels?.par?.reorderPoint !== undefined && itemData.levels?.par?.min !== undefined) {
      if (itemData.levels.par.reorderPoint < itemData.levels.par.min) {
        warnings.push('Reorder point is below minimum stock level');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private validateItemUpdate(itemId: string, updates: Partial<InventoryItem>): InventoryItemValidation {
    // Similar validation logic for updates
    return this.validateItem(updates);
  }

  // Event Sourcing Helpers
  private buildItemFromEvents(events: any[]): InventoryItem | null {
    if (events.length === 0) return null;

    const sortedEvents = events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let item: InventoryItem | null = null;

    for (const event of sortedEvents) {
      switch (event.type) {
        case 'inventory.item.created': {
          const payload = event.payload;
          item = {
            id: payload.itemId,
            sku: payload.sku,
            name: payload.name,
            categoryId: payload.categoryId,
            uom: payload.uom,
            storage: { locationId: undefined, requirements: undefined },
            tracking: payload.tracking,
            levels: payload.levels,
            costing: payload.costing,
            quality: {
              allergens: [],
              certifications: [],
              hazmat: false
            },
            suppliers: {
              alternatives: []
            },
            lots: [],
            status: 'active',
            flags: {
              isRawMaterial: true,
              isFinishedGood: false
            },
            metadata: {
              createdAt: event.timestamp,
              updatedAt: event.timestamp,
              createdBy: payload.createdBy,
              tags: []
            }
          };
          break;
        }
        case 'inventory.item.updated': {
          if (item) {
            const changes = event.payload.changes;
            // Apply updates to item
            Object.assign(item, changes);
            item.metadata.updatedAt = event.timestamp;
          }
          break;
        }
        case 'inventory.stock.adjusted': {
          if (item) {
            item.levels.current = event.payload.newLevel;
            item.levels.available = item.levels.current - item.levels.reserved;
            item.metadata.lastMovementDate = event.timestamp;
          }
          break;
        }
      }
    }

    return item;
  }

  private filterAndSortItems(items: InventoryItem[], query: InventoryItemQuery): InventoryItem[] {
    let filtered = items;

    // Apply filters
    if (query.categoryId) {
      filtered = filtered.filter(item => item.categoryId === query.categoryId);
    }

    if (query.status) {
      filtered = filtered.filter(item => item.status === query.status);
    }

    if (query.locationId) {
      filtered = filtered.filter(item => item.storage.locationId === query.locationId);
    }

    if (query.isLotTracked !== undefined) {
      filtered = filtered.filter(item => item.tracking.lotTracking === query.isLotTracked);
    }

    if (query.isBelowMin) {
      filtered = filtered.filter(item => item.levels.current <= item.levels.par.min);
    }

    if (query.isBelowReorder) {
      filtered = filtered.filter(item => item.levels.current <= item.levels.par.reorderPoint);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower) ||
        item.metadata.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    const sortBy = query.sortBy || 'name';
    const sortOrder = query.sortOrder || 'asc';

    filtered.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case 'sku':
          valueA = a.sku.toLowerCase();
          valueB = b.sku.toLowerCase();
          break;
        case 'category':
          valueA = a.categoryId;
          valueB = b.categoryId;
          break;
        case 'level':
          valueA = a.levels.current;
          valueB = b.levels.current;
          break;
        case 'cost':
          valueA = a.costing.averageCost;
          valueB = b.costing.averageCost;
          break;
        case 'lastMovement':
          valueA = new Date(a.metadata.lastMovementDate || a.metadata.createdAt).getTime();
          valueB = new Date(b.metadata.lastMovementDate || b.metadata.createdAt).getTime();
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    if (query.limit || query.offset) {
      const offset = query.offset || 0;
      const limit = query.limit || filtered.length;
      filtered = filtered.slice(offset, offset + limit);
    }

    return filtered;
  }
}

// Create singleton instance
let inventoryItemService: InventoryItemService | null = null;

export function createInventoryItemService(eventStore: EventStore): InventoryItemService {
  if (!inventoryItemService) {
    inventoryItemService = new InventoryItemService(eventStore);
  }
  return inventoryItemService;
}

export function getInventoryItemService(): InventoryItemService {
  if (!inventoryItemService) {
    throw new Error('Inventory item service not initialized. Call createInventoryItemService first.');
  }
  return inventoryItemService;
}
