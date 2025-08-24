/**
 * Business Rules Engine
 * Restaurant-specific validation and business logic
 */

import type { BusinessRule, ValidationResult } from './validation'

// Types for restaurant domain
export interface InventoryItem {
  id?: string
  sku: string
  name: string
  quantity: number
  lowStockThreshold: number
  price: number
  category: string
  unit: string
}

export interface Customer {
  id?: string
  email: string
  firstName: string
  lastName: string
  phone: string
  loyaltyPoints: number
}

export interface Product {
  id?: string
  sku: string
  name: string
  price: number
  category: string
  taxRate: number
  description?: string
}

// Service interfaces for data validation
export interface ValidationServices {
  checkSkuUniqueness: (sku: string, excludeId?: string) => Promise<boolean>
  checkEmailUniqueness: (email: string, excludeId?: string) => Promise<boolean>
  checkCategoryExists: (categoryId: string) => Promise<boolean>
  getProductBySku: (sku: string) => Promise<Product | null>
  getCustomerByEmail: (email: string) => Promise<Customer | null>
}

// Input masks for common restaurant data
export const inputMasks = {
  currency: (value: string): string => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^\d.]/g, '')
    // Ensure only one decimal point
    const parts = cleaned.split('.')
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('')
    }
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2)
    }
    return cleaned
  },

  phone: (value: string): string => {
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '')
    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  },

  sku: (value: string): string => {
    // Convert to uppercase, remove spaces and special characters except hyphens
    return value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  },

  percentage: (value: string): string => {
    const cleaned = value.replace(/[^\d.]/g, '')
    const num = parseFloat(cleaned)
    if (isNaN(num)) return ''
    // Limit to 100%
    return Math.min(num, 100).toString()
  },

  quantity: (value: string): string => {
    // Only allow positive integers
    const cleaned = value.replace(/[^\d]/g, '')
    return cleaned
  },
}

// Value formatters
export const valueFormatters = {
  currency: (value: string): string => {
    const num = parseFloat(value)
    if (isNaN(num)) return '0.00'
    return num.toFixed(2)
  },

  phone: (value: string): string => {
    // Extract only digits for storage
    return value.replace(/\D/g, '')
  },

  percentage: (value: string): string => {
    const num = parseFloat(value)
    if (isNaN(num)) return '0'
    return (num / 100).toString() // Convert percentage to decimal for storage
  },
}

