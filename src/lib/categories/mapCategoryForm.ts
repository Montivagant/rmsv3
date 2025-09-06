import type { CategoryFormData } from '../../schemas/categoryForm';

// API payload interface for creating menu categories
export interface CreateCategoryAPIPayload {
  name: string;
  reference?: string;
}

// API response interface (simplified from the full Category interface)
export interface CategoryAPIResponse {
  id: string;
  name: string;
  reference?: string;
  path?: string;
  level?: number;
  isActive: boolean;
  // ... other fields that aren't part of the creation form
}

/**
 * Transform UI form data to API creation payload
 */
export function mapCategoryFormToCreatePayload(formData: CategoryFormData): CreateCategoryAPIPayload {
  const payload: CreateCategoryAPIPayload = {
    name: formData.name.trim()
  };

  // Add optional reference field only if it has a value
  if (formData.reference && formData.reference.trim()) {
    payload.reference = formData.reference.trim().toUpperCase();
  }

  return payload;
}

/**
 * Transform API response data to UI form data (for editing)
 */
export function mapCategoryAPIToForm(apiData: CategoryAPIResponse): Partial<CategoryFormData> {
  return {
    name: apiData.name,
    reference: apiData.reference || ''
  };
}
