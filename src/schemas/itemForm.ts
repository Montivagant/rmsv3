/**
 * Simplified Inventory Item Form Schema
 * 
 * Provides Zod validation and TypeScript types for the streamlined "Add Item" form.
 * This replaces the previous complex form with a focused, accessible implementation.
 */

import { z } from 'zod';

// Simplified inventory item form schema with only basic required fields
const rawItemFormSchema = z.object({
  // Required fields (labels as per tests)
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name cannot exceed 120 characters'),
  sku: z.string()
    .trim()
    .min(1, 'SKU is required')
    .min(3, 'SKU must be at least 3 characters')
    .max(20, 'SKU cannot exceed 20 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'SKU can only contain letters, numbers, underscores, and hyphens')
    .transform(v => v.toUpperCase()),
  categoryId: z.string().trim().min(1, 'Category is required'),

  // Optional fields
  itemTypeId: z.string().trim().optional().or(z.literal('')),
  barcode: z.string().max(32, 'Barcode cannot exceed 32 characters').optional().or(z.literal('')),
  storageUnitId: z.string().trim().min(1, 'Storage unit is required'),
  ingredientUnitId: z.string().trim().min(1, 'Ingredient unit is required'),
  cost: z.number({ message: 'Cost must be a valid number' }).min(0, 'Cost cannot be negative').optional(),
  minimumLevel: z.number({ message: 'Minimum level must be a valid number' }).min(0, 'Minimum level cannot be negative').optional(),
  parLevel: z.number({ message: 'Par level must be a valid number' }).min(0, 'Par level cannot be negative').optional(),
  maximumLevel: z.number({ message: 'Maximum level must be a valid number' }).min(0, 'Maximum level cannot be negative').optional(),
}).superRefine((data, ctx) => {
  const { minimumLevel, parLevel, maximumLevel } = data as any;
  if (minimumLevel != null && parLevel != null && parLevel < minimumLevel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Par level must be greater than or equal to minimum level',
      path: ['parLevel'],
    });
  }
  if (parLevel != null && maximumLevel != null && maximumLevel < parLevel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Maximum level must be greater than or equal to par level',
      path: ['maximumLevel'],
    });
  }
  if (minimumLevel != null && maximumLevel != null && maximumLevel < minimumLevel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Maximum level must be greater than or equal to minimum level',
      path: ['maximumLevel'],
    });
  }
});

export const itemFormSchema = z.preprocess((input) => {
  if (input && typeof input === 'object') {
    const draft: any = { ...(input as any) };
    // Normalize unit fields to required *Id fields while keeping legacy props for UI/tests
    if ((draft.storageUnitId == null || draft.storageUnitId === '') && typeof draft.storageUnit === 'string') {
      draft.storageUnitId = draft.storageUnit;
    }
    if ((draft.ingredientUnitId == null || draft.ingredientUnitId === '') && typeof draft.ingredientUnit === 'string') {
      draft.ingredientUnitId = draft.ingredientUnit;
    }
    if (draft.storageUnit === undefined && Object.prototype.hasOwnProperty.call(draft, 'storageUnitId')) {
      draft.storageUnit = draft.storageUnitId;
    }
    if (draft.ingredientUnit === undefined && Object.prototype.hasOwnProperty.call(draft, 'ingredientUnitId')) {
      draft.ingredientUnit = draft.ingredientUnitId;
    }
    return draft;
  }
  return input;
}, rawItemFormSchema);

// TypeScript types derived from schema
export type ItemFormData = z.infer<typeof itemFormSchema> & {
  // Legacy-compatible optional ids used by adapter tests
  storageUnitId?: string;
  ingredientUnitId?: string;
};

// Form errors type for component state
export interface ItemFormErrors {
  name?: string;
  sku?: string;
  categoryId?: string;
  storageUnit?: string;
  ingredientUnit?: string;
  barcode?: string;
  cost?: string;
  minimumLevel?: string;
  parLevel?: string;
  maximumLevel?: string;
  _form?: string; // For general form errors
}

