/**
 * Enhanced Input Component with Real-time Validation
 * 
 * Features:
 * - Real-time validation feedback
 * - Smart suggestions and error recovery
 * - Auto-formatting for specific input types
 * - Accessibility enhancements
 */

import { useState, useEffect, useRef, forwardRef } from 'react';
import type { ValidationResult } from '../../utils/validation';
import { validateEmail, validatePhone, formatPhone, validateCurrency, validateName, sanitizeInput } from '../../utils/validation';

export interface ValidatedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValidation?: (result: ValidationResult) => void;
  type?: 'text' | 'email' | 'tel' | 'number' | 'currency' | 'sku';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  existingValues?: string[]; // For uniqueness validation
  suggestions?: string[]; // Custom suggestions
  helpText?: string;
  maxLength?: number;
  min?: number;
  max?: number;
}

export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(({
  label,
  value,
  onChange,
  onValidation,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  autoFocus = false,
  className = '',
  existingValues = [],
  suggestions = [],
  helpText,
  maxLength,
  min,
  max,
  ...props
}, ref) => {
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true });
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(value);

  // Validation function based on input type
  const validateValue = (val: string): ValidationResult => {
    if (!val && required) {
      return { isValid: false, message: `${label} is required` };
    }

    if (!val) {
      return { isValid: true };
    }

    switch (type) {
      case 'email':
        return validateEmail(val);
      case 'tel':
        return validatePhone(val);
      case 'currency':
        return validateCurrency(val);
      case 'sku':
        return { isValid: true }; // Will be handled by parent with existing SKUs
      default:
        return validateName(val);
    }
  };

  // Format value based on input type
  const formatValue = (val: string): string => {
    switch (type) {
      case 'tel':
        return formatPhone(val);
      case 'sku':
        return val.toUpperCase();
      default:
        return sanitizeInput(val);
    }
  };

  // Real-time validation
  useEffect(() => {
    const result = validateValue(internalValue);
    setValidation(result);
    onValidation?.(result);
  }, [internalValue, type, required, label, onValidation]);

  // Handle input change with formatting
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Apply length constraints
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength);
    }

    // Format value based on type
    const formattedValue = formatValue(newValue);
    
    setInternalValue(formattedValue);
    onChange(formattedValue);
  };

  // Handle focus events
  const handleFocus = () => {
    setIsFocused(true);
    if (suggestions.length > 0 || validation.suggestions?.length) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTimeout(() => setShowSuggestions(false), 200); // Delay to allow suggestion clicks
  };

  // Apply suggestion
  const applySuggestion = (suggestion: string) => {
    setInternalValue(suggestion);
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Generate input props based on type
  const getInputProps = () => {
    const baseProps = {
      value: internalValue,
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      placeholder,
      disabled,
      autoFocus,
      required,
      'aria-describedby': `${label}-help ${label}-error`,
      'aria-invalid': !validation.isValid,
    };

    switch (type) {
      case 'email':
        return { ...baseProps, type: 'email', autoComplete: 'email' };
      case 'tel':
        return { ...baseProps, type: 'tel', autoComplete: 'tel' };
      case 'number':
      case 'currency':
        return { 
          ...baseProps, 
          type: 'number', 
          step: type === 'currency' ? '0.01' : '1',
          min,
          max
        };
      default:
        return { ...baseProps, type: 'text' };
    }
  };

  // Determine styling based on validation state
  const getInputStyling = () => {
    const baseStyles = 'w-full px-3 py-2 border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white';
    
    if (!validation.isValid) {
      return `${baseStyles} border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200`;
    }
    
    if (validation.suggestions?.length && isFocused) {
      return `${baseStyles} border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20`;
    }
    
    if (validation.isValid && internalValue) {
      return `${baseStyles} border-green-500 bg-green-50 dark:bg-green-900/20`;
    }
    
    return `${baseStyles} border-gray-300 dark:border-gray-600`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Input Field */}
      <input
        ref={ref || inputRef}
        className={getInputStyling()}
        {...getInputProps()}
        {...props}
      />

      {/* Help Text */}
      {helpText && (
        <p id={`${label}-help`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}

      {/* Validation Message */}
      {(!validation.isValid || validation.message) && (
        <div id={`${label}-error`} className="mt-1">
          <p className={`text-sm flex items-center ${
            validation.isValid ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {!validation.isValid && (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {validation.isValid && validation.message && (
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {validation.message}
          </p>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (validation.suggestions?.length || suggestions.length) && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
          <div className="py-1">
            <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              Suggestions
            </div>
            {(validation.suggestions || []).map((suggestion, index) => (
              <button
                key={index}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                onClick={() => applySuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
            {suggestions.map((suggestion, index) => (
              <button
                key={`custom-${index}`}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                onClick={() => applySuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Validation Success Indicator */}
      {validation.isValid && internalValue && !isFocused && (
        <div className="absolute right-3 top-8 text-green-500">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
});

ValidatedInput.displayName = 'ValidatedInput';
