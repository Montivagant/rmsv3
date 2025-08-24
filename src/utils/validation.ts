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

export interface ValidationRule {
  validator: (value: any, context?: any) => ValidationResult;
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

  if (/[<>{}[\]\\\/]/.test(name)) {
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
    .replace(/[<>{}[\]\\\/]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' '); // Normalize whitespace
};

// Business rule validators
export const businessRules = {
  // Check if customer is eligible for discount
  isEligibleForDiscount: (customer: { visits: number; totalSpent: number }): ValidationResult => {
    if (customer.visits >= 10 || customer.totalSpent >= 500) {
      return { isValid: true, message: 'Customer eligible for loyalty discount' };
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
  private values: Map<string, any> = new Map();
  private errors: Map<string, string> = new Map();

  addRule(field: string, rule: ValidationRule): void {
    if (!this.rules.has(field)) {
      this.rules.set(field, []);
    }
    this.rules.get(field)!.push(rule);
  }

  setValue(field: string, value: any): void {
    this.values.set(field, value);
    this.validateField(field);
  }

  validateField(field: string): ValidationResult {
    const rules = this.rules.get(field) || [];
    const value = this.values.get(field);

    for (const rule of rules) {
      const result = rule.validator(value, this.values);
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
