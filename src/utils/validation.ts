/**
 * Comprehensive Validation Utilities
 * 
 * Provides real-time validation, sanitization, and business rule enforcement
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  suggestions?: string[];
}

export interface ValidationRule<T = unknown> {
  validator: (value: T, context?: Record<string, unknown>) => ValidationResult;
  message: string;
  level: 'error' | 'warning' | 'info';
}

// Email validation with comprehensive checks
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return { 
      isValid: false, 
      message: 'Please enter a valid email address',
      suggestions: ['Example: user@example.com']
    };
  }

  // Check for common typos
  const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (domain && !commonDomains.includes(domain)) {
    const suggestions = commonDomains
      .filter(d => d.includes(domain.slice(0, 3)))
      .map(d => email.replace(domain, d));
    
    if (suggestions.length > 0) {
      return {
        isValid: true,
        message: 'Email looks correct',
        suggestions: [`Did you mean: ${suggestions[0]}?`]
      };
    }
  }

  return { isValid: true };
};

// Phone number validation and formatting
export const validatePhone = (phone: string): ValidationResult => {
  if (!phone) {
    return { isValid: false, message: 'Phone number is required' };
  }

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 10) {
    return { 
      isValid: false, 
      message: 'Phone number must be at least 10 digits',
      suggestions: ['Example: (555) 123-4567']
    };
  }

  if (digits.length > 11) {
    return { 
      isValid: false, 
      message: 'Phone number is too long',
      suggestions: ['Use format: (555) 123-4567']
    };
  }

  return { isValid: true };
};

// Format phone number for display
export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone;
};

// SKU validation with uniqueness check
export const validateSKU = (sku: string, existingSKUs: string[] = []): ValidationResult => {
  if (!sku) {
    return { isValid: false, message: 'SKU is required' };
  }

  // SKU format validation
  const skuRegex = /^[A-Z0-9_-]{3,20}$/;
  
  if (!skuRegex.test(sku.toUpperCase())) {
    return { 
      isValid: false, 
      message: 'SKU must be 3-20 characters, letters, numbers, underscore, or hyphen only',
      suggestions: ['Example: BEEF-001, CHKN_BREAST, FRIES001']
    };
  }

  // Check uniqueness
  if (existingSKUs.includes(sku.toUpperCase())) {
    return { 
      isValid: false, 
      message: 'SKU already exists',
      suggestions: [`Try: ${sku}_V2, ${sku}-NEW, ${sku}001`]
    };
  }

  return { isValid: true };
};

// Currency validation
export const validateCurrency = (value: string | number): ValidationResult => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { 
      isValid: false, 
      message: 'Please enter a valid amount',
      suggestions: ['Example: 12.99, 5.00']
    };
  }

  if (numValue < 0) {
    return { 
      isValid: false, 
      message: 'Amount cannot be negative'
    };
  }

  if (numValue > 9999.99) {
    return { 
      isValid: false, 
      message: 'Amount seems unusually high. Please verify.',
      suggestions: ['Maximum recommended: $9,999.99']
    };
  }

  return { isValid: true };
};

// Quantity validation with business rules
export const validateQuantity = (quantity: string | number, context?: {
  maxStock?: number;
  minOrder?: number;
  itemType?: string;
}): ValidationResult => {
  const numValue = typeof quantity === 'string' ? parseInt(quantity) : quantity;
  
  if (isNaN(numValue) || numValue < 0) {
    return { 
      isValid: false, 
      message: 'Quantity must be a positive number'
    };
  }

  if (context?.minOrder && numValue < context.minOrder) {
    return { 
      isValid: false, 
      message: `Minimum order quantity is ${context.minOrder}`
    };
  }

  if (context?.maxStock && numValue > context.maxStock) {
    return { 
      isValid: false, 
      message: `Maximum stock level is ${context.maxStock}`,
      suggestions: ['Consider splitting into multiple batches']
    };
  }

  if (numValue > 10000) {
    return { 
      isValid: false, 
      message: 'Quantity seems unusually high. Please verify.',
      suggestions: ['Contact manager for quantities over 10,000']
    };
  }

  return { isValid: true };
};

// Name validation with smart suggestions
export const validateName = (name: string): ValidationResult => {
  if (!name) {
    return { isValid: false, message: 'Name is required' };
  }

  if (name.length < 2) {
    return { 
      isValid: false, 
      message: 'Name must be at least 2 characters'
    };
  }

  if (name.length > 100) {
    return { 
      isValid: false, 
      message: 'Name is too long (maximum 100 characters)'
    };
  }

  // Check for suspicious patterns
  if (/^\d+$/.test(name)) {
    return { 
      isValid: false, 
      message: 'Name cannot be only numbers'
    };
  }

  if (/[<>{}[\]\\]/.test(name)) {
    return { 
      isValid: false, 
      message: 'Name contains invalid characters'
    };
  }

  return { isValid: true };
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>{}[\]\\]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' '); // Normalize whitespace
};

// Business rule validators
export const businessRules = {
  // Check if customer is eligible for discount
  isEligibleForDiscount: (customer: { visits: number; totalSpent: number }): ValidationResult => {
    if (customer.visits >= 10 || customer.totalSpent >= 500) {
      return { isValid: true };
    }
    return { isValid: false, message: 'Customer not yet eligible for discounts' };
  },

  // Validate inventory reorder point
  validateReorderPoint: (current: number, reorderPoint: number, maxStock: number): ValidationResult => {
    if (reorderPoint >= maxStock) {
      return { 
        isValid: false, 
        message: 'Reorder point must be less than maximum stock level'
      };
    }
    
    if (reorderPoint > current) {
      return { 
        isValid: true, 
        message: 'Reorder alert will trigger immediately',
        suggestions: ['Consider adjusting reorder point based on current stock']
      };
    }
    
    return { isValid: true };
  }
};

// Validation composer for complex forms
export class FormValidator {
  private rules: Map<string, ValidationRule[]> = new Map();
  private values: Map<string, unknown> = new Map();
  private errors: Map<string, string> = new Map();

  addRule(field: string, rule: ValidationRule): void {
    if (!this.rules.has(field)) {
      this.rules.set(field, []);
    }
    this.rules.get(field)!.push(rule);
  }

  setValue(field: string, value: unknown): void {
    this.values.set(field, value);
    this.validateField(field);
  }

  validateField(field: string): ValidationResult {
    const rules = this.rules.get(field) || [];
    const value = this.values.get(field);
    const context = Object.fromEntries(this.values);

    for (const rule of rules) {
      const result = rule.validator(value, context);
      if (!result.isValid) {
        this.errors.set(field, result.message || 'Invalid value');
        return result;
      }
    }

    this.errors.delete(field);
    return { isValid: true };
  }

  validateAll(): boolean {
    let isValid = true;
    
    for (const field of this.rules.keys()) {
      const result = this.validateField(field);
      if (!result.isValid) {
        isValid = false;
      }
    }
    
    return isValid;
  }

  getErrors(): Record<string, string> {
    return Object.fromEntries(this.errors);
  }

  hasErrors(): boolean {
    return this.errors.size > 0;
  }

  getError(field: string): string | undefined {
    return this.errors.get(field);
  }
}

// Menu Item Validation
export const validateMenuItemName = (name: string): ValidationResult => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { 
      isValid: false, 
      message: 'Menu item name is required',
      suggestions: ['Enter a descriptive name for the menu item']
    };
  }
  if (trimmed.length < 2) {
    return { 
      isValid: false, 
      message: 'Menu item name must be at least 2 characters',
      suggestions: ['Try: "Burger", "Coffee", "Fries"']
    };
  }
  if (trimmed.length > 50) {
    return { 
      isValid: false, 
      message: 'Menu item name must be 50 characters or less',
      suggestions: [`Try shortening: "${trimmed.substring(0, 47)}..."`]
    };
  }
  return { isValid: true };
};

export const validateMenuItemDescription = (description: string): ValidationResult => {
  if (!description) return { isValid: true }; // Optional field
  
  const trimmed = description.trim();
  if (trimmed.length > 200) {
    return { 
      isValid: false, 
      message: 'Description must be 200 characters or less',
      suggestions: [`Current: ${trimmed.length} characters. Try shortening the description.`]
    };
  }
  return { isValid: true };
};

export const validateMenuItemPrice = (price: string | number): ValidationResult => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numPrice)) {
    return { 
      isValid: false, 
      message: 'Price must be a valid number',
      suggestions: ['Enter a decimal number like 9.99']
    };
  }
  
  if (numPrice < 0) {
    return { 
      isValid: false, 
      message: 'Price cannot be negative',
      suggestions: ['Enter a positive price amount']
    };
  }
  
  if (numPrice === 0) {
    return { 
      isValid: false, 
      message: 'Price cannot be zero',
      suggestions: ['Enter the actual price for this menu item']
    };
  }
  
  if (numPrice > 1000) {
    return { 
      isValid: false, 
      message: 'Price seems unusually high (over $1000)',
      suggestions: ['Double-check the price amount']
    };
  }
  
  // Check for reasonable decimal precision
  const decimalPlaces = (numPrice.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return { 
      isValid: false, 
      message: 'Price should have at most 2 decimal places',
      suggestions: [`Try: $${numPrice.toFixed(2)}`]
    };
  }
  
  return { isValid: true };
};

export const validateMenuItemCategory = (category: string, existingCategories: string[] = []): ValidationResult => {
  const trimmed = category.trim();
  if (!trimmed) {
    return { 
      isValid: false, 
      message: 'Category is required',
      suggestions: existingCategories.length > 0 ? existingCategories : ['Main', 'Sides', 'Drinks', 'Desserts']
    };
  }
  if (trimmed.length < 2) {
    return { 
      isValid: false, 
      message: 'Category must be at least 2 characters',
      suggestions: ['Main', 'Sides', 'Drinks']
    };
  }
  if (trimmed.length > 30) {
    return { 
      isValid: false, 
      message: 'Category must be 30 characters or less',
      suggestions: [`Try shortening: "${trimmed.substring(0, 27)}..."`]
    };
  }
  return { isValid: true };
};


