/**
 * ValidatedInput Component
 * Enhanced input component with real-time validation, accessibility, and UX improvements
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '../../lib/utils'
import type { ValidationRule, ValidationResult } from './validation'

export interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onBlur'> {
  name: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  validationRules?: ValidationRule<string>[]
  showValidationIcon?: boolean
  helpText?: string
  required?: boolean
  error?: string
  warning?: string
  info?: string
  loading?: boolean
  autoFocus?: boolean
  retainFocusOnError?: boolean
  debounceMs?: number
  inputMask?: (value: string) => string
  formatValue?: (value: string) => string
  placeholder?: string
  className?: string
  containerClassName?: string
  labelClassName?: string
  errorClassName?: string
  warningClassName?: string
  infoClassName?: string
  'aria-describedby'?: string
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  validationRules = [],
  showValidationIcon = true,
  helpText,
  required = false,
  error: externalError,
  warning: externalWarning,
  info: externalInfo,
  loading = false,
  autoFocus = false,
  retainFocusOnError = true,
  debounceMs = 300,
  inputMask,
  formatValue,
  placeholder,
  className,
  containerClassName,
  labelClassName,
  errorClassName,
  warningClassName,
  infoClassName,
  disabled,
  ...inputProps
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [internalValue, setInternalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const [hasBeenTouched, setHasBeenTouched] = useState(false)
  const [validationState, setValidationState] = useState({
    errors: [] as string[],
    warnings: [] as string[],
    info: [] as string[],
    isValidating: false,
  })

  // Debounced validation (sync + async)
  useEffect(() => {
    if (!hasBeenTouched && !isFocused) return

    const timeoutId = setTimeout(async () => {
      if (validationRules.length === 0) return

      setValidationState(prev => ({ ...prev, isValidating: true }))

      const errors: string[] = []
      const warnings: string[] = []
      const info: string[] = []

      // Run sync validations first
      for (const rule of validationRules) {
        try {
          const result: ValidationResult = rule.validate(internalValue)
          if (!result.isValid) {
            const message = result.message || rule.message
            const severity = rule.severity || 'error'
            if (severity === 'error') errors.push(message)
            else if (severity === 'warning') warnings.push(message)
            else if (severity === 'info') info.push(message)
          }
          if (result.warnings && result.warnings.length) {
            warnings.push(...result.warnings)
          }
          if (result.info && result.info.length) {
            info.push(...result.info)
          }
        } catch (error) {
          console.error(`Validation rule ${rule.id} failed:`, error)
          errors.push('Validation error occurred')
        }
      }

      // Run async validations in parallel
      const asyncRules = validationRules.filter(r => typeof r.validateAsync === 'function')
      if (asyncRules.length > 0) {
        try {
          const asyncResults = await Promise.all(asyncRules.map(r => r.validateAsync!(internalValue)))
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
        } catch (error) {
          console.error('Async validation failed:', error)
          errors.push('Validation error occurred')
        }
      }

      setValidationState({
        errors,
        warnings,
        info,
        isValidating: false,
      })
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [internalValue, validationRules, debounceMs, hasBeenTouched, isFocused])

  // Auto focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Retain focus on error if requested
  useEffect(() => {
    if (retainFocusOnError && (validationState.errors.length > 0 || externalError) && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus()
    }
  }, [validationState.errors, externalError, retainFocusOnError])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value

    // Apply input mask if provided
    if (inputMask) {
      newValue = inputMask(newValue)
    }

    setInternalValue(newValue)
    setHasBeenTouched(true)

    // Format value for external use if formatter provided
    const formattedValue = formatValue ? formatValue(newValue) : newValue
    onChange(formattedValue)
  }, [inputMask, formatValue, onChange])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    setHasBeenTouched(true)
    onBlur?.()
  }, [onBlur])

  // Determine final validation state (external props override internal validation)
  const finalErrors = externalError ? [externalError] : validationState.errors
  const finalWarnings = externalWarning ? [externalWarning] : validationState.warnings
  const finalInfo = externalInfo ? [externalInfo] : validationState.info

  const hasError = finalErrors.length > 0
  const hasWarning = finalWarnings.length > 0
  const hasInfo = finalInfo.length > 0
  const isValidating = validationState.isValidating || loading

  // Generate IDs for accessibility
  const inputId = `input-${name}`
  const errorId = `${inputId}-error`
  const warningId = `${inputId}-warning`
  const infoId = `${inputId}-info`
  const helpId = `${inputId}-help`

  // Build aria-describedby
  const ariaDescribedBy = [
    helpText ? helpId : null,
    hasError ? errorId : null,
    hasWarning ? warningId : null,
    hasInfo ? infoId : null,
    inputProps['aria-describedby'],
  ].filter(Boolean).join(' ') || undefined

  // Validation icon
  const ValidationIcon = () => {
    if (!showValidationIcon || !hasBeenTouched) return null

    if (isValidating) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-brand-600 border-t-transparent rounded-full" />
        </div>
      )
    }

    if (hasError) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-error" aria-hidden="true">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }

    if (hasWarning) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-warning" aria-hidden="true">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }

    if (finalErrors.length === 0 && internalValue && hasBeenTouched) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-success" aria-hidden="true">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }

    return null
  }

  return (
    <div className={cn('space-y-1', containerClassName)}>
      {/* Label */}
      <label 
        htmlFor={inputId}
        className={cn(
          'block text-sm font-medium',
          hasError ? 'text-error' : hasWarning ? 'text-warning' : 'text-text-secondary',
          labelClassName
        )}
      >
        {label}
        {required && (
          <span className="text-error-600 ml-1" aria-label="required">*</span>
        )}
      </label>

      {/* Input Container */}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled || isValidating}
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          aria-required={required}
          className={cn(
            'block w-full rounded-md border-0 py-1.5 text-text-primary shadow-sm ring-1 ring-inset placeholder:text-text-tertiary focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6',
            hasError
              ? 'ring-error/30 focus:ring-error'
              : hasWarning
              ? 'ring-warning/30 focus:ring-warning'
              : 'ring-border focus:ring-brand',
            showValidationIcon && hasBeenTouched ? 'pr-10' : 'pr-3',
            disabled ? 'bg-surface-secondary text-text-secondary cursor-not-allowed' : 'bg-surface',
            className
          )}
          {...inputProps}
        />
        <ValidationIcon />
      </div>

      {/* Help Text */}
      {helpText && (
        <p id={helpId} className="text-sm text-text-secondary">
          {helpText}
        </p>
      )}

      {/* Error Messages */}
      {hasError && (
        <div id={errorId} className="space-y-1" role="alert" aria-live="polite">
          {finalErrors.map((error, index) => (
            <p key={index} className={cn('text-sm text-error', errorClassName)}>
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Warning Messages */}
      {hasWarning && !hasError && (
        <div id={warningId} className="space-y-1" role="alert" aria-live="polite">
          {finalWarnings.map((warning, index) => (
            <p key={index} className={cn('text-sm text-warning', warningClassName)}>
              {warning}
            </p>
          ))}
        </div>
      )}

      {/* Info Messages */}
      {hasInfo && !hasError && !hasWarning && (
        <div id={infoId} className="space-y-1">
          {finalInfo.map((info, index) => (
            <p key={index} className={cn('text-sm text-brand', infoClassName)}>
              {info}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default ValidatedInput

