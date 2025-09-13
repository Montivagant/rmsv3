/**
 * Enhanced Form Validation Framework
 * Provides real-time validation with user-friendly feedback
 * Supports business rules, cross-field validation, and accessibility
 */

import { useState, useCallback } from 'react'

// Core validation types
export interface ValidationResult {
  isValid: boolean
  message?: string
  warnings?: string[]
  info?: string[]
}

export interface ValidationRule<T = any> {
  id: string
  message: string
  validate: (value: T, formData?: Record<string, unknown>) => ValidationResult
  validateAsync?: (value: T, formData?: Record<string, unknown>) => Promise<ValidationResult>
  severity?: 'error' | 'warning' | 'info'
  dependencies?: string[] // Fields this rule depends on
}

export interface FieldValidationState {
  value: unknown
  errors: string[]
  warnings: string[]
  info: string[]
  isValidating: boolean
  hasBeenTouched: boolean
  hasBeenFocused: boolean
}

export interface FormValidationState {
  fields: Record<string, FieldValidationState>
  isValid: boolean
  isValidating: boolean
  hasErrors: boolean
  hasWarnings: boolean
  globalErrors: string[]
  globalWarnings: string[]
}

// Business rule types
export interface BusinessRule {
  id: string
  name: string
  description: string
  validate: (formData: Record<string, unknown>) => ValidationResult | Promise<ValidationResult>
  scope: 'field' | 'form' | 'cross-field'
  priority: number
}

// Form configuration
export interface FormConfig {
  validateOnChange?: boolean
  validateOnBlur?: boolean
  validateOnSubmit?: boolean
  debounceMs?: number
  showWarnings?: boolean
  showInfo?: boolean
  autoFocus?: boolean
  retainFocusOnError?: boolean
}

