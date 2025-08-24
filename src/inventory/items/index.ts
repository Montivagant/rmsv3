/**
 * Enhanced Inventory Items Module
 * 
 * Exports all enhanced inventory items functionality including types,
 * services, and API utilities.
 */

// Core Types
export type {
  InventoryItem,
  UnitOfMeasure,
  UOMConversion,
  StorageLocation,
  LotInfo,
  SupplierInfo,
  InventoryMovement,
  StockCount,
  StockCountItem,
  StockDiscrepancy,
  ReorderAlert,
  InventoryAnalytics,
  InventoryItemQuery,
  InventoryItemValidation,
  // Event Types
  InventoryItemCreatedEvent,
  InventoryItemUpdatedEvent,
  InventoryMovementRecordedEvent,
  StockLevelAdjustedEvent,
  ReorderAlertTriggeredEvent
} from './types';

// Constants
export { DEFAULT_UNITS, DEFAULT_STORAGE_LOCATIONS } from './types';

// Service Layer
export { 
  createInventoryItemService,
  getInventoryItemService,
  type InventoryItemService 
} from './service';

// API Handlers
export { inventoryItemApiHandlers } from './api';
