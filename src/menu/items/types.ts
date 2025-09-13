/**
 * Menu Item Types  
 * Core data models for menu item management
 */

// Menu Item Entity (from menu-module-plan.md specification)
export interface MenuItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  taxRate: number;
  isActive: boolean;
  isAvailable: boolean; // Manual availability toggle
  branchIds: string[];
  // Phase 2 additions (for future)
  recipeId?: string;
  modifierGroups?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface CreateMenuItemRequest {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  taxRate?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  branchIds?: string[];
}

export interface UpdateMenuItemRequest {
  sku?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  taxRate?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  branchIds?: string[];
}

export interface MenuItemsResponse {
  items: MenuItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MenuItemQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  branchId?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  sortBy?: 'name' | 'price' | 'category' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// Form Types
export interface MenuItemFormData {
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  taxRate: number;
  isActive: boolean;
  isAvailable: boolean;
  branchIds: string[];
}

export interface MenuItemFormErrors {
  sku?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  price?: string;
  taxRate?: string;
  branchIds?: string;
  _form?: string;
}

// Business Rules Constants
export const MENU_ITEM_RULES = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 200,
  SKU_MIN_LENGTH: 3,
  SKU_MAX_LENGTH: 20,
  MIN_PRICE: 0.01,
  MAX_PRICE: 9999.99,
  MIN_TAX_RATE: 0,
  MAX_TAX_RATE: 1,
} as const;

// Default Values
export const createDefaultMenuItemData = (): MenuItemFormData => ({
  sku: '',
  name: '',
  description: '',
  categoryId: '',
  price: 0,
  taxRate: 0.15, // Default 15% tax rate
  isActive: true,
  isAvailable: true,
  branchIds: [],
});

// Validation Utilities
export function validateMenuItemName(name: string): { isValid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, message: 'Item name is required' };
  }
  
  if (name.trim().length < MENU_ITEM_RULES.NAME_MIN_LENGTH) {
    return { isValid: false, message: `Name must be at least ${MENU_ITEM_RULES.NAME_MIN_LENGTH} characters` };
  }
  
  if (name.trim().length > MENU_ITEM_RULES.NAME_MAX_LENGTH) {
    return { isValid: false, message: `Name cannot exceed ${MENU_ITEM_RULES.NAME_MAX_LENGTH} characters` };
  }
  
  return { isValid: true };
}

export function validateMenuItemSKU(sku: string): { isValid: boolean; message?: string } {
  if (!sku || sku.trim().length === 0) {
    return { isValid: false, message: 'SKU is required' };
  }
  
  const trimmedSku = sku.trim().toUpperCase();
  
  if (trimmedSku.length < MENU_ITEM_RULES.SKU_MIN_LENGTH) {
    return { isValid: false, message: `SKU must be at least ${MENU_ITEM_RULES.SKU_MIN_LENGTH} characters` };
  }
  
  if (trimmedSku.length > MENU_ITEM_RULES.SKU_MAX_LENGTH) {
    return { isValid: false, message: `SKU cannot exceed ${MENU_ITEM_RULES.SKU_MAX_LENGTH} characters` };
  }
  
  // SKU format validation
  if (!/^[A-Z0-9_-]+$/.test(trimmedSku)) {
    return { isValid: false, message: 'SKU can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { isValid: true };
}

export function validateMenuItemPrice(price: number): { isValid: boolean; message?: string } {
  if (isNaN(price) || price < MENU_ITEM_RULES.MIN_PRICE) {
    return { isValid: false, message: `Price must be at least $${MENU_ITEM_RULES.MIN_PRICE}` };
  }
  
  if (price > MENU_ITEM_RULES.MAX_PRICE) {
    return { isValid: false, message: `Price cannot exceed $${MENU_ITEM_RULES.MAX_PRICE}` };
  }
  
  return { isValid: true };
}

export function validateTaxRate(taxRate: number): { isValid: boolean; message?: string } {
  if (isNaN(taxRate) || taxRate < MENU_ITEM_RULES.MIN_TAX_RATE || taxRate > MENU_ITEM_RULES.MAX_TAX_RATE) {
    return { 
      isValid: false, 
      message: `Tax rate must be between ${MENU_ITEM_RULES.MIN_TAX_RATE} and ${MENU_ITEM_RULES.MAX_TAX_RATE}` 
    };
  }
  
  return { isValid: true };
}

// SKU Generation for Menu Items
export function generateMenuItemSKU(name: string, categoryName: string = '', existingSKUs: string[] = []): string {
  // Create base from category and item name
  const categoryBase = categoryName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3) || 'MNU';
  const nameBase = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
  
  let sku = `${categoryBase}-${nameBase}`;
  let counter = 1;
  
  // Ensure uniqueness
  while (existingSKUs.includes(sku)) {
    sku = `${categoryBase}-${nameBase}-${counter}`;
    counter++;
  }
  
  return sku;
}
