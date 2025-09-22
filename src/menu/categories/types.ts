/**
 * Menu Category Types
 * Core data models for menu category management
 */

// Menu Category Entity (from menu-module-plan.md specification)
export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  branchIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface CreateCategoryRequest {
  name: string;
  displayOrder?: number;
  isActive?: boolean;
  branchIds?: string[];
}

export interface UpdateCategoryRequest {
  name?: string;
  displayOrder?: number;
  isActive?: boolean;
  branchIds?: string[];
}

export interface CategoriesResponse {
  categories: MenuCategory[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CategoryQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  branchId?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'displayOrder' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// Form Types
export interface CategoryFormData {
  name: string;
  displayOrder: number;
  isActive: boolean;
  branchIds: string[];
}

export interface CategoryFormErrors {
  name?: string | undefined;
  displayOrder?: string | undefined;
  branchIds?: string | undefined;
  isActive?: string | undefined;
  _form?: string | undefined;
}

// Business Rules Constants
export const CATEGORY_RULES = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  MAX_DISPLAY_ORDER: 999,
  MIN_DISPLAY_ORDER: 1,
} as const;

// Default Values
export const createDefaultCategoryData = (): CategoryFormData => ({
  name: '',
  displayOrder: 1,
  isActive: true,
  branchIds: [],
});

// Validation Utilities
export function validateCategoryName(name: string): { isValid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Category name is required' };
  }
  
  if (name.trim().length < CATEGORY_RULES.NAME_MIN_LENGTH) {
    return { isValid: false, message: `Name must be at least ${CATEGORY_RULES.NAME_MIN_LENGTH} characters` };
  }
  
  if (name.trim().length > CATEGORY_RULES.NAME_MAX_LENGTH) {
    return { isValid: false, message: `Name cannot exceed ${CATEGORY_RULES.NAME_MAX_LENGTH} characters` };
  }
  
  return { isValid: true };
}

export function validateDisplayOrder(order: number): { isValid: boolean; message?: string } {
  if (isNaN(order) || order < CATEGORY_RULES.MIN_DISPLAY_ORDER || order > CATEGORY_RULES.MAX_DISPLAY_ORDER) {
    return { 
      isValid: false, 
      message: `Display order must be between ${CATEGORY_RULES.MIN_DISPLAY_ORDER} and ${CATEGORY_RULES.MAX_DISPLAY_ORDER}` 
    };
  }
  
  return { isValid: true };
}
