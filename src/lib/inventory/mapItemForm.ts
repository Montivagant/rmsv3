import type { ItemFormData } from '../../schemas/itemForm';

// API payload type expected by services and tests
export interface CreateItemAPIPayload {
  name: string;
  sku: string;
  categoryId: string;
  uom: {
    base: string;
    purchase: string;
    recipe: string;
    conversions: Array<{ from: string; to: string; factor: number }>;
  };
  barcode?: string | null;
  costing?: {
    averageCost: number;
    lastCost?: number;
    currency: string;
    costMethod: 'AVERAGE';
  };
  levels?: {
    par: {
      min?: number;
      max?: number;
      reorderPoint?: number;
      reorderQuantity?: number;
    };
  };
  status?: 'active' | 'inactive';
  tracking?: {
    lotTracking: boolean;
    expiryTracking: boolean;
    serialTracking: boolean;
    trackByLocation: boolean;
  };
}

// Map UI form data (simplified) -> API payload
export function mapFormDataToCreatePayload(form: ItemFormData): CreateItemAPIPayload {
  const name = (form.name || '').trim();
  const sku = (form.sku || '').trim().toUpperCase();

  const payload: CreateItemAPIPayload = {
    name,
    sku,
    categoryId: form.categoryId || '',
    uom: {
      base: (form as any).storageUnit || (form as any).storageUnitId || '',
      purchase: (form as any).storageUnit || (form as any).storageUnitId || '',
      recipe: (form as any).ingredientUnit || (form as any).ingredientUnitId || '',
      conversions: [],
    },
  };

  if (!('barcode' in (form as any)) || (form as any).barcode === undefined) {
    // Explicitly null when not provided
    payload.barcode = null;
  } else if (String((form as any).barcode).trim().length > 0) {
    payload.barcode = String((form as any).barcode).trim();
  }

  if (typeof (form as any).cost === 'number' && (form as any).cost >= 0) {
    payload.costing = {
      averageCost: (form as any).cost,
      currency: 'USD',
      costMethod: 'AVERAGE',
    };
  }

  const min = (form as any).minimumLevel as number | undefined;
  const par = (form as any).parLevel as number | undefined;
  const max = (form as any).maximumLevel as number | undefined;
  if (min != null || par != null || max != null) {
    const reorderPoint = min ?? par;
    payload.levels = {
      par: {
        ...(min != null && { min }),
        ...(max != null && { max }),
        ...(reorderPoint != null && { reorderPoint }),
      },
    };
  }

  return payload;
}

// Aliases for older tests
export function mapFormToAPI(form: ItemFormData): CreateItemAPIPayload {
  const name = (form.name || '').trim();
  const sku = (form.sku || '').trim().toUpperCase();
  const payload: CreateItemAPIPayload = {
    name,
    sku,
    categoryId: form.categoryId || '',
    uom: {
      base: (form as any).storageUnitId || (form as any).storageUnit || '',
      purchase: (form as any).storageUnitId || (form as any).storageUnit || '',
      recipe: (form as any).ingredientUnitId || (form as any).ingredientUnit || '',
      conversions: [],
    },
    status: 'active',
    tracking: {
      lotTracking: false,
      expiryTracking: false,
      serialTracking: false,
      trackByLocation: false,
    },
  };

  if ((form as any).barcode === '') {
    // Omit when explicitly empty string
    // no-op, leave undefined
  } else if ((form as any).barcode != null && String((form as any).barcode).trim().length > 0) {
    payload.barcode = String((form as any).barcode).trim();
  } else if (!('barcode' in (form as any))) {
    payload.barcode = null;
  }

  if (typeof (form as any).cost === 'number' && (form as any).cost >= 0) {
    payload.costing = {
      averageCost: (form as any).cost,
      lastCost: (form as any).cost,
      currency: 'USD',
      costMethod: 'AVERAGE',
    };
  }

  const min = (form as any).minimumLevel as number | undefined;
  const par = (form as any).parLevel as number | undefined;
  const max = (form as any).maximumLevel as number | undefined;
  if (min != null || par != null || max != null) {
    const reorderPoint = min ?? par;
    const reorderQuantity = 10;
    payload.levels = {
      par: {
        ...(min != null && { min }),
        ...(max != null && { max }),
        ...(reorderPoint != null && { reorderPoint }),
        reorderQuantity,
      },
    };
  }

  return payload;
}