// Built-in validation rules
export const validationRules = {
  required: <T>(message = 'This field is required'): ValidationRule<T> => ({
    id: 'required',
    message,
    validate: (value) => {
      let isValid = false
      if (typeof value === 'string') isValid = value.trim().length > 0
      else if (Array.isArray(value)) isValid = value.length > 0
      else isValid = value != null && value !== ''
      
      return isValid ? { isValid: true } : { isValid: false, message }
    },
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule<string> => ({
    id: 'email',
    message,
    validate: (value) => {
      if (!value) return { isValid: true } // Allow empty (use required rule for mandatory)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const isValid = emailRegex.test(value)
      
      if (!isValid) {
        // Check for common email domain typos
        const commonTypos: Record<string, string> = {
          'gmial.com': 'gmail.com',
          'gmai.com': 'gmail.com',
          'gmil.com': 'gmail.com',
          'gmal.com': 'gmail.com',
          'gmail.co': 'gmail.com',
          'gmail.cm': 'gmail.com',
          'yaho.com': 'yahoo.com',
          'yahooo.com': 'yahoo.com',
          'yahoo.co': 'yahoo.com',
          'hotmial.com': 'hotmail.com',
          'hotmai.com': 'hotmail.com',
          'hotmal.com': 'hotmail.com',
          'hotmail.co': 'hotmail.com',
          'outlok.com': 'outlook.com',
          'outloo.com': 'outlook.com',
          'outlook.co': 'outlook.com',
          'iclod.com': 'icloud.com',
          'icloud.co': 'icloud.com'
        }
        
        // Extract domain from email
        const atIndex = value.indexOf('@')
        if (atIndex > 0) {
          const domain = value.substring(atIndex + 1).toLowerCase()
          const suggestion = commonTypos[domain]
          
          if (suggestion) {
            const suggestedEmail = value.substring(0, atIndex + 1) + suggestion
            return {
              isValid: false,
              message: `${message}. Did you mean ${suggestedEmail}?`
            }
          }
        }
        
        return { isValid: false, message }
      }
      
      return { isValid: true }
    },
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    id: 'minLength',
    message: message || `Must be at least ${min} characters`,
    validate: (value) => {
      if (!value) return { isValid: true }
      const isValid = value.length >= min
      return isValid ? { isValid: true } : { isValid: false, message: message || `Must be at least ${min} characters` }
    },
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    id: 'maxLength',
    message: message || `Must be no more than ${max} characters`,
    validate: (value) => {
      if (!value) return { isValid: true }
      const isValid = value.length <= max
      return isValid ? { isValid: true } : { isValid: false, message: message || `Must be no more than ${max} characters` }
    },
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    id: 'pattern',
    message,
    validate: (value) => {
      if (!value) return { isValid: true }
      const isValid = regex.test(value)
      return isValid ? { isValid: true } : { isValid: false, message }
    },
  }),

  unique: (
    checkUnique: (value: unknown) => boolean | Promise<boolean>,
    message = 'This value must be unique'
  ): ValidationRule => ({
    id: 'unique',
    message,
    validate: () => {
      // Sync validation not supported for async checks
      return { isValid: true }
    },
    validateAsync: async (value) => {
      const isUnique = await checkUnique(value)
      return isUnique ? { isValid: true } : { isValid: false, message }
    }
  }),

  conditional: <T>(
    condition: (formData: Record<string, unknown>) => boolean,
    rule: ValidationRule<T>
  ): ValidationRule<T> => ({
    id: `conditional_${rule.id}`,
    message: rule.message,
    validate: (value, formData) => {
      if (!condition(formData || {})) return { isValid: true }
      return rule.validate(value, formData)
    },
    dependencies: rule.dependencies,
  }),
}

// Cross-field validation utilities
export const crossFieldRules = {
  // Ensure confirm password matches password
  confirmPassword: (passwordField = 'password'): ValidationRule<string> => ({
    id: 'confirmPassword',
    message: 'Passwords do not match',
    validate: (value, formData) => {
      const password = formData?.[passwordField] as string
      const isValid = !value || !password || value === password
      return isValid ? { isValid: true } : { isValid: false, message: 'Passwords do not match' }
    },
    dependencies: [passwordField],
  }),

  // Ensure end date is after start date
  dateRange: (startDateField: string, endDateField: string): ValidationRule<string> => ({
    id: 'dateRange',
    message: 'End date must be after start date',
    validate: (_value, formData) => {
      const startDate = formData?.[startDateField] as string
      const endDate = formData?.[endDateField] as string
      
      if (!startDate || !endDate) return { isValid: true }
      
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      const isValid = end >= start
      return isValid ? { isValid: true } : { isValid: false, message: 'End date must be after start date' }
    },
    dependencies: [startDateField, endDateField],
  }),

  // Ensure quantity doesn't exceed available stock
  stockConstraint: (stockField: string): ValidationRule<number> => ({
    id: 'stockConstraint',
    message: 'Quantity cannot exceed available stock',
    validate: (value, formData) => {
      const availableStock = Number(formData?.[stockField]) || 0
      const requestedQuantity = Number(value) || 0
      
      const isValid = requestedQuantity <= availableStock
      return isValid ? { isValid: true } : { isValid: false, message: 'Quantity cannot exceed available stock' }
    },
    dependencies: [stockField],
  }),

  // Ensure total percentage doesn't exceed 100%
  percentageTotal: (fields: string[], maxTotal = 100): ValidationRule<number> => ({
    id: 'percentageTotal',
    message: `Total percentage cannot exceed ${maxTotal}%`,
    validate: (_value, formData) => {
      const total = fields.reduce((sum, field) => {
        return sum + (Number(formData?.[field]) || 0)
      }, 0)
      
      const isValid = total <= maxTotal
      return isValid ? { isValid: true } : { isValid: false, message: `Total percentage cannot exceed ${maxTotal}%` }
    },
    dependencies: fields,
  }),

  // Ensure low stock threshold is reasonable compared to max quantity
  lowStockThreshold: (quantityField = 'quantity'): ValidationRule<number> => ({
    id: 'lowStockThreshold',
    message: 'Low stock threshold should be less than total quantity',
    severity: 'warning',
    validate: (value, formData) => {
      const quantity = Number(formData?.[quantityField]) || 0
      const threshold = Number(value) || 0
      
      if (quantity === 0) return { isValid: true } // No stock, threshold irrelevant
      
      const isValid = threshold < quantity
      if (!isValid && threshold >= quantity) {
        return { 
          isValid: true, // Still valid but with warning
          warnings: ['Low stock threshold is higher than current quantity']
        }
      }
      return { isValid: true }
    },
    dependencies: [quantityField],
  }),

  // Ensure price is within reasonable range of base price
  priceRange: (basePriceField: string, minPercent = 50, maxPercent = 200): ValidationRule<number> => ({
    id: 'priceRange',
    message: `Price should be within ${minPercent}% to ${maxPercent}% of base price`,
    severity: 'warning',
    validate: (value, formData) => {
      const basePrice = Number(formData?.[basePriceField]) || 0
      const currentPrice = Number(value) || 0
      
      if (basePrice === 0) return { isValid: true } // No base price to compare
      
      const percentage = (currentPrice / basePrice) * 100
      
      const isValid = percentage >= minPercent && percentage <= maxPercent
      return isValid ? { isValid: true } : { isValid: false, message: `Price should be within ${minPercent}% to ${maxPercent}% of base price` }
    },
    dependencies: [basePriceField],
  }),

  // Ensure numeric range is valid
  numericRange: (minField: string, maxField: string): ValidationRule<number> => ({
    id: 'numericRange',
    message: 'Maximum value must be greater than minimum value',
    validate: (_value, formData) => {
      const minValue = Number(formData?.[minField]) || 0
      const maxValue = Number(formData?.[maxField]) || 0
      
      if (minValue === 0 && maxValue === 0) return { isValid: true }
      
      const isValid = maxValue > minValue
      return isValid ? { isValid: true } : { isValid: false, message: 'Maximum value must be greater than minimum value' }
    },
    dependencies: [minField, maxField],
  }),
}

// Restaurant-specific cross-field validation examples
export const restaurantCrossFieldRules = {
  // Product form: ensure selling price covers cost
  profitMargin: (): ValidationRule<number> => ({
    id: 'profitMargin',
    message: 'Selling price should be higher than cost price',
    severity: 'warning',
    validate: (_value, formData) => {
      const sellingPrice = Number(formData?.sellingPrice) || Number(_value) || 0
      const costPrice = Number(formData?.costPrice) || 0
      
      if (costPrice === 0) return { isValid: true } // No cost price set
      
      const isValid = sellingPrice > costPrice
      return isValid ? { isValid: true } : { isValid: false, message: 'Selling price should be higher than cost price' }
    },
    dependencies: ['costPrice'],
  }),

  // Menu item: ensure preparation time is reasonable for category
  preparationTime: (): ValidationRule<number> => ({
    id: 'preparationTime',
    message: 'Preparation time seems unusually long for this category',
    severity: 'warning',
    validate: (_value, formData) => {
      const prepTime = Number(formData?.preparationTime) || Number(_value) || 0
      const category = formData?.category as string
      
      // Category-based time limits (in minutes)
      const timeLimits: Record<string, number> = {
        'beverages': 5,
        'appetizers': 15,
        'salads': 10,
        'main-course': 30,
        'desserts': 20,
      }
      
      const maxTime = timeLimits[category] || 60 // Default 60 minutes
      
      if (prepTime > maxTime) {
        return {
          isValid: true, // Still valid but with warning
          warnings: [`Very long preparation time for ${category}`]
        }
      }
      return { isValid: true }
    },
    dependencies: ['category'],
  }),

  // Customer form: ensure loyalty points are reasonable for spending
  loyaltyPointsRatio: (): ValidationRule<number> => ({
    id: 'loyaltyPointsRatio',
    message: 'Loyalty points seem high for customer spending level',
    severity: 'info',
    validate: (value, formData) => {
      const loyaltyPoints = Number(value) || 0
      const totalSpent = Number(formData?.totalSpent) || 0
      
      if (totalSpent === 0) return { isValid: true } // New customer
      
      // Typical ratio: 1 point per dollar spent
      const expectedPoints = totalSpent
      const variance = Math.abs(loyaltyPoints - expectedPoints) / expectedPoints
      
      const isValid = variance <= 0.5 // Allow 50% variance
      return isValid ? { isValid: true } : { isValid: false, message: 'Loyalty points seem high for customer spending level' }
    },
    dependencies: ['totalSpent'],
  }),

  // Inventory form: validate reorder point vs max stock
  reorderLogic: (): ValidationRule<number> => ({
    id: 'reorderLogic',
    message: 'Reorder point cannot exceed maximum stock level',
    validate: (_value, formData) => {
      const reorderPoint = Number(formData?.reorderPoint) || Number(_value) || 0
      const maxStock = Number(formData?.maxStock) || 0
      
      if (maxStock === 0) return { isValid: true } // No max stock set
      
      const isValid = reorderPoint < maxStock
      return isValid ? { isValid: true } : { isValid: false, message: 'Reorder point cannot exceed maximum stock level' }
    },
    dependencies: ['maxStock'],
  }),
}

// Async validator creator with debouncing
export function createAsyncValidator<T = any>(
  validator: (value: T) => Promise<ValidationResult>,
  debounceMs = 300
): (value: T) => Promise<ValidationResult> {
  let timeoutId: NodeJS.Timeout | null = null
  let lastPromise: Promise<ValidationResult> | null = null

  return (value: T): Promise<ValidationResult> => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    lastPromise = new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        const result = await validator(value)
        resolve(result)
        timeoutId = null
      }, debounceMs)
    })

    return lastPromise
  }
}

