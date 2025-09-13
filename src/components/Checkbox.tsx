import { forwardRef, useEffect, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ 
    className, 
    label, 
    description, 
    error, 
    indeterminate = false,
    id, 
    disabled,
    required,
    ...props 
  }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).slice(2, 11)}`;
    const labelId = `${checkboxId}-label`;
    const descriptionId = description ? `${checkboxId}-description` : undefined;
    const errorId = error ? `${checkboxId}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
    
    const internalRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = Boolean(indeterminate);
      }
    }, [indeterminate]);

    return (
      <div className="space-y-field">
        <div className="flex items-start space-x-3">
          <div className="relative flex items-center">
            <input
              id={checkboxId}
              type="checkbox"
              className={cn(
                // Base styles
                'peer h-6 w-6 rounded border-2 border-border-primary',
                'bg-surface text-brand focus:ring-2 focus:ring-brand focus:ring-offset-2',
                'transition-colors duration-200',
                // States
                'checked:bg-brand checked:border-brand',
                'indeterminate:bg-brand indeterminate:border-brand',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error && 'border-error focus:ring-error',
                className
              )}
              ref={(node) => {
                internalRef.current = node;
                if (typeof ref === 'function') ref(node as HTMLInputElement);
                else if (ref) (ref as any).current = node;
              }}
              disabled={disabled}
              required={required}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={describedBy}
              aria-labelledby={label ? labelId : undefined}
              aria-label={label}
              {...props}
            />
            
            {/* Custom checkmark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {indeterminate ? (
                <svg
                  className="w-3 h-3 text-text-inverse"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <rect x="4" y="9" width="12" height="2" rx="1" />
                </svg>
              ) : (
                <svg
                  className="w-3 h-3 text-text-inverse opacity-0 peer-checked:opacity-100 transition-opacity"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
          
          {(label || description) && (
            <div className="flex-1 min-w-0">
              {label && (
                <label
                  id={labelId}
                  htmlFor={checkboxId}
                  className={cn(
                    'block text-body font-medium text-text-primary cursor-pointer',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {label}
                  {required && (
                    <span className="text-error ml-1" aria-hidden="true">
                      *
                    </span>
                  )}
                </label>
              )}
              
              {description && (
                <p id={descriptionId} className="text-body-sm text-text-secondary mt-1">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        
        {error && (
          <p id={errorId} className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
export type { CheckboxProps };
