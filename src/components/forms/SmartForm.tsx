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

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useFormValidation, type ValidationRule } from './validation';
import { ValidatedInput } from './ValidatedInput';
import { inputMasks, valueFormatters } from './businessRules';
import { FORM_LABELS, MESSAGES, FORM_PLACEHOLDERS } from '../../constants/ui-text';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'currency' | 'sku' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  validationRules?: ValidationRule[];
  inputMask?: keyof typeof inputMasks;
  formatter?: keyof typeof valueFormatters;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBeenModified, setHasBeenModified] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  
  const formRef = useRef<HTMLFormElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Use the new validation framework
  const {
    values,
    setFieldValue,
    validateField,
    validateForm,
    getFieldState,
    addFieldRules
  } = useFormValidation(initialValues, {
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 300,
    showWarnings: true,
    showInfo: true,
  });

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
          // Set individual field values using the validation hook
          Object.entries(draftValues).forEach(([fieldName, value]) => {
            setFieldValue(fieldName, value, false); // Don't validate on restore
          });
          setHasBeenModified(true);
        }
      } catch (error) {
        console.warn('Failed to load draft:', error);
      }
    }
  }, [autoSave, autoSaveKey, initialValues]);

  // Register validation rules centrally so submit/blur validations work consistently
  useEffect(() => {
    fields.forEach(field => {
      if (field.validationRules && field.validationRules.length > 0) {
        addFieldRules(field.name, field.validationRules)
      }
    })
  }, [fields, addFieldRules])

  // Handle field value change
  const handleFieldChange = (fieldName: string, value: any) => {
    const field = fields.find(f => f.name === fieldName);
    
    // Apply formatter if specified
    let formattedValue = value;
    if (field?.formatter && valueFormatters[field.formatter]) {
      formattedValue = valueFormatters[field.formatter](value);
    }

    setFieldValue(fieldName, formattedValue);
    setHasBeenModified(true);

    // Validate dependent fields
    fields.forEach(otherField => {
      if (otherField.dependencies?.includes(fieldName)) {
        validateField(otherField.name, values[otherField.name], true);
      }
    });
  };

  // Validate all fields
  const validateAll = async (): Promise<boolean> => {
    const result = await validateForm();
    return result;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    const validationResult = await validateAll();
    if (!validationResult) {
      // Focus first invalid field
      const firstInvalidField = fields.find(field => {
        const fieldState = getFieldState(field.name);
        return visibleFields.has(field.name) && fieldState?.errors && fieldState.errors.length > 0;
      });
      
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
      const shouldDiscard = window.confirm(MESSAGES.DISCARD_CHANGES);
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
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            const validationResult = await validateAll();
            if (validationResult) {
              handleSubmit(e as any);
            }
            break;
          case 'Enter':
            if (e.shiftKey) {
              e.preventDefault();
              const validationResult = await validateAll();
              if (validationResult) {
                handleSubmit(e as any);
              }
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render field based on type
  const renderField = (field: FormField) => {
    const isVisible = visibleFields.has(field.name);
    if (!isVisible) return null;

    const fieldValue = String(values[field.name] || '');
    const fieldState = getFieldState(field.name);
    const hasError = submitAttempted && fieldState?.errors && fieldState.errors.length > 0;
    const hasWarning = fieldState?.warnings && fieldState.warnings.length > 0;

    // For ValidatedInput components (text, email, tel, number, currency, sku)
    if (['text', 'email', 'tel', 'number', 'currency', 'sku'].includes(field.type)) {
      return (
        <ValidatedInput
          name={field.name}
          label={field.label}
          type={field.type === 'currency' || field.type === 'sku' ? 'text' : field.type}
          value={fieldValue as string}
          onChange={(value) => handleFieldChange(field.name, value)}
          validationRules={field.validationRules || []}
          required={field.required}
          placeholder={field.placeholder}
          helpText={field.helpText}
          disabled={disabled || isSubmitting}
          inputMask={field.inputMask ? inputMasks[field.inputMask] : undefined}
          formatValue={field.formatter ? valueFormatters[field.formatter] : undefined}
          error={hasError ? fieldState?.errors?.[0] : undefined}
          warning={hasWarning ? fieldState?.warnings?.[0] : undefined}
          retainFocusOnError={true}
          showValidationIcon={true}
        />
      );
    }

    // For other input types, use standard HTML elements with validation styling
    const commonProps = {
      name: field.name,
      id: field.name,
      value: fieldValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
        handleFieldChange(field.name, e.target.value),
      required: field.required,
      placeholder: field.placeholder,
      disabled: disabled || isSubmitting,
      'aria-describedby': field.helpText ? `${field.name}-help` : undefined,
      'aria-invalid': hasError,
      className: `w-full px-3 py-2 border rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-foreground ${
        hasError 
          ? 'border-error bg-error-50' 
          : hasWarning
          ? 'border-warning bg-warning-50'
          : 'border-border'
      }`
    };

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            value={fieldValue as string}
          />
        );
      
      case 'select':
        return (
          <select {...commonProps} value={fieldValue as string}>
            <option value="">{FORM_PLACEHOLDERS.SELECT_ITEM?.replace('an item', field.label.toLowerCase()) || `Select ${field.label}`}</option>
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
            value={fieldValue as string}
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
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Auto-save indicator */}
      {autoSave && hasBeenModified && (
        <div className="flex items-center text-sm text-primary mb-4">
          <svg className="w-4 h-4 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          {MESSAGES.DRAFT_AUTO_SAVED}
        </div>
      )}

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map(field => (
          <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
            {/* Field Label */}
            <label htmlFor={field.name} className="field-label">
              {field.label}
              {field.required && <span className="text-error ml-1">*</span>}
            </label>

            {/* Field Input */}
            {renderField(field)}

            {/* Help Text */}
            {field.helpText && (
              <p id={`${field.name}-help`} className="mt-1 text-sm text-muted-foreground">
                {field.helpText}
              </p>
            )}

            {/* Validation Message */}
            {submitAttempted && (() => {
              const fieldState = getFieldState(field.name);
              const hasFieldError = fieldState?.errors && fieldState.errors.length > 0;
              const hasFieldWarning = fieldState?.warnings && fieldState.warnings.length > 0;
              
              if (hasFieldError) {
                return (
                  <p className="mt-1 text-sm text-error flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldState.errors[0]}
                  </p>
                );
              }
              
              if (hasFieldWarning) {
                return (
                  <p className="mt-1 text-sm text-warning flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {fieldState.warnings[0]}
                  </p>
                );
              }
              
              return null;
            })()}
          </div>
        ))}
      </div>

      {/* Custom Children */}
      {children}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-border">
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-foreground bg-surface border border-border rounded-md hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelLabel}
          </button>
        )}
        
        <button
          type="submit"
          disabled={isSubmitting || disabled}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {isSubmitting && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-inverse" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isSubmitting ? FORM_LABELS.SUBMITTING : submitLabel}
        </button>
      </div>

      {/* Keyboard shortcuts help */}
      <div className="text-xs text-muted-foreground mt-2">
        {MESSAGES.KEYBOARD_SHORTCUTS}
      </div>
    </form>
  );
}
