/**
 * Form data mapping utilities for inventory items
 */

import type { InventoryItemFormData } from '../../types/inventory';

// API payload structure
interface InventoryItemAPIPayload {
  name: string;
  sku: string;
  categoryId: string;
  uom: {
    base: string;
    recipe: string;
  };
  description?: string;
  barcode?: string;
  costing?: {
    method: 'fifo' | 'lifo' | 'average';
    lastCost?: number;
    averageCost?: number;
  };
  levels?: {
    minimum?: number;
    par?: {
      reorderPoint: number;
      reorderQuantity: number;
    };
    maximum?: number;
  };
}

/**
 * Map form data to API payload format
 */
export function mapFormToAPI(formData: InventoryItemFormData): InventoryItemAPIPayload {
  const payload: InventoryItemAPIPayload = {
    name: formData.name?.trim() || '',
    sku: (formData.sku?.trim() || '').toUpperCase(),
    categoryId: formData.categoryId || '',
    uom: {
      base: formData.storageUnit || formData.storageUnitId || '',
      recipe: formData.ingredientUnit || formData.recipeUnitId || ''
    }
  };

  // Optional description
  if (formData.description?.trim()) {
    payload.description = formData.description.trim();
  }

  // Optional barcode
  if (formData.barcode?.trim()) {
    payload.barcode = formData.barcode.trim();
  }

  // Costing information
  if (formData.cost && formData.cost > 0) {
    payload.costing = {
      method: 'average',
      averageCost: formData.cost
    };
  }

  // Inventory levels
  if (formData.minimumLevel || formData.parLevel || formData.maximumLevel) {
    payload.levels = {};
    
    if (formData.minimumLevel !== undefined) {
      payload.levels.minimum = formData.minimumLevel;
    }
    
    if (formData.parLevel !== undefined) {
      const reorderPoint = formData.minimumLevel || formData.parLevel;
      const reorderQuantity = formData.maximumLevel 
        ? formData.maximumLevel - reorderPoint 
        : 10; // Default reorder quantity
        
      payload.levels.par = {
        reorderPoint,
        reorderQuantity
      };
    }
    
    if (formData.maximumLevel !== undefined) {
      payload.levels.maximum = formData.maximumLevel;
    }
  }

  return payload;
}

/**
 * Map API data to form format
 */
export function mapAPIToForm(apiData: InventoryItemAPIPayload): InventoryItemFormData {
  return {
    name: apiData.name || '',
    sku: apiData.sku || '',
    description: apiData.description || '',
    categoryId: apiData.categoryId || '',
    barcode: apiData.barcode || '',
    cost: apiData.costing?.lastCost || apiData.costing?.averageCost || undefined,
    storageUnitId: apiData.uom?.base || '',
    recipeUnitId: apiData.uom?.recipe || '',
    minimumLevel: apiData.levels?.minimum || undefined,
    parLevel: apiData.levels?.par?.reorderPoint || undefined,
    maximumLevel: apiData.levels?.maximum || undefined
  };
}

/**
 * Validate API payload before submission
 */
export function validateAPIPayload(payload: InventoryItemAPIPayload): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!payload.name?.trim()) {
    errors.name = 'Item name is required';
  }

  if (!payload.sku?.trim()) {
    errors.sku = 'SKU is required';
  }

  if (!payload.categoryId?.trim()) {
    errors.categoryId = 'Category is required';
  }

  if (!payload.uom?.base?.trim()) {
    errors.storageUnit = 'Storage unit is required';
  }

  if (!payload.uom?.recipe?.trim()) {
    errors.recipeUnit = 'Recipe unit is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Create API error response
 */
export function createAPIError(error: unknown): { message: string; details?: unknown } {
  if (error instanceof Error) {
    return { message: error.message, details: error };
  }
  
  if (typeof error === 'string') {
    return { message: error };
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return { message: (error as any).message, details: error };
  }
  
  return { message: 'An unexpected error occurred', details: error };
}

/**
 * Create default form data
 */
export function createDefaultFormData(): InventoryItemFormData {
  return {
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    barcode: '',
    cost: undefined,
    storageUnitId: '',
    recipeUnitId: '',
    minimumLevel: undefined,
    parLevel: undefined,
    maximumLevel: undefined
  };
}

/**
 * Check if form has any data filled
 */
export function hasFormData(formData: InventoryItemFormData): boolean {
  return Boolean(
    formData.name?.trim() ||
    formData.sku?.trim() ||
    formData.description?.trim() ||
    formData.categoryId?.trim() ||
    formData.barcode?.trim() ||
    formData.storageUnitId?.trim() ||
    formData.recipeUnitId?.trim() ||
    (formData.cost !== undefined && formData.cost >= 0) ||
    formData.minimumLevel !== undefined ||
    formData.parLevel !== undefined ||
    formData.maximumLevel !== undefined
  );
}