// Custom hook for form validation
export function useFormValidation(
  initialValues: Record<string, unknown> = {},
  config: FormConfig = {}
) {
  const defaultConfig: FormConfig = {
    validateOnChange: true,
    validateOnBlur: true,
    validateOnSubmit: true,
    debounceMs: 300,
    showWarnings: true,
    showInfo: true,
    autoFocus: true,
    retainFocusOnError: true,
  }

  const finalConfig = { ...defaultConfig, ...config }

  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [rulesByField, setRulesByField] = useState<Record<string, ValidationRule[]>>({})
  const [state, setState] = useState<FormValidationState>(() => ({
    fields: Object.keys(initialValues).reduce((acc, key) => {
      acc[key] = {
        value: initialValues[key],
        errors: [],
        warnings: [],
        info: [],
        isValidating: false,
        hasBeenTouched: false,
        hasBeenFocused: false,
      }
      return acc
    }, {} as Record<string, FieldValidationState>),
    isValid: true,
    isValidating: false,
    hasErrors: false,
    hasWarnings: false,
    globalErrors: [],
    globalWarnings: [],
  }))

  // Get field state
  const getFieldState = useCallback((fieldName: string): FieldValidationState | undefined => {
    return state.fields[fieldName]
  }, [state.fields])

  // Validate field
  const validateField = useCallback(async (fieldName: string, value: unknown, shouldValidate = true) => {
    if (!shouldValidate) return

    const fieldRules = rulesByField[fieldName] || []
    // Mark field validating
    setState(prev => {
      const previousField: FieldValidationState = prev.fields[fieldName] || {
        value: value,
        errors: [],
        warnings: [],
        info: [],
        isValidating: false,
        hasBeenTouched: false,
        hasBeenFocused: false,
      }
      return ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldName]: {
            ...previousField,
            isValidating: true,
            hasBeenTouched: true,
            value,
          }
        }
      })
    })

    const errors: string[] = []
    const warnings: string[] = []
    const info: string[] = []

    // Run sync rules
    for (const rule of fieldRules) {
      try {
        const result = rule.validate(value, values)
        if (!result.isValid) {
          const message = result.message || rule.message
          const severity = rule.severity || 'error'
          if (severity === 'error') errors.push(message)
          else if (severity === 'warning') warnings.push(message)
          else if (severity === 'info') info.push(message)
        }
        if (result.warnings && result.warnings.length) warnings.push(...result.warnings)
        if (result.info && result.info.length) info.push(...result.info)
      } catch (e) {
        errors.push('Validation error occurred')
      }
    }

    // Run async rules
    const asyncRules = fieldRules.filter(r => typeof r.validateAsync === 'function')
    if (asyncRules.length > 0) {
      try {
        const asyncResults = await Promise.all(asyncRules.map(r => r.validateAsync!(value, values)))
        asyncResults.forEach((res, idx) => {
          const rule = asyncRules[idx]
          if (!res.isValid) {
            const message = res.message || rule.message
            const severity = rule.severity || 'error'
            if (severity === 'error') errors.push(message)
            else if (severity === 'warning') warnings.push(message)
            else if (severity === 'info') info.push(message)
          }
          if (res.warnings && res.warnings.length) warnings.push(...res.warnings)
          if (res.info && res.info.length) info.push(...res.info)
        })
      } catch (e) {
        errors.push('Validation error occurred')
      }
    }

    // Update field state with results
    setState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldName]: {
          ...(prev.fields[fieldName] || {
            value,
            errors: [], warnings: [], info: [], isValidating: false, hasBeenTouched: true, hasBeenFocused: false,
          }),
          errors,
          warnings,
          info,
          isValidating: false,
        }
      },
    }))
  }, [rulesByField, values])

  // Set field value (defined after validateField to avoid TDZ issues)
  const setFieldValue = useCallback(async (fieldName: string, value: unknown, validate = true) => {
    setValues(prev => ({
      ...prev,
      [fieldName]: value
    }))

    setState(prev => {
      const previousField: FieldValidationState = prev.fields[fieldName] || {
        value: undefined,
        errors: [],
        warnings: [],
        info: [],
        isValidating: false,
        hasBeenTouched: false,
        hasBeenFocused: false,
      }
      return ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldName]: {
            ...previousField,
            value,
            hasBeenTouched: true,
          },
        },
      })
    })

    if (validate && finalConfig.validateOnChange) {
      await validateField(fieldName, value, true)
    }
  }, [finalConfig.validateOnChange, validateField])

  // Validate form
  const validateForm = useCallback(async (): Promise<boolean> => {
    const fieldNames = Array.from(new Set([...Object.keys(rulesByField), ...Object.keys(state.fields)]))
    await Promise.all(fieldNames.map(async (name) => {
      const value = values[name]
      await validateField(name, value, true)
    }))
    const hasErrors = Object.values(state.fields).some(f => f.errors && f.errors.length > 0)
    setState(prev => ({ ...prev, hasErrors, isValid: !hasErrors }))
    return !hasErrors
  }, [rulesByField, state.fields, validateField, values])

  // Add field rules
  const addFieldRules = useCallback((fieldName: string, rules: ValidationRule[]) => {
    setRulesByField(prev => ({
      ...prev,
      [fieldName]: rules,
    }))
    // Ensure field exists in state map
    setState(prev => {
      if (prev.fields[fieldName]) return prev
      return ({
        ...prev,
        fields: {
          ...prev.fields,
          [fieldName]: {
            value: values[fieldName],
            errors: [], warnings: [], info: [], isValidating: false, hasBeenTouched: false, hasBeenFocused: false,
          }
        }
      })
    })
  }, [values])

  return {
    values,
    state,
    setFieldValue,
    addFieldRules,
    validateField,
    validateForm,
    getFieldState,
    config: finalConfig,
  }
}

// Utility function to combine validation results
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const combined: ValidationResult = {
    isValid: true,
    warnings: [],
    info: []
  }

  for (const result of results) {
    combined.isValid = combined.isValid && result.isValid
    if (result.message && !result.isValid) {
      combined.message = result.message
    }
    if (result.warnings) {
      combined.warnings = [...(combined.warnings || []), ...result.warnings]
    }
    if (result.info) {
      combined.info = [...(combined.info || []), ...result.info]
    }
  }

  return combined
}

export default {
  validationRules,
  crossFieldRules,
  restaurantCrossFieldRules,
  useFormValidation,
  combineValidationResults,
  createAsyncValidator,
}
