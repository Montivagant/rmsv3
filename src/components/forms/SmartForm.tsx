/**
 * Smart Form Component with Enhanced UX
 * 
 * Features:
 * - Automatic form state management
 * - Real-time validation
 * - Loading states and progress indicators
 * - Auto-save and draft functionality
 * - Keyboard navigation and accessibility
 * - Error recovery suggestions
 */

import { useState, useEffect, useRef, ReactNode } from 'react';
import { ValidationResult, FormValidator } from '../../utils/validation';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'currency' | 'sku' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  validation?: (value: any, allValues: Record<string, any>) => ValidationResult;
  dependencies?: string[]; // Fields that affect this field's visibility/validation
  visible?: (allValues: Record<string, any>) => boolean;
}

export interface SmartFormProps {
  fields: FormField[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  title?: string;
  description?: string;
  autoSave?: boolean;
  autoSaveKey?: string;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
}

export function SmartForm({
  fields,
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  title,
  description,
  autoSave = false,
  autoSaveKey,
  className = '',
  children,
  disabled = false
}: SmartFormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBeenModified, setHasBeenModified] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  
  const formRef = useRef<HTMLFormElement>(null);
  const validatorRef = useRef(new FormValidator());
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize visible fields
  useEffect(() => {
    const visible = new Set<string>();
    fields.forEach(field => {
      if (!field.visible || field.visible(values)) {
        visible.add(field.name);
      }
    });
    setVisibleFields(visible);
  }, [fields, values]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !autoSaveKey || !hasBeenModified) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`form-draft-${autoSaveKey}`, JSON.stringify(values));
        console.log('💾 Form auto-saved');
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [values, hasBeenModified, autoSave, autoSaveKey]);

  // Load draft on mount
  useEffect(() => {
    if (autoSave && autoSaveKey) {
      try {
        const draft = localStorage.getItem(`form-draft-${autoSaveKey}`);
        if (draft) {
          const draftValues = JSON.parse(draft);
          setValues({ ...initialValues, ...draftValues });
          setHasBeenModified(true);
        }
      } catch (error) {
        console.warn('Failed to load draft:', error);
      }
    }
  }, [autoSave, autoSaveKey, initialValues]);

  // Set up validation rules
  useEffect(() => {
    const validator = validatorRef.current;
    
    // Clear existing rules
    validator['rules'].clear();

    fields.forEach(field => {
      if (field.validation) {
        validator.addRule(field.name, {
          validator: (value) => field.validation!(value, values),
          message: `${field.label} is invalid`,
          level: 'error'
        });
      }
    });
  }, [fields, values]);

  // Handle field value change
  const handleFieldChange = (fieldName: string, value: any) => {
    const newValues = { ...values, [fieldName]: value };
    setValues(newValues);
    setHasBeenModified(true);

    // Validate the specific field
    const field = fields.find(f => f.name === fieldName);
    if (field?.validation) {
      const result = field.validation(value, newValues);
      setValidationResults(prev => ({
        ...prev,
        [fieldName]: result
      }));
    }

    // Re-validate dependent fields
    fields.forEach(otherField => {
      if (otherField.dependencies?.includes(fieldName) && otherField.validation) {
        const result = otherField.validation(newValues[otherField.name], newValues);
        setValidationResults(prev => ({
          ...prev,
          [otherField.name]: result
        }));
      }
    });
  };

  // Validate all fields
  const validateAll = (): boolean => {
    const results: Record<string, ValidationResult> = {};
    let isValid = true;

    visibleFields.forEach(fieldName => {
      const field = fields.find(f => f.name === fieldName);
      if (field?.validation) {
        const result = field.validation(values[fieldName], values);
        results[fieldName] = result;
        if (!result.isValid) {
          isValid = false;
        }
      }
    });

    setValidationResults(results);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validateAll()) {
      // Focus first invalid field
      const firstInvalidField = fields.find(field => 
        visibleFields.has(field.name) && !validationResults[field.name]?.isValid
      );
      
      if (firstInvalidField) {
        const element = formRef.current?.querySelector(`[name="${firstInvalidField.name}"]`) as HTMLElement;
        element?.focus();
      }
      
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit(values);
      
      // Clear draft on successful submission
      if (autoSave && autoSaveKey) {
        localStorage.removeItem(`form-draft-${autoSaveKey}`);
      }
      
      setHasBeenModified(false);
    } catch (error) {
      console.error('Form submission failed:', error);
      // The parent component should handle the error display
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (hasBeenModified) {
      const shouldDiscard = window.confirm('Are you sure you want to discard your changes?');
      if (!shouldDiscard) return;
    }
    
    // Clear draft
    if (autoSave && autoSaveKey) {
      localStorage.removeItem(`form-draft-${autoSaveKey}`);
    }
    
    onCancel?.();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            if (validateAll()) {
              handleSubmit(e as any);
            }
            break;
          case 'Enter':
            if (e.shiftKey) {
              e.preventDefault();
              if (validateAll()) {
                handleSubmit(e as any);
              }
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [values]);

  // Render field based on type
  const renderField = (field: FormField) => {
    const isVisible = visibleFields.has(field.name);
    if (!isVisible) return null;

    const value = values[field.name] || '';
    const validation = validationResults[field.name];
    const hasError = submitAttempted && validation && !validation.isValid;

    const commonProps = {
      name: field.name,
      id: field.name,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
        handleFieldChange(field.name, e.target.value),
      required: field.required,
      placeholder: field.placeholder,
      disabled: disabled || isSubmitting,
      'aria-describedby': field.helpText ? `${field.name}-help` : undefined,
      'aria-invalid': hasError,
      className: `w-full px-3 py-2 border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
        hasError 
          ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
          : 'border-gray-300 dark:border-gray-600'
      }`
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
          />
        );
      
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      default:
        return (
          <input
            {...commonProps}
            type={field.type}
          />
        );
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Form Header */}
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Auto-save indicator */}
      {autoSave && hasBeenModified && (
        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400 mb-4">
          <svg className="w-4 h-4 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          Draft auto-saved
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map(field => (
          <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
            {/* Field Label */}
            <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Field Input */}
            {renderField(field)}

            {/* Help Text */}
            {field.helpText && (
              <p id={`${field.name}-help`} className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {field.helpText}
              </p>
            )}

            {/* Validation Message */}
            {submitAttempted && validationResults[field.name] && !validationResults[field.name].isValid && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationResults[field.name].message}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Custom Children */}
      {children}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelLabel}
          </button>
        )}
        
        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {isSubmitting && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isSubmitting ? 'Submitting...' : submitLabel}
        </button>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        💡 Shortcuts: Ctrl+S to submit, Ctrl+Shift+Enter for quick submit
      </div>
    </form>
  );
}
