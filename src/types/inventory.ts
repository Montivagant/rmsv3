export interface CreateCountRequest {
  branchId: string;
  scope: CountScope;
  notes?: string;
  estimatedDurationMinutes?: number;
}

export interface CountScope {
  all?: boolean;
  filters?: {
    categoryIds?: string[];
    storageLocationIds?: string[];
    tags?: string[];
    includeInactive?: boolean;
  };
  importRef?: string; // Reference to CSV import
}

export interface InventoryItemFormData {
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  itemTypeId?: string;
  // Support both naming conventions for compatibility
  storageUnit?: string;
  storageUnitId?: string;
  ingredientUnit?: string;
  recipeUnitId?: string;
  barcode?: string;
  cost?: number;
  minimumLevel?: number;
  parLevel?: number;
  maximumLevel?: number;
}
