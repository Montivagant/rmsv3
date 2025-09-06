/**
 * Simplified Inventory Item Form Schema
 * 
 * Provides Zod validation and TypeScript types for the streamlined "Add Item" form.
 * This replaces the previous complex form with a focused, accessible implementation.
 */

import { z } from 'zod';

// Simplified inventory item form schema
export const itemFormSchema = z.object({
  // Required fields
  name: z.string()
    .trim()
    .min(1, 'Item name is required')
    .max(120, 'Item name cannot exceed 120 characters'),
  
  sku: z.string()
    .trim()
    .min(3, 'SKU must be at least 3 characters')
    .max(20, 'SKU cannot exceed 20 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'SKU can only contain letters, numbers, underscores, and hyphens')
    .transform(val => val.toUpperCase()),
  
  categoryId: z.string()
    .trim()
    .min(1, 'Category is required'),
  
  storageUnit: z.string()
    .trim()
    .min(1, 'Storage unit is required'),
  
  ingredientUnit: z.string()
    .trim()
    .min(1, 'Ingredient unit is required'),

  // Optional fields
  barcode: z.string()
    .trim()
    .max(32, 'Barcode cannot exceed 32 characters')
    .optional()
    .or(z.literal('')),
  
  cost: z.number()
    .min(0, 'Cost cannot be negative')
    .optional(),
  
  minimumLevel: z.number()
    .min(0, 'Minimum level cannot be negative')
    .optional(),
  
  parLevel: z.number()
    .min(0, 'Par level cannot be negative')  
    .optional(),
  
  maximumLevel: z.number()
    .min(0, 'Maximum level cannot be negative')
    .optional(),
}).refine((data) => {
  // Cross-field validation: max >= par >= min (when provided)
  if (data.minimumLevel !== undefined && data.parLevel !== undefined) {
    return data.parLevel >= data.minimumLevel;
  }
  return true;
}, {
  message: 'Par level must be greater than or equal to minimum level',
  path: ['parLevel']
}).refine((data) => {
  if (data.parLevel !== undefined && data.maximumLevel !== undefined) {
    return data.maximumLevel >= data.parLevel;
  }
  return true;
}, {
  message: 'Maximum level must be greater than or equal to par level', 
  path: ['maximumLevel']
}).refine((data) => {
  if (data.minimumLevel !== undefined && data.maximumLevel !== undefined) {
    return data.maximumLevel >= data.minimumLevel;
  }
  return true;
}, {
  message: 'Maximum level must be greater than or equal to minimum level',
  path: ['maximumLevel']
});

// TypeScript types derived from schema
export type ItemFormData = z.infer<typeof itemFormSchema>;

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
  storageUnit: '',
  ingredientUnit: '',
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

// EAN-13/UPC barcode validation pattern
export const EAN13_PATTERN = /^\d{13}$/;
export const UPC_PATTERN = /^\d{12}$/;

export function validateBarcode(barcode: string): { isValid: boolean; message?: string } {
  if (!barcode || barcode.trim() === '') {
    return { isValid: true };
  }
  
  const cleaned = barcode.trim();
  
  // Check for standard barcode patterns
  if (EAN13_PATTERN.test(cleaned) || UPC_PATTERN.test(cleaned)) {
    return { isValid: true };
  }
  
  // Allow other patterns but warn if length seems unusual
  if (cleaned.length < 8) {
    return { 
      isValid: true, 
      message: 'Barcode seems short. Verify it\'s correct.' 
    };
  }
  
  if (cleaned.length > 32) {
    return { 
      isValid: false, 
      message: 'Barcode cannot exceed 32 characters' 
    };
  }
  
  return { isValid: true };
}

// SKU generation utility
export function generateSKU(name: string, prefix: string = 'ITM', existingSKUs: string[] = []): string {
  // Generate SKU from name + random digits
  const nameBase = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  
  let candidate = '';
  let attempt = 0;
  
  // Generate unique candidates
  while (attempt < 100) {
    const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    candidate = `${prefix}-${nameBase}${randomDigits}`;
    
    if (!existingSKUs.includes(candidate)) {
      break;
    }
    attempt++;
  }
  
  return candidate;
}

// Helper to get field labels for UI
export const FIELD_LABELS = {
  name: 'Name',
  sku: 'SKU',
  categoryId: 'Category',
  storageUnit: 'Storage Unit',
  ingredientUnit: 'Ingredient Unit',
  barcode: 'Barcode',
  cost: 'Cost',
  minimumLevel: 'Minimum Level',
  parLevel: 'Par Level',
  maximumLevel: 'Maximum Level',
} as const;

// Helper text for form fields
export const FIELD_HELP_TEXT = {
  name: 'A descriptive name for the item (max 120 characters)',
  sku: 'Unique identifier for inventory tracking',
  categoryId: 'Select the category this item belongs to',
  storageUnit: 'Unit of measure for storage and counting',
  ingredientUnit: 'Unit of measure when used in recipes',
  barcode: 'Optional barcode for scanning (EAN-13, UPC, or custom)',
  cost: 'Supplier cost per unit (optional)',
  minimumLevel: 'Minimum stock level before reorder alert',
  parLevel: 'Target stock level to maintain',
  maximumLevel: 'Maximum stock level to avoid overstocking',
} as const;

export default validateItemForm;