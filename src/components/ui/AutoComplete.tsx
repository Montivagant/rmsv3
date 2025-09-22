/**
 * Auto-Complete Components
 * Smart input components with fuzzy search, keyboard navigation, and caching
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '../../lib/utils'

// Fuzzy search utility
function fuzzySearch(query: string, text: string): number {
  const queryLower = query.toLowerCase()
  const textLower = text.toLowerCase()
  
  if (textLower.includes(queryLower)) {
    return textLower.indexOf(queryLower) === 0 ? 100 : 80 // Exact match gets higher score
  }
  
  // Character-by-character fuzzy matching
  let queryIndex = 0
  let textIndex = 0
  let matches = 0
  
  while (queryIndex < queryLower.length && textIndex < textLower.length) {
    if (queryLower[queryIndex] === textLower[textIndex]) {
      matches++
      queryIndex++
    }
    textIndex++
  }
  
  return queryIndex === queryLower.length ? (matches / queryLower.length) * 60 : 0
}

// Generic auto-complete option interface
export interface AutoCompleteOption {
  id: string
  label: string
  value: string
  description?: string | undefined
  category?: string | undefined
  metadata?: Record<string, any>
}

// Auto-complete hook for data fetching and caching
export interface AutoCompleteConfig {
  minSearchLength?: number
  debounceMs?: number
  maxResults?: number
  cacheResults?: boolean
  enableFuzzySearch?: boolean
}

export function useAutoComplete<T extends AutoCompleteOption>(
  searchFn: (query: string) => Promise<T[]>,
  config: AutoCompleteConfig = {}
) {
  const {
    minSearchLength = 2,
    debounceMs = 300,
    maxResults = 10,
    cacheResults = true,
    enableFuzzySearch = true
  } = config

  const [options, setOptions] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  
  const cache = useRef<Map<string, T[]>>(new Map())
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minSearchLength) {
      setOptions([])
      return
    }

    // Check cache first
    if (cacheResults && cache.current.has(searchQuery)) {
      const cachedResults = cache.current.get(searchQuery)!
      setOptions(cachedResults.slice(0, maxResults))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let results = await searchFn(searchQuery)
      
      // Apply fuzzy search if enabled
      if (enableFuzzySearch) {
        results = results
          .map(option => ({
            ...option,
            score: fuzzySearch(searchQuery, option.label)
          }))
          .filter(option => option.score > 0)
          .sort((a, b) => (b as any).score - (a as any).score)
          .slice(0, maxResults) as T[]
      } else {
        results = results.slice(0, maxResults)
      }

      // Cache results
      if (cacheResults) {
        cache.current.set(searchQuery, results)
        
        // Limit cache size
        if (cache.current.size > 100) {
          const firstKey = cache.current.keys().next().value
          if (firstKey !== undefined) {
            cache.current.delete(firstKey)
          }
        }
      }

      setOptions(results)
    } catch (err) {
      console.error('Auto-complete search failed:', err)
      setError(err instanceof Error ? err.message : 'Search failed')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [searchFn, minSearchLength, maxResults, cacheResults, enableFuzzySearch])

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      search(query)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [query, search, debounceMs])

  const clearCache = useCallback(() => {
    cache.current.clear()
  }, [])

  return {
    options,
    isLoading,
    error,
    query,
    setQuery,
    search,
    clearCache
  }
}

// Generic Auto-Complete Input Component
export interface AutoCompleteInputProps<T extends AutoCompleteOption> {
  name: string
  label: string
  value: string
  onChange: (value: string, option?: T) => void
  onBlur?: () => void
  searchFn: (query: string) => Promise<T[]>
  placeholder?: string
  helpText?: string
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
  config?: AutoCompleteConfig
  renderOption?: (option: T, isHighlighted: boolean) => React.ReactNode
  renderValue?: (value: string) => React.ReactNode
  allowCustomValue?: boolean
  emptyMessage?: string
}

export function AutoCompleteInput<T extends AutoCompleteOption>({
  name,
  label,
  value,
  onChange,
  onBlur,
  searchFn,
  placeholder,
  helpText,
  required = false,
  disabled = false,
  error,
  className,
  config = {},
  renderOption,
  // renderValue, // Unused for now
  allowCustomValue = true,
  emptyMessage = 'No results found'
}: AutoCompleteInputProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [inputValue, setInputValue] = useState(value)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const {
    options,
    isLoading,
    error: searchError,
    setQuery
  } = useAutoComplete(searchFn, config)

  // Update input value when prop value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setQuery(newValue)
    setIsOpen(true)
    setHighlightedIndex(-1)
    
    if (allowCustomValue) {
      onChange(newValue)
    }
  }

  // Handle option selection
  const handleOptionSelect = (option: T) => {
    setInputValue(option.label)
    onChange(option.value, option)
    setIsOpen(false)
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < options.length - 1 ? prev + 1 : 0
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : options.length - 1
        )
        break
      
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && options[highlightedIndex]) {
          handleOptionSelect(options[highlightedIndex])
        } else if (!allowCustomValue) {
          // Prevent form submission if custom values not allowed
          return
        }
        break
      
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
      
      case 'Tab':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Default option renderer
  const defaultRenderOption = (option: T, isHighlighted: boolean) => (
    <div className={cn(
      'px-3 py-2 cursor-pointer flex items-center justify-between',
      isHighlighted ? 'bg-surface-secondary' : 'hover:bg-surface-secondary'
    )}>
      <div className="flex-1">
        <div className="font-medium text-primary">
          {option.label}
        </div>
        {option.description && (
          <div className="text-sm text-tertiary">
            {option.description}
          </div>
        )}
      </div>
      {option.category && (
        <span className="text-xs bg-surface-tertiary text-secondary px-2 py-1 rounded">
          {option.category}
        </span>
      )}
    </div>
  )

  const displayError = error || searchError

  return (
    <div className={cn('relative', className)}>
      {/* Label */}
      <label id={`${name}-label`} htmlFor={name} className="field-label">
        {label}
        {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
      </label>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          id={name}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay blur to allow option clicks
            setTimeout(() => {
              setIsOpen(false)
              setHighlightedIndex(-1)
              onBlur?.()
            }, 150)
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            'input-base pr-10',
            displayError && 'input-error',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-secondary'
          )}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={isOpen ? `${name}-listbox` : undefined}
          aria-activedescendant={isOpen && highlightedIndex >= 0 ? `${name}-option-${highlightedIndex}` : undefined}
          aria-invalid={!!displayError}
          aria-describedby={helpText ? `${name}-help` : undefined}
          aria-labelledby={`${name}-label`}
          aria-label={label}
        />

        {/* Loading/Arrow Icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-brand border-t-transparent rounded-full" />
          ) : (
            <svg className="h-4 w-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id={`${name}-listbox`}
          className="absolute z-50 w-full mt-1 bg-surface border border-primary rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {options.length > 0 ? (
            options.map((option, index) => (
              <div
                key={option.id}
                id={`${name}-option-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onClick={() => handleOptionSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {renderOption ? renderOption(option, index === highlightedIndex) : defaultRenderOption(option, index === highlightedIndex)}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-tertiary text-center">
              {isLoading ? 'Searching...' : emptyMessage}
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {helpText && (
        <p id={`${name}-help`} className="field-help">
          {helpText}
        </p>
      )}

      {/* Error Message */}
      {displayError && (
        <p className="field-error">
          {displayError}
        </p>
      )}
    </div>
  )
}

