import { z } from 'zod';

// Menu category form schema (simplified per requirements)
export const categoryFormSchema = z.object({
  name: z.string()
    .min(2, 'Category name must be at least 2 characters')
    .max(40, 'Category name cannot exceed 40 characters')
    .trim(),
  
  reference: z.string()
    .transform(val => val?.trim() || '')
    .refine(val => val === '' || (val.length >= 1 && val.length <= 24), 'Reference must be 1-24 characters if provided')
    .refine(val => val === '' || /^[A-Z0-9_-]+$/i.test(val), 'Reference can only contain letters, numbers, underscores, and hyphens (no spaces)')
    .transform(val => val.toUpperCase())
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;

export interface CategoryFormErrors {
  name?: string;
  reference?: string;
  _form?: string; // General form errors
}

// Default form data
export function createDefaultCategoryFormData(): CategoryFormData {
  return {
    name: '',
    reference: ''
  };
}

// Generate reference code from name
export function generateCategoryReference(name: string, existingReferences: string[] = []): string {
  if (!name.trim()) return '';
  
  // Generate base reference from name (first 4-6 letters)
  const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const baseRef = cleanName.substring(0, Math.min(6, cleanName.length)) || 'CAT';
  
  // If base is unique, use it
  if (!existingReferences.includes(baseRef)) {
    return baseRef;
  }
  
  // Add numeric suffix if needed
  let attempts = 0;
  let reference = '';
  
  do {
    const suffix = Math.floor(10 + Math.random() * 90); // 2-digit number
    reference = `${baseRef}${suffix}`;
    attempts++;
  } while (existingReferences.includes(reference) && attempts < 10);
  
  return reference;
}

// Validation function using Zod
export function validateCategoryForm(data: Partial<CategoryFormData>): {
  isValid: boolean;
  errors: CategoryFormErrors;
} {
  const result = categoryFormSchema.safeParse(data);
  
  if (result.success) {
    return { isValid: true, errors: {} };
  }
  
  const errors: CategoryFormErrors = {};
  
  result.error.issues.forEach((issue) => {
    const field = issue.path[0] as keyof CategoryFormErrors;
    if (field && field !== '_form') {
      errors[field] = issue.message;
    }
  });
  
  return { isValid: false, errors };
}

// Field labels and help text
export const CATEGORY_FIELD_LABELS = {
  name: 'Category Name',
  reference: 'Reference Code'
} as const;

export const CATEGORY_FIELD_HELP_TEXT = {
  name: 'Descriptive name for the menu category (max 40 chars)',
  reference: 'Optional reference code for imports/integrations (no spaces)'
} as const;