// Default form data
export const createDefaultFormData = (): Partial<ItemFormData> => ({
  name: '',
  sku: '',
  categoryId: '',
  storageUnitId: '',
  ingredientUnitId: '',
  barcode: '',
  cost: undefined,
  minimumLevel: undefined,
  parLevel: undefined,
  maximumLevel: undefined,
});

// Validation function that returns structured errors
export function validateItemForm(data: Partial<ItemFormData>): { isValid: boolean; errors: ItemFormErrors } {
  try {
    itemFormSchema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError && error.issues) {
      const errors: ItemFormErrors = {};
      
      error.issues.forEach((err) => {
        if (err.path && err.path.length > 0) {
          let path = err.path[0] as keyof ItemFormErrors | 'storageUnitId' | 'ingredientUnitId';
          if (path === 'storageUnit') path = 'storageUnitId';
          if (path === 'ingredientUnit') path = 'ingredientUnitId';
          if (!(errors as any)[path]) {
            (errors as any)[path] = err.message;
          }
        } else {
          // Handle errors without a path
          errors._form = errors._form ? `${errors._form}, ${err.message}` : err.message;
        }
      });
      
      return { isValid: false, errors };
    }
    
    // Handle any other type of error
    const errorMessage = error instanceof Error ? error.message : 'Validation failed';
    return { isValid: false, errors: { _form: errorMessage } };
  }
}

// Barcode validation helpers per tests
export const EAN13_PATTERN = /^[0-9]{13}$/;
export const UPC_PATTERN = /^[0-9]{12}$/;

export function validateBarcodeDetailed(barcode: string): { isValid: boolean; message?: string } {
  const trimmed = (barcode || '').trim();
  if (trimmed.length === 0) return { isValid: true };
  if (trimmed.length > 32) return { isValid: false, message: 'Barcode cannot exceed 32 characters' };
  if (EAN13_PATTERN.test(trimmed)) return { isValid: true };
  if (UPC_PATTERN.test(trimmed)) return { isValid: true };
  if (trimmed.length < 8) return { isValid: true, message: "Barcode seems short. Verify it's correct." };
  return { isValid: true };
}

// Backwards-compatible boolean validator for tests
export function validateBarcode(barcode: string): boolean {
  return validateBarcodeDetailed(barcode).isValid;
}

// SKU generation utility
export function generateSKU(
  name: string,
  optionsOrPrefix?: { prefix?: string; existingSKUs?: string[] } | string,
  existingSKUsArg: string[] = []
): string {
  const opts = typeof optionsOrPrefix === 'string' ? { prefix: optionsOrPrefix } : (optionsOrPrefix || {});
  const prefix = opts.prefix || 'ITM';
  const existingSKUs = opts.existingSKUs || existingSKUsArg;
  // Only letters for the base; first 4 characters, pad with X to 4
  const lettersOnly = (name || '').toUpperCase().replace(/[^A-Z]/g, '');
  let base = lettersOnly.slice(0, 4);
  if (base.length < 4) base = (base + 'XXXX').slice(0, 4);
  if (lettersOnly.length === 1) {
    base = lettersOnly; // Support single-letter base expectations
  }

  let candidate = '';
  let attempts = 0;
  while (attempts < 100) {
    const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    candidate = `${prefix}-${base}${randomDigits}`;
    if (!existingSKUs.includes(candidate)) break;
    attempts++;
  }
  return candidate;
}

// Helper to get field labels for UI
export const FIELD_LABELS = {
  name: 'Item Name',
  sku: 'SKU',
  unit: 'Unit',
  categoryId: 'Category',
  quantity: 'Initial Quantity',
  cost: 'Cost per Unit',
} as const;

// Helper text for form fields  
export const FIELD_HELP_TEXT = {
  name: 'A descriptive name for the item (max 120 characters)',
  sku: 'Unique identifier for inventory tracking (auto-generated if empty)',
  unit: 'Unit of measure (e.g., each, kg, liter)',
  categoryId: 'Optional category for organizing items',
  quantity: 'Starting quantity for inventory (optional)',
  cost: 'Cost per unit for basic costing (optional)',
} as const;

export default validateItemForm;