// Customer Auto-Complete Component
export interface Customer {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  loyaltyPoints?: number
}

export interface CustomerAutoCompleteProps {
  name: string
  label?: string
  value: string
  onChange: (value: string, customer?: Customer) => void
  onBlur?: () => void
  searchCustomers: (query: string) => Promise<Customer[]>
  placeholder?: string
  helpText?: string
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
}

export const CustomerAutoComplete: React.FC<CustomerAutoCompleteProps> = ({
  searchCustomers,
  label = 'Customer',
  placeholder = 'Search customers...',
  helpText = 'Start typing to search for existing customers',
  onChange,
  ...props
}) => {
  const searchFn = useCallback(async (query: string): Promise<AutoCompleteOption[]> => {
    const customers = await searchCustomers(query)
    return customers.map(customer => ({
      id: customer.id,
      label: `${customer.firstName} ${customer.lastName}`,
      value: customer.id,
      description: customer.email || undefined,
      category: customer.loyaltyPoints ? `${customer.loyaltyPoints} points` : undefined,
      metadata: customer
    }))
  }, [searchCustomers])

  const handleChange = (value: string, option?: AutoCompleteOption) => {
    onChange(value, option?.metadata as Customer)
  }

  return (
    <AutoCompleteInput
      {...props}
      label={label}
      placeholder={placeholder}
      helpText={helpText}
      searchFn={searchFn}
      onChange={handleChange}
      allowCustomValue={false}
      emptyMessage="No customers found"
    />
  )
}

