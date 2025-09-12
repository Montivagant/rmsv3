/**
 * Form data mapping utilities for inventory items
 */

import type { InventoryItemFormData } from '../../types/inventory';

// API payload structure
interface InventoryItemAPIPayload {
  name: string;
  sku: string;
  categoryId: string;
  itemTypeId?: string;
  uom: {
    base: string;
    purchase?: string;
    recipe: string;
    conversions?: Array<{ from: string; to: string; factor: number }>;
  };
  status?: 'active' | 'inactive';
  tracking?: {
    lotTracking: boolean;
    expiryTracking: boolean;
    serialTracking: boolean;
    trackByLocation: boolean;
  };
  description?: string;
  barcode?: string;
  costing?: {
    costMethod: 'AVERAGE' | 'FIFO' | 'LIFO';
    currency: 'USD';
    lastCost: number;
    averageCost: number;
  };
  levels?: {
    par: {
      min?: number;
      max?: number;
      reorderPoint: number;
      reorderQuantity: number;
    };
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
    itemTypeId: formData.itemTypeId || undefined,
    uom: {
      base: formData.storageUnit || formData.storageUnitId || '',
      purchase: formData.storageUnit || formData.storageUnitId || '',
      recipe: (formData as any).ingredientUnitId || formData.ingredientUnit || formData.recipeUnitId || '',
      conversions: [],
    },
    status: 'active',
    tracking: {
      lotTracking: false,
      expiryTracking: false,
      serialTracking: false,
      trackByLocation: false,
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
  if (formData.cost !== undefined && formData.cost > 0) {
    payload.costing = {
      costMethod: 'AVERAGE',
      currency: 'USD',
      lastCost: formData.cost,
      averageCost: formData.cost,
    };
  }

  // Inventory levels
  if (formData.minimumLevel !== undefined || formData.parLevel !== undefined || formData.maximumLevel !== undefined) {
    const min = formData.minimumLevel;
    const max = formData.maximumLevel;
    const reorderPoint = min ?? formData.parLevel ?? 0;
    const reorderQuantity = typeof max === 'number' ? Math.round(max * 0.2) : 10;
    payload.levels = {
      par: {
        min,
        max,
        reorderPoint,
        reorderQuantity,
      }
    };
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
    itemTypeId: apiData.itemTypeId || '',
    barcode: apiData.barcode || '',
    cost: (apiData as any).costing?.lastCost ?? apiData.costing?.averageCost ?? undefined,
    storageUnitId: apiData.uom?.base || '',
    ingredientUnitId: apiData.uom?.recipe || '',
    minimumLevel: apiData.levels?.par?.min ?? undefined,
    parLevel: undefined,
    maximumLevel: apiData.levels?.par?.max ?? undefined
  };
}

/**
 * Validate API payload before submission
 */
export function validateAPIPayload(payload: InventoryItemAPIPayload): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!payload.name?.trim()) errors.push('Item name is required');
  if (!payload.sku?.trim()) errors.push('SKU is required');
  if (!payload.categoryId?.trim()) errors.push('Category ID is required');
  if (!payload.uom?.base?.trim()) errors.push('Storage unit is required');
  if (!payload.uom?.recipe?.trim()) errors.push('Ingredient unit is required');

  return {
    isValid: errors.length === 0,
    errors,
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
  
  return { message: 'An unexpected error occurred', details: String(error) };
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
    ingredientUnitId: '',
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
    (formData as any).ingredientUnitId?.trim?.() ||
    (formData.cost !== undefined && formData.cost >= 0) ||
    formData.minimumLevel !== undefined ||
    formData.parLevel !== undefined ||
    formData.maximumLevel !== undefined
  );
}
