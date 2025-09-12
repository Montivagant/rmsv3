/**
 * Simplified Inventory Item Form Schema
 * 
 * Provides Zod validation and TypeScript types for the streamlined "Add Item" form.
 * This replaces the previous complex form with a focused, accessible implementation.
 */

import { z } from 'zod';

// Simplified inventory item form schema with only basic required fields
export const itemFormSchema = z.object({
  // Required fields (labels as per tests)
  name: z.string().transform((v: any) => (typeof v === 'string' ? v.trim() : '')).min(1, 'Name is required').max(120, 'Name cannot exceed 120 characters'),
  sku: z.string().transform((v: any) => (typeof v === 'string' ? v.trim() : '')).min(3, 'SKU must be at least 3 characters').max(20, 'SKU cannot exceed 20 characters').regex(/^[A-Z0-9_-]+$/i, 'SKU can only contain letters, numbers, underscores, and hyphens'),
  categoryId: z.string().transform((v: any) => (typeof v === 'string' ? v.trim() : '')).min(1, 'Category is required'),
  storageUnitId: z.string().transform((v: any) => (typeof v === 'string' ? v.trim() : '')).min(1, 'Storage unit is required'),
  ingredientUnitId: z.string().transform((v: any) => (typeof v === 'string' ? v.trim() : '')).min(1, 'Ingredient unit is required'),

  // Optional fields
  barcode: z.string().max(32, 'Barcode cannot exceed 32 characters').optional().or(z.literal('')),
  cost: z.number().min(0, 'Cost cannot be negative').optional(),
  minimumLevel: z.number().min(0, 'Minimum level cannot be negative').optional(),
  parLevel: z.number().min(0, 'Par level cannot be negative').optional(),
  maximumLevel: z.number().min(0, 'Maximum level cannot be negative').optional(),
});

// TypeScript types derived from schema
export type ItemFormData = z.infer<typeof itemFormSchema>;

// Form errors type for component state
export interface ItemFormErrors {
  name?: string;
  sku?: string;
  categoryId?: string;
  storageUnitId?: string;
  ingredientUnitId?: string;
  categoryId?: string;
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
    if (error instanceof z.ZodError && error.errors) {
      const errors: ItemFormErrors = {};
      
      error.errors.forEach((err) => {
        if (err.path && err.path.length > 0) {
          const path = err.path[0] as keyof ItemFormErrors;
          errors[path] = err.message;
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

export function validateBarcode(barcode: string): { isValid: boolean; message?: string } {
  const trimmed = (barcode || '').trim();
  if (trimmed.length === 0) return { isValid: true };
  if (trimmed.length > 32) return { isValid: false, message: 'Barcode cannot exceed 32 characters' };
  if (EAN13_PATTERN.test(trimmed)) return { isValid: true };
  if (UPC_PATTERN.test(trimmed)) return { isValid: true };
  if (trimmed.length < 8) return { isValid: true, message: "Barcode seems short. Verify it's correct." };
  return { isValid: true };
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

  const cleaned = (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let base = cleaned.slice(0, 3);
  if (base.length < 3) base = (base + 'XXX').slice(0, 3);

  let candidate = '';
  let attempts = 0;
  while (attempts < 100) {
    const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
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