// SKU Auto-Complete Component
export interface Product {
  id: string
  sku: string
  name: string
  price: number
  category: string
  inStock?: boolean
  quantity?: number
}

export interface SKUAutoCompleteProps {
  name: string
  label?: string
  value: string
  onChange: (value: string, product?: Product) => void
  onBlur?: () => void
  searchProducts: (query: string) => Promise<Product[]>
  placeholder?: string
  helpText?: string
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
}

export const SKUAutoComplete: React.FC<SKUAutoCompleteProps> = ({
  searchProducts,
  label = 'Product SKU',
  placeholder = 'Search products...',
  helpText = 'Start typing to search for products by name or code',
  onChange,
  ...props
}) => {
  const searchFn = useCallback(async (query: string): Promise<AutoCompleteOption[]> => {
    const products = await searchProducts(query)
    return products.map(product => ({
      id: product.id,
      label: `${product.sku} - ${product.name}`,
      value: product.sku,
      description: `$${product.price.toFixed(2)}`,
      category: product.category,
      metadata: product
    }))
  }, [searchProducts])

  const handleChange = (value: string, option?: AutoCompleteOption) => {
    onChange(value, option?.metadata as Product)
  }

  const renderOption = (option: AutoCompleteOption, isHighlighted: boolean) => (
    <div className={cn(
      'px-3 py-2 cursor-pointer',
      isHighlighted ? 'bg-brand-50' : 'hover:bg-surface-secondary'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-text-primary">
            {option.metadata?.sku} - {option.metadata?.name}
          </div>
          <div className="text-sm text-text-muted">
            ${option.metadata?.price?.toFixed(2)}
            {option.metadata?.quantity !== undefined && (
              <span className="ml-2">
                Stock: {option.metadata.quantity}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs bg-surface-secondary text-text-secondary px-2 py-1 rounded">
            {option.category}
          </span>
          {option.metadata?.inStock === false && (
            <span className="text-xs text-error-600 mt-1">Out of Stock</span>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <AutoCompleteInput
      {...props}
      label={label}
      placeholder={placeholder}
      helpText={helpText}
      searchFn={searchFn}
      onChange={handleChange}
      renderOption={renderOption}
      allowCustomValue={true}
      emptyMessage="No products found"
    />
  )
}

// Category Auto-Complete Component
export interface Category {
  id: string
  name: string
  description?: string
  itemCount?: number
}

export interface CategoryAutoCompleteProps {
  name: string
  label?: string
  value: string
  onChange: (value: string, category?: Category) => void
  onBlur?: () => void
  searchCategories: (query: string) => Promise<Category[]>
  placeholder?: string
  helpText?: string
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
}

export const CategoryAutoComplete: React.FC<CategoryAutoCompleteProps> = ({
  searchCategories,
  label = 'Category',
  placeholder = 'Search categories...',
  helpText = 'Start typing to search for product categories',
  onChange,
  ...props
}) => {
  const searchFn = useCallback(async (query: string): Promise<AutoCompleteOption[]> => {
    const categories = await searchCategories(query)
    return categories.map(category => ({
      id: category.id,
      label: category.name,
      value: category.id,
      description: category.description || undefined,
      category: category.itemCount ? `${category.itemCount} items` : undefined,
      metadata: category
    }))
  }, [searchCategories])

  const handleChange = (value: string, option?: AutoCompleteOption) => {
    onChange(value, option?.metadata as Category)
  }

  return (
    <AutoCompleteInput
      {...props}
      label={label}
      placeholder={placeholder}
      helpText={helpText}
      searchFn={searchFn}
      onChange={handleChange}
      allowCustomValue={false}
      emptyMessage="No categories found"
    />
  )
}

export default {
  AutoCompleteInput,
  CustomerAutoComplete,
  SKUAutoComplete,
  CategoryAutoComplete,
  useAutoComplete,
  fuzzySearch
}