// Map API item back to form data (subset used by UI/tests)
export function mapItemToFormData(item: any): ItemFormData {
  return {
    name: item.name || '',
    sku: (item.sku || '').toUpperCase(),
    categoryId: item.categoryId || '',
    storageUnitId: item.uom?.base || '',
    ingredientUnitId: item.uom?.recipe || '',
    barcode: item.barcode || '',
    cost: item.costing?.lastCost ?? item.costing?.averageCost,
    minimumLevel: item.levels?.par?.min,
    parLevel: undefined,
    maximumLevel: item.levels?.par?.max,
  } as ItemFormData;
}

export function mapAPIToForm(item: any): ItemFormData {
  return {
    name: item.name || '',
    sku: (item.sku || '').toUpperCase(),
    categoryId: item.categoryId || '',
    storageUnit: item.uom?.base || '',
    storageUnitId: item.uom?.base || '',
    ingredientUnit: item.uom?.recipe || '',
    ingredientUnitId: item.uom?.recipe || '',
    barcode: item.barcode || '',
    cost: item.costing?.lastCost ?? item.costing?.averageCost,
    minimumLevel: item.levels?.par?.min,
    parLevel: undefined,
    maximumLevel: item.levels?.par?.max,
  } as ItemFormData;
}

export function validateSKUUniqueness(sku: string, existing: Array<{ sku: string }>): { isUnique: boolean; conflictingSKU?: string } {
  const target = (sku || '').toUpperCase();
  const conflict = existing.find(e => (e.sku || '').toUpperCase() === target)?.sku;
  return { 
    isUnique: !conflict, 
    ...(conflict && { conflictingSKU: conflict })
  };
}

export function mapAPIErrorsToFormErrors(errors: Array<{ field?: string; message: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const err of errors) {
    if (!err.field) {
      out._form = err.message;
      continue;
    }
    const field = err.field
      .replace('uom.base', 'storageUnit')
      .replace('uom.recipe', 'ingredientUnit')
      .replace('levels.par.min', 'minimumLevel')
      .replace('levels.par.max', 'maximumLevel');
    out[field] = err.message;
  }
  return out;
}

// Additional helpers used by adapter tests
export function validateAPIPayload(payload: CreateItemAPIPayload): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!payload.name?.trim()) errors.push('Item name is required');
  if (!payload.sku?.trim()) errors.push('SKU is required');
  if (!payload.categoryId?.trim()) errors.push('Category ID is required');
  if (!payload.uom?.base?.trim()) errors.push('Storage unit is required');
  if (!payload.uom?.recipe?.trim()) errors.push('Ingredient unit is required');
  return { isValid: errors.length === 0, errors };
}

export function createAPIError(err: unknown): { message: string; details?: unknown } {
  if (err instanceof Error) return { message: err.message, details: err };
  if (typeof err === 'string') return { message: err };
  if (err && typeof err === 'object' && (err as any).message) return { message: String((err as any).message), details: err };
  return { message: 'An unexpected error occurred', details: String(err) };
}

export function createDefaultFormData(): ItemFormData {
  return {
    name: '',
    sku: '',
    categoryId: '',
    storageUnit: '',
    storageUnitId: '',
    ingredientUnit: '',
    ingredientUnitId: '',
    barcode: '',
    cost: undefined,
    minimumLevel: undefined,
    parLevel: undefined,
    maximumLevel: undefined,
  } as unknown as ItemFormData;
}

export function hasFormData(form: Partial<ItemFormData>): boolean {
  const hasText = (v?: string) => (v || '').trim().length > 0;
  if (hasText(form.name)) return true;
  if (hasText(form.sku)) return true;
  if (hasText(form.categoryId)) return true;
  if (hasText((form as any).storageUnit || (form as any).storageUnitId)) return true;
  if (typeof form.cost === 'number') return true;
  if (hasText(form.barcode)) return true;
  if (form.minimumLevel != null) return true;
  if (form.parLevel != null) return true;
  if (form.maximumLevel != null) return true;
  return false;
}

export default {
  mapFormDataToCreatePayload,
  mapFormToAPI,
  mapItemToFormData,
  mapAPIToForm,
  validateSKUUniqueness,
  mapAPIErrorsToFormErrors,
  validateAPIPayload,
  createAPIError,
  createDefaultFormData,
  hasFormData,
};