// Restaurant-specific business rules
export function createRestaurantBusinessRules(services: ValidationServices): BusinessRule[] {
  return [
    // SKU Uniqueness Rule
    {
      id: 'sku-uniqueness',
      name: 'SKU Uniqueness',
      description: 'Product SKU must be unique across all inventory items',
      scope: 'field',
      priority: 1,
      validate: async (formData): Promise<ValidationResult> => {
        const sku = formData.sku as string
        const itemId = formData.id as string | undefined

        if (!sku || sku.trim().length === 0) {
          return { isValid: true, errors: [], warnings: [], info: [] }
        }

        try {
          const isUnique = await services.checkSkuUniqueness(sku, itemId)
          return {
            isValid: isUnique,
            errors: isUnique ? [] : ['SKU already exists. Please choose a different SKU.'],
            warnings: [],
            info: [],
          }
        } catch (error) {
          console.error('SKU uniqueness check failed:', error)
          return {
            isValid: false,
            errors: ['Unable to verify SKU uniqueness. Please try again.'],
            warnings: [],
            info: [],
          }
        }
      },
    },

    // Email Uniqueness Rule
    {
      id: 'email-uniqueness',
      name: 'Email Uniqueness',
      description: 'Customer email must be unique across all customers',
      scope: 'field',
      priority: 1,
      validate: async (formData): Promise<ValidationResult> => {
        const email = formData.email as string
        const customerId = formData.id as string | undefined

        if (!email || email.trim().length === 0) {
          return { isValid: true, errors: [], warnings: [], info: [] }
        }

        try {
          const isUnique = await services.checkEmailUniqueness(email, customerId)
          return {
            isValid: isUnique,
            errors: isUnique ? [] : ['Email already registered. Please use a different email.'],
            warnings: [],
            info: [],
          }
        } catch (error) {
          console.error('Email uniqueness check failed:', error)
          return {
            isValid: false,
            errors: ['Unable to verify email uniqueness. Please try again.'],
            warnings: [],
            info: [],
          }
        }
      },
    },

    // Inventory Constraints Rule
    {
      id: 'inventory-constraints',
      name: 'Inventory Constraints',
      description: 'Inventory quantities must be valid and within business limits',
      scope: 'form',
      priority: 2,
      validate: async (formData): Promise<ValidationResult> => {
        const quantity = Number(formData.quantity) || 0
        const lowStockThreshold = Number(formData.lowStockThreshold) || 0
        const price = Number(formData.price) || 0

        const errors: string[] = []
        const warnings: string[] = []
        const info: string[] = []

        // Quantity validation
        if (quantity < 0) {
          errors.push('Quantity cannot be negative')
        } else if (quantity === 0) {
          warnings.push('Item is currently out of stock')
        } else if (quantity > 10000) {
          warnings.push('Very large quantity detected. Please verify this is correct.')
        }

        // Low stock threshold validation
        if (lowStockThreshold < 0) {
          errors.push('Low stock threshold cannot be negative')
        } else if (lowStockThreshold > quantity && quantity > 0) {
          warnings.push('Low stock threshold is higher than current quantity')
        }

        // Price validation
        if (price < 0) {
          errors.push('Price cannot be negative')
        } else if (price === 0) {
          warnings.push('Free items should be reviewed for accuracy')
        } else if (price > 1000) {
          warnings.push('High price detected. Please verify this is correct.')
        }

        // Business logic warnings
        if (quantity > 0 && quantity <= lowStockThreshold) {
          info.push('Item is at or below low stock threshold')
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          info,
        }
      },
    },

    // Category Validation Rule
    {
      id: 'category-validation',
      name: 'Category Validation',
      description: 'Product category must exist in the system',
      scope: 'field',
      priority: 1,
      validate: async (formData): Promise<ValidationResult> => {
        const categoryId = formData.category as string

        if (!categoryId || categoryId.trim().length === 0) {
          return {
            isValid: false,
            errors: ['Please select a category'],
            warnings: [],
            info: [],
          }
        }

        try {
          const categoryExists = await services.checkCategoryExists(categoryId)
          return {
            isValid: categoryExists,
            errors: categoryExists ? [] : ['Selected category does not exist'],
            warnings: [],
            info: [],
          }
        } catch (error) {
          console.error('Category validation failed:', error)
          return {
            isValid: false,
            errors: ['Unable to verify category. Please try again.'],
            warnings: [],
            info: [],
          }
        }
      },
    },

    // Customer Data Validation Rule
    {
      id: 'customer-data-validation',
      name: 'Customer Data Validation',
      description: 'Customer information must meet business requirements',
      scope: 'form',
      priority: 2,
      validate: async (formData): Promise<ValidationResult> => {
        const firstName = formData.firstName as string
        const lastName = formData.lastName as string
        const phone = formData.phone as string
        const loyaltyPoints = Number(formData.loyaltyPoints) || 0

        const errors: string[] = []
        const warnings: string[] = []
        const info: string[] = []

        // Name validation
        if (!firstName || firstName.trim().length === 0) {
          errors.push('First name is required')
        } else if (firstName.length < 2) {
          errors.push('First name must be at least 2 characters')
        }

        if (!lastName || lastName.trim().length === 0) {
          errors.push('Last name is required')
        } else if (lastName.length < 2) {
          errors.push('Last name must be at least 2 characters')
        }

        // Phone validation
        if (phone && phone.replace(/\D/g, '').length !== 10) {
          errors.push('Phone number must be 10 digits')
        }

        // Loyalty points validation
        if (loyaltyPoints < 0) {
          errors.push('Loyalty points cannot be negative')
        } else if (loyaltyPoints > 100000) {
          warnings.push('Very high loyalty points balance. Please verify this is correct.')
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          info,
        }
      },
    },

    // Tax Rate Validation Rule
    {
      id: 'tax-rate-validation',
      name: 'Tax Rate Validation',
      description: 'Tax rates must be valid percentages',
      scope: 'field',
      priority: 1,
      validate: async (formData): Promise<ValidationResult> => {
        const taxRate = Number(formData.taxRate) || 0

        const errors: string[] = []
        const warnings: string[] = []

        if (taxRate < 0) {
          errors.push('Tax rate cannot be negative')
        } else if (taxRate > 1) {
          errors.push('Tax rate cannot exceed 100%')
        } else if (taxRate > 0.25) {
          warnings.push('High tax rate detected. Please verify this is correct.')
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          info: [],
        }
      },
    },

    // Recipe Validation Rule
    {
      id: 'recipe-validation',
      name: 'Recipe Validation',
      description: 'Recipe ingredients must be valid and available',
      scope: 'form',
      priority: 2,
      validate: async (formData): Promise<ValidationResult> => {
        const ingredients = formData.ingredients as Array<{ sku: string; quantity: number }> || []

        const errors: string[] = []
        const warnings: string[] = []
        const info: string[] = []

        if (ingredients.length === 0) {
          warnings.push('Recipe has no ingredients defined')
          return { isValid: true, errors, warnings, info }
        }

        // Validate each ingredient
        for (let i = 0; i < ingredients.length; i++) {
          const ingredient = ingredients[i]
          
          if (!ingredient.sku || ingredient.sku.trim().length === 0) {
            errors.push(`Ingredient ${i + 1}: SKU is required`)
            continue
          }

          if (!ingredient.quantity || ingredient.quantity <= 0) {
            errors.push(`Ingredient ${i + 1}: Quantity must be greater than 0`)
            continue
          }

          try {
            const product = await services.getProductBySku(ingredient.sku)
            if (!product) {
              errors.push(`Ingredient ${i + 1}: Product with SKU "${ingredient.sku}" not found`)
            }
          } catch (error) {
            console.error(`Failed to validate ingredient ${ingredient.sku}:`, error)
            errors.push(`Ingredient ${i + 1}: Unable to verify product`)
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          info,
        }
      },
    },
  ]
}

// Helper function to create mock services for development/testing
export function createMockValidationServices(): ValidationServices {
  // Mock data
  const mockSkus = new Set(['BURGER-001', 'FRIES-001', 'DRINK-001'])
  const mockEmails = new Set(['john@example.com', 'jane@example.com'])
  const mockCategories = new Set(['main-course', 'sides', 'beverages', 'desserts'])

  return {
    checkSkuUniqueness: async (sku: string, excludeId?: string): Promise<boolean> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      return !mockSkus.has(sku.toUpperCase())
    },

    checkEmailUniqueness: async (email: string, excludeId?: string): Promise<boolean> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      return !mockEmails.has(email.toLowerCase())
    },

    checkCategoryExists: async (categoryId: string): Promise<boolean> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 200))
      return mockCategories.has(categoryId)
    },

    getProductBySku: async (sku: string): Promise<Product | null> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 400))
      
      if (mockSkus.has(sku.toUpperCase())) {
        return {
          id: 'mock-id',
          sku: sku.toUpperCase(),
          name: `Mock Product ${sku}`,
          price: 9.99,
          category: 'main-course',
          taxRate: 0.08,
        }
      }
      
      return null
    },

    getCustomerByEmail: async (email: string): Promise<Customer | null> => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      if (mockEmails.has(email.toLowerCase())) {
        return {
          id: 'mock-customer-id',
          email: email.toLowerCase(),
          firstName: 'Mock',
          lastName: 'Customer',
          phone: '1234567890',
          loyaltyPoints: 100,
        }
      }
      
      return null
    },
  }
}

export default {
  createRestaurantBusinessRules,
  createMockValidationServices,
  inputMasks,
  valueFormatters,
}